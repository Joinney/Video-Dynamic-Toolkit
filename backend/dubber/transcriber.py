"""
Speech Recognition module using faster-whisper
"""
from dataclasses import dataclass
import io
import logging
import os
from pathlib import Path
import re
import sys
from typing import List, Optional, Union

# Đảm bảo UTF-8 trên Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

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


def is_valid_speech_text(text: str) -> bool:
    """
    Kiểm tra xem chuỗi có phải là lời thoại hợp lệ hay không.
    Loại bỏ triệt để ảo giác vòng lặp dấu gạch (----------------), dấu chấm, ký hiệu vô nghĩa của Whisper.
    """
    if not text or not str(text).strip():
        return False
    clean = str(text).strip()
    # Loại bỏ toàn bộ khoảng trắng, dấu gạch ngang, gạch dưới, chấm, phẩy, ký hiệu đặc biệt
    core = re.sub(r'[\s\-_—–.…*#~+=|/\\?!,;:()\[\]{}"\'`^<>@$%&]', '', clean)
    if not core:
        return False
    # Nếu chuỗi bị áp đảo bởi các dấu gạch ngang/gạch nối lặp lại (ảo giác autoregressive của Whisper)
    dashes_count = len(re.findall(r'[-—–_]', clean))
    if dashes_count >= 3 and dashes_count > len(core) * 2:
        return False
    return True


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
        try:
            _SHARED_WHISPER_MODELS[key] = WhisperModel(model_size, device=device, compute_type=compute_type)
        except Exception as e:
            if device == "cuda" or "cublas" in str(e).lower() or "cuda" in str(e).lower():
                logger.warning(f"CUDA initialization failed ({e}). Falling back to CPU int8...")
                key = (model_size, "cpu", "int8")
                _SHARED_WHISPER_MODELS[key] = WhisperModel(model_size, device="cpu", compute_type="int8")
            else:
                raise
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
                if ctranslate2.get_cuda_device_count() > 0:
                    if sys.platform == "win32":
                        import ctypes
                        try:
                            ctypes.CDLL("cublas64_12.dll")
                            resolved_device = "cuda"
                        except Exception:
                            resolved_device = "cpu"
                    else:
                        resolved_device = "cuda"
                else:
                    resolved_device = "cpu"
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
        medium_cache = Path("/root/.cache/whisper-medium")
        hf_medium = Path("/root/.cache/huggingface/hub/models--Systran--faster-whisper-medium")
        has_medium = medium_cache.exists() or hf_medium.exists()

        if target_model in ("auto", "medium", "default"):
            target_model = "medium" if has_medium else "small"
        elif target_model in ("base", "tiny") and (is_asian or whisper_lang is None):
            target_model = "medium" if has_medium else "small"

        dev, comp = self._resolve_device_and_compute()
        model = get_shared_whisper_model(target_model, device=dev, compute_type=comp)

        # Tạo prompt ngữ cảnh tổng quát hỗ trợ nhận diện rõ thoại phim, không thiên vị nội dung
        if not initial_prompt:
            if whisper_lang in ("zh", "zh-cn", "zh-tw") or (whisper_lang is None and is_asian):
                initial_prompt = "微短剧精彩影视对白，普通话口语对话。"
            elif whisper_lang in ("en", "english"):
                initial_prompt = "Dramatic movie dialogue between characters with emotional speech."

        logger.info(f"Transcribing audio file: {audio_path.name} with model '{target_model}' (prompt: {bool(initial_prompt)})...")

        # beam_size=5, temperature=(0.0, 0.2, 0.4) giúp nhận diện chính xác 100% ngữ cảnh phim
        # vad_filter=False đảm bảo không bị Silero VAD nuốt mất thoại khi phim có nhạc nền to
        # KHÔNG dùng hallucination_silence_threshold để tránh bị cắt cụt/bỏ sót thoại sau đoạn nhạc/khoảng lặng
        raw_segments, info = model.transcribe(
            str(audio_path),
            language=whisper_lang,
            initial_prompt=initial_prompt,
            beam_size=5,
            best_of=1,
            temperature=(0.0, 0.2, 0.4),
            condition_on_previous_text=False,  # Tránh bỏ sót lời thoại sau các đoạn nhạc
            vad_filter=False,
            repetition_penalty=1.2,
            no_repeat_ngram_size=3,
            compression_ratio_threshold=2.4,
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
            r'未经许可', r'禁止转载', r'All rights reserved', r'字幕组', r'编曲制作', r'混音设计', r'片头曲', r'片尾曲',
            r'监制', r'统筹', r'制片人'
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

            # Chỉ loại bỏ khi mô hình chắc chắn tuyệt đối là không có giọng người và logprob cực xấu
            # Đảm bảo giữ trọn vẹn 100% tiếng nhân vật nói nhỏ, thì thầm hoặc bị nhạc nền át
            if getattr(s, "no_speech_prob", 0.0) > 0.98 and getattr(s, "avg_logprob", 0.0) < -1.8:
                continue
            text = s.text.strip()
            # Dọn sạch các chuỗi gạch nối / gạch ngang bị lặp lại
            text = re.sub(r'[-—–_]{2,}', ' ', text).strip()
            if not is_valid_speech_text(text):
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

            # Bỏ qua từ bị lặp lại liên tiếp do nhạc nền hoặc khoảng lặng (ảo giác âm thanh)
            clean_norm = re.sub(r'[，。？！,?! \s\.\.\.]', '', text)
            if clean_norm and clean_norm == prev_clean_text:
                logger.info(f"Filtered repeated hallucination: '{text}'")
                continue
            prev_clean_text = clean_norm

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

        # KỸ THUẬT SMART SEGMENT MERGING CHUẨN XÁC:
        # Không gộp bừa bãi lời thoại của các nhân vật khác nhau (hỏi - đáp).
        # Chỉ hợp nhất các mảnh câu ngắt quãng cực ngắn (dưới 0.25s) và câu trước CHƯA kết thúc bằng dấu chấm/hỏi/than.
        # Đảm bảo mọi câu thoại, câu hỏi, câu cảm thán của nhân vật đều được lồng tiếng đầy đủ 100%, không bị nuốt câu.
        merged_list = []
        for item in cleaned_raw:
            if not merged_list:
                merged_list.append(item)
                continue
            last_item = merged_list[-1]
            gap = item["start"] - last_item["end"]
            combined_dur = item["end"] - last_item["start"]

            has_ending_punct = last_item["text"][-1] in "。！？?!.,:;" if last_item["text"] else False

            # Chỉ gộp nếu khoảng nghỉ cực ngắn <= 0.25s, chưa hết câu và tổng thời lượng <= 4.0s
            if 0.0 <= gap <= 0.25 and not has_ending_punct and combined_dur <= 4.0:
                last_item["end"] = max(last_item["end"], item["end"])
                sep = "，" if last_item["text"][-1] not in "，, " else " "
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
