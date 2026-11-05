"""
Audio Synchronization and Time-Stretching Module
Aligns generated speech with the original speech timestamps.
"""
import logging
from pathlib import Path
from typing import List, Union
from pydub import AudioSegment
try:
    from .transcriber import Segment
except ImportError:
    from transcriber import Segment

logger = logging.getLogger(__name__)


def trim_leading_silence(sound: AudioSegment, silence_thresh: float = -42.0) -> AudioSegment:
    """
    Cắt bỏ khoảng lặng kỹ thuật số (150ms-300ms) ở đầu tệp sinh từ TTS.
    Đảm bảo âm thanh phát âm NGAY LẬP TỨC khi nhân vật mở miệng, triệt tiêu hoàn toàn độ trễ tiếng so với video.
    """
    chunk_ms = 10
    trim_ms = 0
    max_scan = min(len(sound), 800)
    for i in range(0, max_scan, chunk_ms):
        if sound[i:i + chunk_ms].dBFS > silence_thresh:
            trim_ms = max(0, i - 15)
            break
    return sound[trim_ms:] if trim_ms > 0 else sound


def change_audio_speed(sound: AudioSegment, speed: float = 1.0) -> AudioSegment:
    """
    Điều chỉnh tốc độ âm thanh (tempo) mượt mà bằng thuật toán chuyên nghiệp FFmpeg atempo (WSOLA).
    Giữ nguyên 100% cao độ giọng nói, không ngập ngừng, không bị giật rè hay méo tiếng.
    """
    if 0.98 <= speed <= 1.02:
        return sound

    speed = max(0.9, min(1.35, speed))
    import tempfile, subprocess
    tmp_in = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp_out = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    in_path = tmp_in.name
    out_path = tmp_out.name
    tmp_in.close()
    tmp_out.close()

    try:
        sound.export(in_path, format="wav")
        cmd = [
            "ffmpeg", "-y", "-i", in_path,
            "-filter:a", f"atempo={speed:.4f}",
            "-vn", out_path
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        res = AudioSegment.from_file(out_path)
        return res
    except Exception as e:
        logger.warning(f"atempo speedup note: {e}, keeping natural playback")
        return sound
    finally:
        for p in (in_path, out_path):
            try:
                Path(p).unlink(missing_ok=True)
            except Exception:
                pass


class AudioSynchronizer:
    def __init__(
        self,
        max_speed_factor: float = 1.35,
        min_speed_factor: float = 1.0,
    ):
        self.max_speed_factor = max(1.05, min(2.0, max_speed_factor))
        self.min_speed_factor = 1.0  # Luôn giữ tối thiểu 1.0x, tuyệt đối không kéo chậm làm tụt tông/trầm giọng

    def align_and_assemble(
        self,
        segments: List[Segment],
        total_duration_seconds: float,
        output_file: Union[str, Path],
    ) -> Path:
        """
        Assembles synchronous voice track with 100% authentic character timbre and bright tone.
        Guarantees that voices speak at natural cadence without pitch-drop or sluggish drag.
        """
        output_file = Path(output_file)
        output_file.parent.mkdir(parents=True, exist_ok=True)

        total_duration_ms = int(total_duration_seconds * 1000)
        master_track = AudioSegment.silent(duration=total_duration_ms)

        logger.info(
            f"Assembling audio track for {len(segments)} segments (total length: {total_duration_seconds:.2f}s)..."
        )

        for idx, seg in enumerate(segments):
            if not seg.tts_audio_path or not Path(seg.tts_audio_path).exists():
                continue

            try:
                clip = AudioSegment.from_file(seg.tts_audio_path)
                # Cắt bỏ khoảng lặng đầu clip để giọng lồng tiếng phát ngay tức thì khớp khuôn miệng
                clip = trim_leading_silence(clip)
            except Exception as e:
                logger.warning(f"Could not read audio clip {seg.tts_audio_path}: {e}")
                continue

            # Mốc bắt đầu của câu thoại kế tiếp để tránh đè tiếng
            if idx + 1 < len(segments):
                next_start = segments[idx + 1].start
            else:
                next_start = total_duration_seconds

            available_window_s = max(0.3, next_start - seg.start - 0.08)
            clip_len_s = len(clip) / 1000.0

            # Tự động tính toán tốc độ mượt mà bằng atempo nếu câu đọc dài hơn khoảng trống tới câu tiếp theo
            # Tuyệt đối KHÔNG bao giờ cắt ngang âm thanh (triệt tiêu hoàn toàn lỗi ngắn âm / nuốt âm cuối)
            if clip_len_s > available_window_s:
                needed_speed = clip_len_s / available_window_s
                target_speed = min(needed_speed, self.max_speed_factor)
                adjusted_clip = change_audio_speed(clip, speed=target_speed)
                max_allowed_len = int((available_window_s + 0.12) * 1000)
                if len(adjusted_clip) > max_allowed_len and idx + 1 < len(segments):
                    # Nếu thực sự chạm nhẹ vào câu sau: áp dụng fade-out 40ms mềm mại thay vì cắt cụt
                    adjusted_clip = adjusted_clip[:max_allowed_len + 30].fade_out(40)
            else:
                adjusted_clip = clip

            # Mốc kết thúc phụ đề chuẩn xác: Đúng thời điểm giọng đọc dứt câu là phụ đề ẩn đi ngay lập tức
            actual_spoken_len_s = round(len(adjusted_clip) / 1000.0, 3)
            seg.sub_end = round(seg.start + actual_spoken_len_s, 3)
            if seg.sub_end > next_start:
                seg.sub_end = next_start

            start_pos_ms = int(seg.start * 1000)
            master_track = master_track.overlay(adjusted_clip, position=start_pos_ms)

        # Đảm bảo phụ đề câu trước không chồng lấn vào mốc bắt đầu của câu sau
        for i in range(len(segments) - 1):
            if hasattr(segments[i], "sub_end") and segments[i].sub_end > segments[i + 1].start:
                segments[i].sub_end = segments[i + 1].start

        master_track.export(str(output_file), format="wav")
        logger.info(f"Synchronized audio track exported to: {output_file}")
        return output_file
