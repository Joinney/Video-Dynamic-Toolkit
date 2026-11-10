#!/usr/bin/env python3
"""
AI Video Dubbing Engine for Soda Reels & MinuteDrama
Tích hợp toàn diện từ StudioVDT (Nhánh feature/video-dubbing)
Bao gồm:
- Faster-Whisper ASR Singleton
- Dịch thuật kịch bản phim (Trung -> Việt, Anh -> Việt)
- Sinh giọng AI (Edge-TTS, VieNeu-TTS, Adam Tốp Tốp, Hoài My, Nam Minh)
- Đồng bộ khẩu hình (Smooth atempo time-stretching)
- Hòa âm nền (Studio Audio Ducking)
- Chèn phụ đề cứng (.srt Burn-in)
"""

import sys
import os
import io
import json
import argparse
import asyncio
import subprocess
from pathlib import Path
import tempfile

# Đảm bảo UTF-8 toàn diện trên Windows console để tránh UnicodeEncodeError
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        try:
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
            sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
        except Exception:
            pass

# Add dubber dir and project root to sys.path to access config and pipeline
dubber_dir = Path(__file__).resolve().parent
root_dir = dubber_dir.parent.parent
if str(dubber_dir) not in sys.path:
    sys.path.insert(0, str(dubber_dir))

# Monkey-patch av.open for PyAV compatibility (remove metadata_errors)
try:
    import av
    _orig_av_open = av.open
    def _safe_av_open(*args, **kwargs):
        kwargs.pop("metadata_errors", None)
        return _orig_av_open(*args, **kwargs)
    av.open = _safe_av_open
except Exception:
    pass
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

# Tự động nạp ffmpeg từ node_modules/ffmpeg-static cho pydub và subprocess
ffmpeg_candidates = [
    root_dir / "node_modules" / "ffmpeg-static" / "ffmpeg.exe",
    Path("ffmpeg.exe"),
    Path("ffmpeg")
]
for f_cand in ffmpeg_candidates:
    if f_cand.exists():
        ffmpeg_bin_dir = str(f_cand.parent.resolve())
        if ffmpeg_bin_dir not in os.environ.get("PATH", ""):
            os.environ["PATH"] = ffmpeg_bin_dir + os.pathsep + os.environ.get("PATH", "")
        try:
            from pydub import AudioSegment
            AudioSegment.converter = str(f_cand.resolve())
            AudioSegment.ffmpeg = str(f_cand.resolve())
        except Exception:
            pass
        break

# Tự động nạp ffprobe từ node_modules/ffprobe-static cho pydub
ffprobe_candidates = [
    root_dir / "node_modules" / "ffprobe-static" / "bin" / "win32" / "x64" / "ffprobe.exe",
    Path("ffprobe.exe"),
    Path("ffprobe")
]
for p_cand in ffprobe_candidates:
    if p_cand.exists():
        ffprobe_bin_dir = str(p_cand.parent.resolve())
        if ffprobe_bin_dir not in os.environ.get("PATH", ""):
            os.environ["PATH"] = ffprobe_bin_dir + os.pathsep + os.environ.get("PATH", "")
        try:
            from pydub import AudioSegment
            AudioSegment.ffprobe = str(p_cand.resolve())
        except Exception:
            pass
        break

def whisper_lang_code(lang):
    if not lang or lang == "auto":
        return None
    l = str(lang).lower().strip()
    if l.startswith("zh") or l in ("cn", "chinese", "chi", "tiếng trung", "tieng trung"):
        return "zh"
    if l.startswith("vi") or l in ("vie", "vietnamese", "tiếng việt", "tieng viet"):
        return "vi"
    if l.startswith("en") or l in ("eng", "english", "tiếng anh", "tieng anh"):
        return "en"
    if l.startswith("ja") or l in ("jpn", "japanese"):
        return "ja"
    if l.startswith("ko") or l in ("kor", "korean"):
        return "ko"
    return l

def translator_lang_code(lang):
    if not lang or lang == "auto":
        return "auto"
    l = str(lang).lower().strip()
    if l in ("zh", "zh-cn", "cn", "chinese", "chi", "tiếng trung", "tieng trung"):
        return "zh-CN"
    if l in ("zh-tw", "taiwan"):
        return "zh-TW"
    if l in ("en", "eng", "english", "tiếng anh", "tieng anh"):
        return "en"
    if l in ("vi", "vie", "vietnamese", "tiếng việt", "tieng viet"):
        return "vi"
    if l in ("ja", "jpn", "japanese"):
        return "ja"
    if l in ("ko", "kor", "korean"):
        return "ko"
    return l

def emit_progress(status, pct, message, extra=None):
    payload = {
        "status": status,
        "pct": int(pct),
        "message": message
    }
    if extra:
        payload.update(extra)
    print(f"__PROGRESS__{json.dumps(payload, ensure_ascii=False)}__PROGRESS__", flush=True)

def run_dubbing(input_video, output_video, voice="vi-VN-HoaiMyNeural", speed="+15%", orig_volume=0.15, whisper_model_size="small", burn_subtitles=False, source_lang="auto", target_lang="vi",
                enable_logo=False, logo_path=None, logo_x=0.80, logo_y=0.05, logo_scale=0.18, logo_opacity=0.90, logo_rotation=0.0,
                subtitle_style="white_outline", subtitle_font_size=32, subtitle_bottom_pct=7.0,
                enable_float_wm=False, float_wm_text="@gocphimcuon", float_wm_opacity=0.30,
                enable_outro=True, outro_path=None, subtitles_json=None):
    input_path = Path(input_video).resolve()
    if not input_path.exists():
        emit_progress("error", 0, f"File video đầu vào không tồn tại: {input_video}")
        return False

    out_path = Path(output_video).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    def resolve_asset_file(p, default_name):
        candidates = []
        if p:
            candidates.append(Path(p))
            candidates.append(Path("assets") / Path(p).name)
            candidates.append(Path("frontend/assets") / Path(p).name)
            candidates.append(Path("/app/assets") / Path(p).name)
            candidates.append(Path("/app/frontend/assets") / Path(p).name)
        if default_name:
            candidates.append(Path("assets") / default_name)
            candidates.append(Path("frontend/assets") / default_name)
            candidates.append(Path("/app/assets") / default_name)
            candidates.append(Path("/app/frontend/assets") / default_name)
            candidates.append(Path(__file__).resolve().parent.parent.parent / "assets" / default_name)
            candidates.append(Path(__file__).resolve().parent.parent.parent / "frontend" / "assets" / default_name)
        for c in candidates:
            if c and c.exists():
                return c.resolve()
        return Path(p) if p else None

    if enable_logo:
        logo_path = resolve_asset_file(logo_path, "gocphimcuon1.png")
    if enable_outro:
        outro_path = resolve_asset_file(outro_path, "endgpc.mp4")

    # 1. Thử chạy bằng VideoDubberPipeline từ StudioVDT
    try:
        try:
            from pipeline import VideoDubberPipeline
            from config import DubbingConfig
        except ImportError:
            from dubber.pipeline import VideoDubberPipeline
            from dubber.config import DubbingConfig

        emit_progress("starting", 5, "Đang khởi tạo StudioVDT VideoDubberPipeline...")

        config = DubbingConfig(
            whisper_model=whisper_model_size,
            device="auto",
            source_language=source_lang,
            target_language=target_lang,
            tts_voice=voice,
            tts_rate=speed,
            original_audio_volume=orig_volume,
            burn_subtitles=burn_subtitles,
            subtitle_font_size=subtitle_font_size,
            subtitle_style=subtitle_style,
            subtitle_margin_v=int(subtitle_bottom_pct),
            enable_logo=enable_logo,
            logo_path=logo_path,
            logo_x_pct=logo_x,
            logo_y_pct=logo_y,
            logo_scale=logo_scale,
            logo_opacity=logo_opacity,
            logo_rotation=logo_rotation,
            enable_floating_watermark=enable_float_wm,
            floating_watermark_text=float_wm_text,
            floating_watermark_opacity=float_wm_opacity,
            enable_outro=enable_outro,
            outro_video_path=outro_path,
            temp_dir=out_path.parent / ".temp_dub",
            output_dir=out_path.parent
        )

        pipeline = VideoDubberPipeline(config)

        preloaded_segments = None
        if subtitles_json and Path(subtitles_json).exists():
            try:
                with open(subtitles_json, "r", encoding="utf-8") as f_sub:
                    sub_data = json.load(f_sub)
                    preloaded_segments = sub_data.get("segments", sub_data) if isinstance(sub_data, dict) else sub_data
            except Exception as e:
                print(f"Warning: Lỗi nạp subtitles_json: {e}", file=sys.stderr)

        def progress_callback(msg, progress_fraction):
            pct = int(progress_fraction * 100)
            emit_progress("running", pct, msg)

        emit_progress("running", 15, "StudioVDT đang bóc tách âm thanh & xử lý video...")
        result_path = pipeline.process(
            video_path=input_path,
            output_path=out_path,
            progress_callback=progress_callback,
            preloaded_segments=preloaded_segments
        )

        emit_progress("completed", 100, "Lồng tiếng hoàn tất thành công bằng StudioVDT!", extra={
            "outputPath": str(result_path),
            "filename": Path(result_path).name
        })
        return True

    except Exception as pipeline_err:
        emit_progress("warning", 20, f"StudioVDT Pipeline: {str(pipeline_err)}. Đang chuyển sang chế độ lồng tiếng trực tiếp...")

    # 2. Fallback trực tiếp bằng Faster-Whisper + Edge-TTS + Pydub + FFmpeg
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_dir = Path(tmpdir)
        extracted_audio = tmp_dir / "extracted_audio.wav"

        # Tách âm thanh
        emit_progress("extracting", 25, "Đang trích xuất âm thanh từ video...")
        cmd_extract = [
            "ffmpeg", "-y", "-i", str(input_path),
            "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
            str(extracted_audio)
        ]
        ret = subprocess.run(cmd_extract, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if ret.returncode != 0:
            emit_progress("error", 0, "Lỗi khi trích xuất âm thanh từ video bằng ffmpeg!")
            return False

        # Nhận diện giọng nói
        emit_progress("transcribing", 40, f"Đang nhận diện giọng nói bằng AI Whisper ({whisper_model_size})...")
        try:
            from faster_whisper import WhisperModel
            device = "cuda" if os.environ.get("USE_CUDA") == "1" else "cpu"
            compute_type = "float16" if device == "cuda" else "int8"
            try:
                model = WhisperModel(whisper_model_size, device=device, compute_type=compute_type)
            except Exception:
                device = "cpu"
                compute_type = "int8"
                model = WhisperModel(whisper_model_size, device=device, compute_type=compute_type)

            transcribe_kwargs = {"beam_size": 5, "word_timestamps": True}
            w_lang = whisper_lang_code(source_lang)
            if w_lang:
                transcribe_kwargs["language"] = w_lang

            try:
                segments, info = model.transcribe(str(extracted_audio), **transcribe_kwargs)
            except Exception:
                model = WhisperModel(whisper_model_size, device="cpu", compute_type="int8")
                segments, info = model.transcribe(str(extracted_audio), **transcribe_kwargs)
            
            total_dur = max(1.0, float(getattr(info, "duration", 0.0) or 0.0))
            raw_segments = []
            for seg in segments:
                text = seg.text.strip()
                if text:
                    w_start = round(seg.words[0].start, 2) if hasattr(seg, "words") and seg.words else round(seg.start, 2)
                    w_end = round(seg.words[-1].end, 2) if hasattr(seg, "words") and seg.words else round(seg.end, 2)
                    raw_segments.append({"start": w_start, "end": max(w_start + 0.3, w_end), "text": text})
                    cur_pct = 40 + min(9, int((seg.end / total_dur) * 10))
                    cur_m, cur_s = divmod(int(seg.end), 60)
                    tot_m, tot_s = divmod(int(total_dur), 60)
                    emit_progress("transcribing", cur_pct, f"[{cur_m:02d}:{cur_s:02d}/{tot_m:02d}:{tot_s:02d}] Đã nhận diện: \"{text[:28]}...\"")
        except Exception as e:
            emit_progress("error", 0, f"Lỗi khi nhận diện giọng nói: {str(e)}")
            return False

        if not raw_segments:
            emit_progress("error", 0, "Không nhận diện được giọng nói trong video này!")
            return False

        # Dịch thuật
        emit_progress("translating", 55, f"Đang dịch {len(raw_segments)} câu sang tiếng Việt...")
        src_for_trans = translator_lang_code(source_lang)
        tgt_for_trans = translator_lang_code(target_lang)
        if tgt_for_trans == "auto":
            tgt_for_trans = "vi"

        custom_translator = None
        try:
            try:
                from translator import Translator
            except ImportError:
                from .translator import Translator
            custom_translator = Translator(target_lang=tgt_for_trans, source_lang=src_for_trans)
        except Exception:
            pass

        deep_trans = None
        try:
            from deep_translator import GoogleTranslator
            try:
                deep_trans = GoogleTranslator(source=src_for_trans, target=tgt_for_trans)
            except Exception:
                deep_trans = GoogleTranslator(source="auto", target="vi")
        except Exception:
            pass

        translated_segments = []
        for idx, seg in enumerate(raw_segments):
            text = seg["text"]
            vi_text = ""
            if custom_translator:
                try:
                    vi_text = custom_translator.translate_single(text)
                except Exception:
                    pass
            if not vi_text and deep_trans:
                try:
                    vi_text = deep_trans.translate(text)
                except Exception:
                    pass
            if not vi_text:
                vi_text = text

            translated_segments.append({
                "start": seg["start"],
                "end": seg["end"],
                "orig_text": seg["text"],
                "vi_text": vi_text
            })

        # Tạo TTS Audio
        emit_progress("generating_tts", 75, f"Đang tạo giọng đọc AI tiếng Việt ({voice})...")
        import edge_tts
        tts_dir = tmp_dir / "tts_clips"
        tts_dir.mkdir(parents=True, exist_ok=True)

        sem = asyncio.Semaphore(4)

        async def generate_speech_edge(text, voice_code, clip_path, spd="+0%"):
            clean_t = text.strip() if text else ""
            if not clean_t or len(clean_t.replace(".", "").replace("-", "").strip()) == 0:
                return False
            actual_voice = voice_code.replace("vieneu:", "") if "vieneu:" in voice_code else voice_code
            if not actual_voice.endswith("Neural"):
                actual_voice = "vi-VN-HoaiMyNeural"
            async with sem:
                for attempt in range(4):
                    try:
                        communicate = edge_tts.Communicate(clean_t, actual_voice, rate=spd if attempt < 2 else "+0%")
                        await communicate.save(clip_path)
                        if Path(clip_path).exists() and Path(clip_path).stat().st_size > 100:
                            return True
                    except Exception:
                        await asyncio.sleep(0.4 * (attempt + 1))
            return False

        async def build_all_tts():
            tasks = []
            for idx, seg in enumerate(translated_segments):
                out_clip = tts_dir / f"clip_{idx:04d}.mp3"
                seg["tts_file"] = str(out_clip)
                tasks.append(generate_speech_edge(seg["vi_text"], voice, str(out_clip), speed))
            await asyncio.gather(*tasks, return_exceptions=True)

        try:
            asyncio.run(build_all_tts())
        except Exception as tts_err:
            emit_progress("error", 0, f"Lỗi tạo giọng đọc AI: {str(tts_err)}")
            return False

        # Ghép timeline
        emit_progress("mixing", 88, "Đang ghép âm thanh lồng tiếng theo đúng mốc thời gian...")
        from pydub import AudioSegment
        orig_audio_seg = AudioSegment.from_wav(str(extracted_audio))
        total_duration_ms = len(orig_audio_seg)
        dub_track = AudioSegment.silent(duration=total_duration_ms)

        try:
            try:
                from synchronizer import trim_leading_silence, change_audio_speed
            except ImportError:
                from .synchronizer import trim_leading_silence, change_audio_speed
        except Exception:
            trim_leading_silence = None
            change_audio_speed = None

        for idx, seg in enumerate(translated_segments):
            clip_file = Path(seg["tts_file"])
            if clip_file.exists() and clip_file.stat().st_size > 0:
                try:
                    clip_audio = AudioSegment.from_file(str(clip_file))
                    if trim_leading_silence:
                        clip_audio = trim_leading_silence(clip_audio)

                    next_s = translated_segments[idx + 1]["start"] if idx + 1 < len(translated_segments) else (total_duration_ms / 1000.0)
                    clip_len_s = len(clip_audio) / 1000.0
                    orig_dur = max(0.5, seg.get("end", seg["start"] + 1.0) - seg["start"])
                    max_win = max(0.5, next_s - seg["start"] - 0.05)
                    target_win = min(max_win, orig_dur)

                    if change_audio_speed and clip_len_s > target_win:
                        needed_spd = min(clip_len_s / target_win, 2.0)
                        clip_audio = change_audio_speed(clip_audio, speed=needed_spd)

                    start_ms = int(seg["start"] * 1000)
                    dub_track = dub_track.overlay(clip_audio, position=start_ms)
                except Exception:
                    pass

        dub_audio_wav = tmp_dir / "dub_voice_track.wav"
        dub_track.export(str(dub_audio_wav), format="wav")

        # Trộn nhạc nền & xuất video chuẩn H.264
        emit_progress("merging", 95, "Đang hòa âm & hoàn thiện video chuẩn H.264...")
        use_fallback_ffmpeg = True
        try:
            try:
                from merger import VideoMerger
            except ImportError:
                from .merger import VideoMerger
            merger = VideoMerger()
            merger.merge_video(
                video_path=input_path,
                audio_path=dub_audio_wav,
                output_video_path=out_path,
                logo_path=logo_path if enable_logo else None,
                logo_x_pct=logo_x,
                logo_y_pct=logo_y,
                logo_scale=logo_scale,
                logo_opacity=logo_opacity,
                logo_rotation=logo_rotation,
                floating_watermark_text=float_wm_text if enable_float_wm else None,
                floating_watermark_opacity=float_wm_opacity,
                outro_video_path=outro_path if enable_outro else None,
                total_duration=total_duration_ms / 1000.0
            )
            use_fallback_ffmpeg = False
        except Exception:
            use_fallback_ffmpeg = True

        if use_fallback_ffmpeg:
            cmd_merge = [
                "ffmpeg", "-y",
                "-i", str(input_path),
                "-i", str(dub_audio_wav),
                "-filter_complex",
                f"[0:a]volume={orig_volume}[orig_bg];[1:a]volume=1.25[dub_fg];[orig_bg][dub_fg]amix=inputs=2:duration=first:dropout_transition=2[aout]",
                "-map", "0:v",
                "-map", "[aout]",
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "21",
                "-c:a", "aac",
                "-b:a", "192k",
                str(out_path)
            ]

            ret_merge = subprocess.run(cmd_merge, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if ret_merge.returncode != 0:
                emit_progress("error", 0, "Lỗi khi ghép âm thanh và video bằng ffmpeg!")
                return False

        emit_progress("completed", 100, "Lồng tiếng hoàn tất! Đã lưu video thành công.", extra={
            "outputPath": str(out_path),
            "filename": out_path.name
        })
        return True

def main():
    parser = argparse.ArgumentParser(description="AI Video Dubber Engine from StudioVDT")
    parser.add_argument("--input", required=True, help="Đường dẫn file video đầu vào (.mp4)")
    parser.add_argument("--output", required=True, help="Đường dẫn file video xuất ra (.mp4)")
    parser.add_argument("--voice", default="vi-VN-HoaiMyNeural", help="Giọng đọc AI (Hoài My, Nam Minh, Jenny...)")
    parser.add_argument("--speed", default="+15%", help="Tốc độ đọc (+0%, +15%, +25%)".replace("%", "%%"))
    parser.add_argument("--orig-vol", type=float, default=0.15, help="Âm lượng video gốc (0.1 đến 0.3)")
    parser.add_argument("--whisper-model", default="base", help="Model Whisper (tiny, base, small, medium)")
    parser.add_argument("--burn-subtitles", dest="burn_subtitles", action="store_true", default=False, help="Chèn phụ đề cứng vào video")
    parser.add_argument("--no-burn-subtitles", dest="burn_subtitles", action="store_false", help="Không chèn phụ đề cứng vào video")
    parser.add_argument("--source-lang", default="auto", help="Ngôn ngữ gốc (auto, zh, en)")
    parser.add_argument("--target-lang", default="vi", help="Ngôn ngữ dịch (vi)")
    parser.add_argument("--enable-logo", action="store_true", default=False, help="Chèn logo vào video")
    parser.add_argument("--logo-path", default=None, help="Đường dẫn file logo")
    parser.add_argument("--logo-x", type=float, default=0.80, help="Tọa độ X logo (tỷ lệ 0-1)")
    parser.add_argument("--logo-y", type=float, default=0.05, help="Tọa độ Y logo (tỷ lệ 0-1)")
    parser.add_argument("--logo-scale", type=float, default=0.18, help="Tỷ lệ kích thước logo (tỷ lệ 0-1)")
    parser.add_argument("--logo-opacity", type=float, default=0.90, help="Độ mờ logo (tỷ lệ 0-1)")
    parser.add_argument("--logo-rotation", type=float, default=0.0, help="Góc xoay logo (độ)")
    parser.add_argument("--sub-style", default="white_outline", help="Kiểu phụ đề (glassmorphism, yellow_outline, black_box, white_outline)")
    parser.add_argument("--sub-font-size", type=int, default=32, help="Cỡ chữ phụ đề")
    parser.add_argument("--sub-bottom-pct", type=float, default=7.0, help="Khoảng cách đáy Y phụ đề (phần trăm)")
    parser.add_argument("--enable-float-wm", action="store_true", default=False, help="Chữ mờ bảo vệ bản quyền")
    parser.add_argument("--float-wm-text", default="@gocphimcuon", help="Nội dung chữ mờ")
    parser.add_argument("--float-wm-opacity", type=float, default=0.30, help="Độ mờ chữ mờ")
    parser.add_argument("--enable-outro", dest="enable_outro", action="store_true", default=True, help="Ghép video Outro")
    parser.add_argument("--no-outro", dest="enable_outro", action="store_false", help="Không ghép video Outro")
    parser.add_argument("--subtitles-json", default=None, help="Đường dẫn file JSON phụ đề đã sửa")
    parser.add_argument("--outro-path", default=None, help="Đường dẫn file Outro")

    args = parser.parse_args()
    success = run_dubbing(
        args.input,
        args.output,
        voice=args.voice,
        speed=args.speed,
        orig_volume=args.orig_vol,
        whisper_model_size=args.whisper_model,
        burn_subtitles=args.burn_subtitles,
        source_lang=args.source_lang,
        target_lang=args.target_lang,
        enable_logo=args.enable_logo,
        logo_path=args.logo_path,
        logo_x=args.logo_x,
        logo_y=args.logo_y,
        logo_scale=args.logo_scale,
        logo_opacity=args.logo_opacity,
        logo_rotation=args.logo_rotation,
        subtitle_style=args.sub_style,
        subtitle_font_size=args.sub_font_size,
        subtitle_bottom_pct=args.sub_bottom_pct,
        enable_float_wm=args.enable_float_wm,
        float_wm_text=args.float_wm_text,
        float_wm_opacity=args.float_wm_opacity,
        enable_outro=args.enable_outro,
        outro_path=args.outro_path,
        subtitles_json=args.subtitles_json
    )
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
