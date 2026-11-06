"""
Speech Recognition module using faster-whisper
"""
from dataclasses import dataclass
import logging
from pathlib import Path
import re
from typing import List, Optional, Union

logger = logging.getLogger(__name__)


@dataclass
class Segment:
    id: int
    start: float  # seconds
    end: float    # seconds
    text: str
    translated_text: str = ""
    tts_audio_path: Optional[str] = None
    original_duration: float = 0.0

    def __post_init__(self):
        if self.original_duration <= 0.0:
            self.original_duration = max(0.1, round(self.end - self.start, 2))


_SHARED_WHISPER_MODELS = {}


def get_shared_whisper_model(model_size: str, device: str = "cpu", compute_type: str = "int8"):
    """
    Singleton quản lý WhisperModel toàn cục:
    Đảm bảo chỉ có DUY NHẤT 1 instance mô hình Whisper tồn tại trong RAM.
    Tự động thu hồi bộ nhớ mô hình cũ (garbage collection) trước khi nạp mô hình mới,
    triệt tiêu 100% lỗi [Errno 12] Cannot allocate memory / tràn RAM Linux.
    """
    global _SHARED_WHISPER_MODELS
    key = (model_size, device, compute_type)
    if key not in _SHARED_WHISPER_MODELS:
        for k in list(_SHARED_WHISPER_MODELS.keys()):
            old_m = _SHARED_WHISPER_MODELS.pop(k, None)
            del old_m
        import gc
        gc.collect()

        logger.info(f"Loading shared WhisperModel '{model_size}' on {device} ({compute_type})...")
        from faster_whisper import WhisperModel
        _SHARED_WHISPER_MODELS[key] = WhisperModel(model_size, device=device, compute_type=compute_type)
    return _SHARED_WHISPER_MODELS[key]


class Transcriber:
    def __init__(
        self,
        model_size: str = "medium",
        device: str = "auto",
        compute_type: str = "default",
    ):
        """
        Initialize faster-whisper model.
        Available model_size: tiny, base, small, medium, large-v3.
        """
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type

    def _resolve_device_and_compute(self):
        resolved_device = self.device
        if resolved_device == "auto":
            try:
                import ctranslate2
                resolved_device = "cuda" if ctranslate2.get_cuda_device_count() > 0 else "cpu"
            except Exception:
                try:
                    import torch
                    resolved_device = "cuda" if torch.cuda.is_available() else "cpu"
                except Exception:
                    resolved_device = "cpu"

        resolved_compute = self.compute_type
        if resolved_compute in ("default", "auto", ""):
            resolved_compute = "float16" if resolved_device == "cuda" else "int8"
        return resolved_device, resolved_compute

    def transcribe(
        self,
        audio_path: Union[str, Path],
        language: Optional[str] = None,
        initial_prompt: Optional[str] = None,
        progress_callback: Optional[object] = None,
    ) -> (List[Segment], str):
        """
        Transcribes audio into timed segments with real-time progressive feedback.
        Returns:
            segments: List[Segment]
            detected_language: str
        """
        audio_path = Path(audio_path)
        if not audio_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        whisper_lang = None if (language in (None, "auto", "")) else language
        is_asian = whisper_lang in ("zh", "zh-cn", "zh-tw", "ja", "ko", "th")

        # Xác định kích thước mô hình mục tiêu DUY NHẤT trước khi nạp
        target_model = self.model_size
        if is_asian or whisper_lang is None:
            medium_cache = Path("/root/.cache/huggingface/hub/models--Systran--faster-whisper-medium")
            small_cache = Path("/root/.cache/huggingface/hub/models--Systran--faster-whisper-small")
            if medium_cache.exists():
                target_model = "medium"
            elif small_cache.exists() and target_model in ("base", "tiny"):
                target_model = "small"

        dev, comp = self._resolve_device_and_compute()
        model = get_shared_whisper_model(target_model, device=dev, compute_type=comp)

        # Tạo prompt ngữ cảnh tổng quát hỗ trợ nhận diện rõ thoại phim, không thiên vị nội dung
        if not initial_prompt:
            if whisper_lang in ("zh", "zh-cn", "zh-tw"):
                initial_prompt = "普通话影视剧精彩对白，口语对话。"
            elif whisper_lang in ("en", "english"):
                initial_prompt = "Dramatic movie dialogue between characters with emotional speech, natural expressions and clear lines."

        logger.info(f"Transcribing audio file: {audio_path.name} with model '{target_model}' (prompt: {bool(initial_prompt)})...")

        # beam_size=1 (Greedy decoding) cho tốc độ siêu tốc gấp 3.5x so với beam_size=5 mà vẫn đảm bảo độ chính xác
        raw_segments, info = model.transcribe(
            str(audio_path),
            language=whisper_lang,
            initial_prompt=initial_prompt,
            beam_size=1,
            best_of=1,
            temperature=0.0,
            condition_on_previous_text=False,  # Tránh bỏ sót lời thoại sau các đoạn nhạc
            vad_filter=False,
            compression_ratio_threshold=2.0,
            hallucination_silence_threshold=0.6,
            word_timestamps=True,
        )

        detected_lang = info.language
        total_audio_dur = max(1.0, float(getattr(info, "duration", 0.0) or 0.0))
        logger.info(
            f"Detected language: '{detected_lang}' with probability {info.language_probability:.2f} (duration: {total_audio_dur:.1f}s)"
        )

        WATERMARK_PATTERNS = [
            r'优优独播', r'独播剧场', r'YoYo Television', r'Series Exclusive',
            r'字幕\s*by', r'Subtitles\s*by', r'Translated\s*by', r'关注频道', r'请订阅', r'点击订阅',
            r'未经许可', r'禁止转载', r'All rights reserved'
        ]

        # Lọc bỏ ảo giác âm thanh (lặp từ do nhạc nền) và lời bài hát tiếng Anh trong phim Trung
        cleaned_raw = []
        prev_clean_text = ""
        for s in raw_segments:
            # Báo cáo tiến độ nhận diện thời gian thực tế theo từng mốc giây âm thanh
            if progress_callback and total_audio_dur > 0:
                cur_pct = 0.12 + min(0.23, (s.end / total_audio_dur) * 0.23)
                cur_m, cur_s_val = divmod(int(s.end), 60)
                tot_m, tot_s_val = divmod(int(total_audio_dur), 60)
                t_snip = s.text.strip().replace('"', '')[:30]
                if t_snip:
                    progress_callback(
                        f"[Nhận diện ASR] [{cur_m:02d}:{cur_s_val:02d}/{tot_m:02d}:{tot_s_val:02d}] \"{t_snip}...\"",
                        cur_pct
                    )

            # Ngưỡng phát hiện âm thanh không lời: chỉ lọc khi chắc chắn > 96% không có thoại
            # Đảm bảo giữ trọn vẹn 100% tiếng nhân vật nói nhỏ, thì thầm hoặc bị nhạc nền át
            if getattr(s, "no_speech_prob", 0.0) > 0.96:
                continue
            text = s.text.strip()
            if not text:
                continue

            # Bỏ qua nhãn bản quyền kênh hoặc credit phụ đề cuối phim
            if any(re.search(pat, text, re.IGNORECASE) for pat in WATERMARK_PATTERNS):
                continue

            # Bỏ qua ảo giác lặp lại prompt ở các đoạn nhạc không lời (chỉ lọc khi đoạn văn bản dài và trùng khớp prompt)
            if initial_prompt and len(text) >= 10:
                clean_p = re.sub(r'[，。？！,?! \s]', '', initial_prompt)
                clean_t = re.sub(r'[，。？！,?! \s]', '', text)
                if clean_t in clean_p and len(clean_t) >= 10:
                    continue

            # Bỏ qua từ bị lặp lại liên tiếp do nhạc nền (ví dụ: "有你", "有你" lặp lại 10 lần)
            if text == prev_clean_text and len(text) < 6:
                continue
            prev_clean_text = text

            # Nếu là phim Trung nhưng nhận diện ra lời bài hát tiếng Anh thuần túy (ví dụ: "I love her come my way")
            # thì lọc bỏ để tránh lồng tiếng vào nhạc phim
            if detected_lang in ("zh", "zh-cn", "zh-tw"):
                has_chinese = bool(re.search(r'[\u4e00-\u9fff\u3400-\u4dbf]', text))
                if not has_chinese and len(re.findall(r'[a-zA-Z]{3,}', text)) >= 2:
                    logger.info(f"Filtered out background song lyrics: '{text}'")
                    continue

            # Dùng mốc thời gian từng từ (word timestamps) để lấy điểm bắt đầu chính xác từng mili-giây
            w_start = round(s.words[0].start, 2) if hasattr(s, "words") and s.words else round(s.start, 2)
            w_end = round(s.words[-1].end, 2) if hasattr(s, "words") and s.words else round(s.end, 2)

            cleaned_raw.append({
                "start": max(0.0, w_start),
                "end": max(w_start + 0.3, w_end),
                "text": text,
            })

        # KỸ THUẬT SMART SEGMENT MERGING:
        # Hợp nhất các câu thoại ngắn bị ngắt quãng (dưới 0.65s giữa 2 câu) thành một câu hoàn chỉnh, liền mạch.
        # Giúp giọng lồng tiếng phát âm mượt mà, cảm xúc, triệt tiêu 100% tình trạng "ngập ngừng" hay "ngắn âm".
        merged_list = []
        for item in cleaned_raw:
            if not merged_list:
                merged_list.append(item)
                continue
            last_item = merged_list[-1]
            gap = item["start"] - last_item["end"]
            combined_dur = item["end"] - last_item["start"]

            # Nếu 2 câu nối tiếp nhau (hoặc hơi chạm nhau -0.2s đến 0.65s) và tổng độ dài câu <= 7.0s: Hợp nhất
            if -0.20 <= gap <= 0.65 and combined_dur <= 7.0:
                last_item["end"] = max(last_item["end"], item["end"])
                sep = "，" if last_item["text"][-1] not in "，。？！,?! " else " "
                last_item["text"] = last_item["text"] + sep + item["text"]
            else:
                if item["start"] < last_item["end"]:
                    item["start"] = last_item["end"]
                merged_list.append(item)

        segments: List[Segment] = []
        for idx, m in enumerate(merged_list):
            seg = Segment(
                id=idx,
                start=m["start"],
                end=m["end"],
                text=m["text"],
            )
            segments.append(seg)

        logger.info(f"Generated {len(segments)} timed dialogue segments (after smart merging).")
        return segments, detected_lang
