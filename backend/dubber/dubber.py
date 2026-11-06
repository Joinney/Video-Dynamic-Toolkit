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
import json
import argparse
import asyncio
import subprocess
from pathlib import Path
import tempfile

# Add dubber dir and project root to sys.path to access config and pipeline
dubber_dir = Path(__file__).resolve().parent
root_dir = dubber_dir.parent.parent
if str(dubber_dir) not in sys.path:
    sys.path.insert(0, str(dubber_dir))
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

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

def run_dubbing(input_video, output_video, voice="vi-VN-HoaiMyNeural", speed="+0%", orig_volume=0.15, whisper_model_size="small", burn_subtitles=True, source_lang="auto", target_lang="vi",
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

    # 1. Thử chạy bằng VideoDubberPipeline từ StudioVDT
    try:
        from config import DubbingConfig
        try:
            from pipeline import VideoDubberPipeline
        except ImportError:
            from .pipeline import VideoDubberPipeline

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
            model = WhisperModel(whisper_model_size, device=device, compute_type=compute_type)
            transcribe_kwargs = {"beam_size": 5}
            w_lang = whisper_lang_code(source_lang)
            if w_lang:
                transcribe_kwargs["language"] = w_lang
            segments, info = model.transcribe(str(extracted_audio), **transcribe_kwargs)
            
            raw_segments = []
            for seg in segments:
                text = seg.text.strip()
                if text:
                    raw_segments.append({"start": seg.start, "end": seg.end, "text": text})
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

        async def generate_speech_edge(text, voice_code, clip_path, spd="+0%"):
            # Clean voice code if prefixed with vieneu
            actual_voice = voice_code.replace("vieneu:", "") if "vieneu:" in voice_code else voice_code
            if not actual_voice.endswith("Neural"):
                actual_voice = "vi-VN-HoaiMyNeural"
            communicate = edge_tts.Communicate(text, actual_voice, rate=spd)
            await communicate.save(clip_path)

        async def build_all_tts():
            tasks = []
            for idx, seg in enumerate(translated_segments):
                out_clip = tts_dir / f"clip_{idx:04d}.mp3"
                seg["tts_file"] = str(out_clip)
                tasks.append(generate_speech_edge(seg["vi_text"], voice, str(out_clip), speed))
            await asyncio.gather(*tasks)

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

        for seg in translated_segments:
            clip_file = Path(seg["tts_file"])
            if clip_file.exists() and clip_file.stat().st_size > 0:
                try:
                    clip_audio = AudioSegment.from_file(str(clip_file))
                    start_ms = int(seg["start"] * 1000)
                    dub_track = dub_track.overlay(clip_audio, position=start_ms)
                except Exception:
                    pass

        dub_audio_wav = tmp_dir / "dub_voice_track.wav"
        dub_track.export(str(dub_audio_wav), format="wav")

        # Trộn nhạc nền & xuất video chuẩn H.264
        emit_progress("merging", 95, "Đang hòa âm & hoàn thiện video chuẩn H.264...")
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
    parser.add_argument("--speed", default="+0%", help="Tốc độ đọc (+0%, +10%, +20%)".replace("%", "%%"))
    parser.add_argument("--orig-vol", type=float, default=0.15, help="Âm lượng video gốc (0.1 đến 0.3)")
    parser.add_argument("--whisper-model", default="base", help="Model Whisper (tiny, base, small, medium)")
    parser.add_argument("--burn-subtitles", action="store_true", default=True, help="Chèn phụ đề cứng vào video")
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
    parser.add_argument("--enable-outro", action="store_true", default=True, help="Ghép video Outro")
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
