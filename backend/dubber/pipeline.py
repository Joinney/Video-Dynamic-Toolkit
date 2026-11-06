"""
Complete End-to-End Video Dubbing Pipeline
"""
import json
import logging
from pathlib import Path
from typing import Callable, Optional, Union

try:
    from .config import DubbingConfig
except ImportError:
    from config import DubbingConfig
try:
    from .extractor import extract_audio
    from .transcriber import Transcriber, Segment
    from .translator import Translator
    from .tts import TTSService
    from .synchronizer import AudioSynchronizer
    from .merger import VideoMerger
except ImportError:
    from extractor import extract_audio
    from transcriber import Transcriber, Segment
    from translator import Translator
    from tts import TTSService
    from synchronizer import AudioSynchronizer
    from merger import VideoMerger

logger = logging.getLogger(__name__)


def format_srt_time(seconds: float) -> str:
    millis = int((seconds % 1) * 1000)
    secs = int(seconds)
    hours = secs // 3600
    minutes = (secs % 3600) // 60
    secs = secs % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def export_srt(segments: list, srt_path: Path, use_translated: bool = True):
    with open(srt_path, "w", encoding="utf-8") as f:
        for i, seg in enumerate(segments, 1):
            text = seg.translated_text if (use_translated and seg.translated_text) else seg.text
            start = format_srt_time(seg.start)
            end_val = getattr(seg, "sub_end", None) if getattr(seg, "sub_end", None) is not None else seg.end
            end = format_srt_time(end_val)
            f.write(f"{i}\n{start} --> {end}\n{text}\n\n")


class VideoDubberPipeline:
    def __init__(self, config: Optional[DubbingConfig] = None):
        self.config = config or DubbingConfig()
        self.transcriber = Transcriber(
            model_size=self.config.whisper_model,
            device=self.config.device,
            compute_type=self.config.compute_type,
        )
        self.translator = Translator(
            target_lang=self.config.target_language,
            source_lang=self.config.source_language,
        )
        self.tts = TTSService(
            voice=self.config.tts_voice,
            rate=self.config.tts_rate,
            volume=self.config.tts_volume,
        )
        self.synchronizer = AudioSynchronizer(
            max_speed_factor=self.config.max_speed_factor,
            min_speed_factor=self.config.min_speed_factor,
        )
        self.merger = VideoMerger(
            original_audio_volume=self.config.original_audio_volume
        )
        self.last_segments = []

    def extract_audio(
        self,
        video_path: Union[str, Path],
        output_audio_path: Optional[Union[str, Path]] = None,
    ) -> Path:
        """Helper to extract audio track from video into 16kHz mono WAV."""
        video_path = Path(video_path)
        if output_audio_path is None:
            output_audio_path = self.config.temp_dir / f"{video_path.stem}_audio.wav"
        else:
            output_audio_path = Path(output_audio_path)
        return extract_audio(video_path, output_audio_path)

    def process(
        self,
        video_path: Union[str, Path],
        output_path: Optional[Union[str, Path]] = None,
        progress_callback: Optional[Callable[[str, float], None]] = None,
        preloaded_segments: Optional[list] = None,
    ) -> Path:
        """
        Executes complete dubbing workflow from input video to output video.
        progress_callback(status_message, progress_fraction [0.0 - 1.0])
        """
        video_path = Path(video_path)
        if not video_path.exists():
            raise FileNotFoundError(f"Input video not found: {video_path}")

        def notify(msg: str, progress: float):
            logger.info(f"[{int(progress*100)}%] {msg}")
            if progress_callback:
                progress_callback(msg, progress)

        stem = video_path.stem
        work_dir = self.config.temp_dir / stem
        work_dir.mkdir(parents=True, exist_ok=True)

        if output_path is None:
            output_path = self.config.output_dir / f"{stem}_dubbed_{self.config.target_language}.mp4"
        else:
            output_path = Path(output_path)

        # Step 1: Extract Audio
        import gc
        gc.collect()
        notify("Trích xuất âm thanh từ video gốc...", 0.10)
        orig_audio_path = work_dir / "original_audio.wav"
        extract_audio(video_path, orig_audio_path)

        # Trích xuất độ dài video chuẩn xác mà không cần giải mã toàn bộ tệp WAV vào RAM
        total_duration = 0.0
        try:
            try:
                from .merger import find_ffprobe_binary
            except ImportError:
                from merger import find_ffprobe_binary
            probe_bin = find_ffprobe_binary()
            res = subprocess.run(
                [probe_bin, "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(orig_audio_path)],
                stdout=subprocess.PIPE, text=True, check=True, close_fds=True
            )
            total_duration = float(res.stdout.strip())
        except Exception:
            pass
        if total_duration <= 0.0:
            try:
                import soundfile as sf
                total_duration = sf.info(str(orig_audio_path)).duration
            except Exception:
                from pydub import AudioSegment
                _fa = AudioSegment.from_file(orig_audio_path)
                total_duration = len(_fa) / 1000.0
                del _fa
        gc.collect()

        if preloaded_segments and len(preloaded_segments) > 0:
            notify("Sử dụng danh sách phụ đề đã tinh chỉnh và xem trước...", 0.35)
            segments = []
            for _i, s_data in enumerate(preloaded_segments):
                if isinstance(s_data, dict):
                    t_text = str(s_data.get("text", "")).strip()
                    seg_obj = Segment(
                        id=int(s_data.get("id", _i + 1)),
                        start=float(s_data.get("start", 0.0)),
                        end=float(s_data.get("end", 0.0)),
                        text=str(s_data.get("original_text", t_text)).strip(),
                        translated_text=t_text,
                    )
                    segments.append(seg_obj)
            self.last_segments = segments
        else:
            # Step 2: Speech Recognition (Transcription)
            notify("Nhận diện giọng nói và tách mốc thời gian (Whisper ASR)...", 0.12)
            segments, detected_lang = self.transcriber.transcribe(
                orig_audio_path,
                language=None if self.config.source_language == "auto" else self.config.source_language,
                progress_callback=notify,
            )

            if not segments:
                raise ValueError("Không nhận diện được giọng nói nào trong video!")

            # Step 3: Translation
            notify(f"Dịch kịch bản sang ngôn ngữ đích ({self.config.target_language})...", 0.35)
            self.translator.source_lang = detected_lang
            segments = self.translator.translate_segments(segments, progress_callback=notify)
            self.last_segments = segments

        # Save metadata and subtitle
        srt_path = output_path.with_suffix(".srt")
        export_srt(segments, srt_path, use_translated=True)
        json_path = work_dir / "segments.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump([seg.__dict__ for seg in segments], f, ensure_ascii=False, indent=2)

        # Step 4: TTS Generation
        engine_label = "VieNeu Neural" if "vieneu" in self.config.tts_voice.lower() else "Edge-TTS"
        notify(f"Sinh giọng đọc AI lồng tiếng mới ({engine_label})...", 0.50)
        tts_dir = work_dir / "tts_segments"
        segments = self.tts.generate_speech(segments, tts_dir, progress_callback=notify)

        # Step 5: Audio Synchronization
        notify("Đồng bộ thời gian và khớp khẩu hình âm thanh...", 0.75)
        dubbed_voice_path = work_dir / "dubbed_assembled.wav"
        self.synchronizer.align_and_assemble(
            segments=segments,
            total_duration_seconds=total_duration,
            output_file=dubbed_voice_path,
            progress_callback=notify,
        )

        # Mốc phụ đề sub_end đã được đồng bộ chuẩn xác từng mili-giây từ AudioSynchronizer
        for seg in segments:
            if not hasattr(seg, "sub_end") or seg.sub_end is None:
                seg.sub_end = seg.end

        export_srt(segments, srt_path, use_translated=True)
        self.last_segments = segments
        try:
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump([seg.__dict__ for seg in segments], f, ensure_ascii=False, indent=2)
        except Exception:
            pass

        # Step 6: Audio Mixing & Video Merging
        notify("Hòa âm nhạc nền và triệt tiêu tạp âm gốc...", 0.85)
        mixed_audio_path = work_dir / "mixed_final.wav"
        self.merger.mix_audios(
            original_audio_path=orig_audio_path,
            dubbed_audio_path=dubbed_voice_path,
            output_mixed_audio_path=mixed_audio_path,
            segments=segments,
        )

        burn_subs = getattr(self.config, "burn_subtitles", True)
        enable_float_wm = getattr(self.config, "enable_floating_watermark", False)
        float_wm_text = getattr(self.config, "floating_watermark_text", "@gocphimcuon") if enable_float_wm else None
        enable_outro = getattr(self.config, "enable_outro", True)
        outro_path = getattr(self.config, "outro_video_path", None)
        if enable_outro and not outro_path:
            for cand in [Path("assets/endgpc.mp4"), Path("frontend/assets/endgpc.mp4"), Path("/app/assets/endgpc.mp4"), Path("/app/frontend/assets/endgpc.mp4")]:
                if cand.exists():
                    outro_path = cand
                    break

        enable_logo = getattr(self.config, "enable_logo", False)
        logo_path = getattr(self.config, "logo_path", None)
        if enable_logo and not logo_path:
            for cand in [Path("assets/gocphimcuon1.png"), Path("frontend/assets/gocphimcuon1.png"), Path("/app/assets/gocphimcuon1.png"), Path("/app/frontend/assets/gocphimcuon1.png")]:
                if cand.exists():
                    logo_path = cand
                    break

        notify("Bắt đầu mã hóa video thành phẩm chuẩn phòng thu...", 0.87)
        final_video = self.merger.merge_video(
            video_path=video_path,
            audio_path=mixed_audio_path,
            output_video_path=output_path,
            subtitle_path=srt_path if burn_subs and srt_path.exists() else None,
            subtitle_font_size=getattr(self.config, "subtitle_font_size", 32),
            subtitle_style=getattr(self.config, "subtitle_style", "white_outline"),
            subtitle_margin_v=getattr(self.config, "subtitle_margin_v", 7),
            logo_path=logo_path if enable_logo else None,
            logo_x_pct=getattr(self.config, "logo_x_pct", 0.80),
            logo_y_pct=getattr(self.config, "logo_y_pct", 0.05),
            logo_scale=getattr(self.config, "logo_scale", 0.18),
            logo_opacity=getattr(self.config, "logo_opacity", 0.90),
            logo_rotation=getattr(self.config, "logo_rotation", 0.0),
            floating_watermark_text=float_wm_text,
            floating_watermark_font_size=getattr(self.config, "floating_watermark_font_size", 18),
            floating_watermark_opacity=getattr(self.config, "floating_watermark_opacity", 0.30),
            outro_video_path=outro_path if enable_outro else None,
            progress_callback=notify,
            total_duration=total_duration,
        )

        # Dọn dẹp triệt để toàn bộ file tạm (.srt, .temp_dub, thư mục tạm), CHỈ LƯU DUY NHẤT FILE VIDEO LỒNG TIẾNG (.mp4)
        try:
            import shutil
            if srt_path and srt_path.exists():
                srt_path.unlink(missing_ok=True)
            if work_dir and work_dir.exists():
                shutil.rmtree(work_dir, ignore_errors=True)
            temp_root = self.config.temp_dir
            if temp_root and temp_root.exists() and not any(temp_root.iterdir()):
                temp_root.rmdir()
            # Dọn bất kỳ file pre_outro rác nào nếu còn sót
            for stray in output_path.parent.glob("pre_outro_*.mp4"):
                try:
                    stray.unlink(missing_ok=True)
                except Exception:
                    pass
        except Exception:
            pass

        notify("Hoàn thành lồng tiếng video!", 1.0)
        return final_video
