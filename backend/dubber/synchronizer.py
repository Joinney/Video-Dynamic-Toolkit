"""
Audio Synchronization and Time-Stretching Module
Aligns generated speech with the original speech timestamps.
"""
import logging
import os
from pathlib import Path
from typing import List, Optional, Union
from pydub import AudioSegment
try:
    from .transcriber import Segment
except ImportError:
    from transcriber import Segment

logger = logging.getLogger(__name__)

# Tự động nạp ffmpeg và ffprobe tĩnh cho pydub và subprocess
_here = Path(__file__).resolve().parent
_ffmpeg_candidates = [
    _here.parent.parent / "node_modules" / "ffmpeg-static" / "ffmpeg.exe",
    _here.parent.parent / "node_modules" / "ffmpeg-static" / "ffmpeg",
    Path(r"D:\Nodejs\project\reelssoda\node_modules\ffmpeg-static\ffmpeg.exe"),
    Path("C:/src/platform-tools/ffmpeg.exe"),
    Path("C:/ffmpeg/bin/ffmpeg.exe"),
]
_ffprobe_candidates = [
    _here.parent.parent / "node_modules" / "ffprobe-static" / "bin" / "win32" / "x64" / "ffprobe.exe",
    _here.parent.parent / "node_modules" / "ffprobe-static" / "bin" / "linux" / "x64" / "ffprobe",
    Path(r"D:\Nodejs\project\reelssoda\node_modules\ffprobe-static\bin\win32\x64\ffprobe.exe"),
    Path("C:/src/platform-tools/ffprobe.exe"),
    Path("C:/ffmpeg/bin/ffprobe.exe"),
]

for _c in _ffmpeg_candidates:
    if _c.exists():
        AudioSegment.converter = str(_c)
        AudioSegment.ffmpeg = str(_c)
        _bin_dir = str(_c.parent)
        if _bin_dir not in os.environ.get("PATH", ""):
            os.environ["PATH"] = _bin_dir + os.pathsep + os.environ.get("PATH", "")
        break

for _p in _ffprobe_candidates:
    if _p.exists():
        AudioSegment.ffprobe = str(_p)
        _bin_dir = str(_p.parent)
        if _bin_dir not in os.environ.get("PATH", ""):
            os.environ["PATH"] = _bin_dir + os.pathsep + os.environ.get("PATH", "")
        break


def get_ffmpeg_binary() -> str:
    if getattr(AudioSegment, "converter", None) and Path(AudioSegment.converter).exists():
        return str(AudioSegment.converter)
    for c in _ffmpeg_candidates:
        if c.exists():
            return str(c)
    return "ffmpeg"


def trim_leading_silence(sound: AudioSegment, silence_thresh: float = -40.0) -> AudioSegment:
    """
    Cắt bỏ khoảng lặng kỹ thuật số (100ms-300ms) ở đầu tệp sinh từ TTS.
    Đảm bảo âm thanh phát âm NGAY LẬP TỨC khi nhân vật mở miệng, triệt tiêu hoàn toàn độ trễ tiếng so với video.
    """
    chunk_ms = 5
    trim_ms = 0
    max_scan = min(len(sound), 800)
    for i in range(0, max_scan, chunk_ms):
        if sound[i:i + chunk_ms].dBFS > silence_thresh:
            trim_ms = max(0, i - 10)
            break
    return sound[trim_ms:] if trim_ms > 0 else sound


def change_audio_speed(sound: AudioSegment, speed: float = 1.0) -> AudioSegment:
    """
    Điều chỉnh tốc độ âm thanh (tempo) mượt mà bằng thuật toán chuyên nghiệp FFmpeg atempo (WSOLA).
    Giữ nguyên 100% cao độ giọng nói, không ngập ngừng, không bị giật rè hay méo tiếng.
    """
    if 0.97 <= speed <= 1.03:
        return sound

    speed = max(0.85, min(2.0, speed))
    import tempfile, subprocess
    tmp_in = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp_out = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    in_path = tmp_in.name
    out_path = tmp_out.name
    tmp_in.close()
    tmp_out.close()

    try:
        sound.export(in_path, format="wav")
        if speed > 2.0:
            filter_str = f"atempo=2.0,atempo={speed / 2.0:.4f}"
        elif speed < 0.5:
            filter_str = f"atempo=0.5,atempo={speed / 0.5:.4f}"
        else:
            filter_str = f"atempo={speed:.4f}"

        ffmpeg_bin = get_ffmpeg_binary()
        cmd = [
            ffmpeg_bin, "-y", "-i", in_path,
            "-filter:a", filter_str,
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
        max_speed_factor: float = 2.0,
        min_speed_factor: float = 1.0,
    ):
        self.max_speed_factor = max(1.10, min(2.5, max_speed_factor))
        self.min_speed_factor = 1.0  # Luôn giữ tối thiểu 1.0x, tuyệt đối không kéo chậm làm tụt tông/trầm giọng

    def align_and_assemble(
        self,
        segments: List[Segment],
        total_duration_seconds: float,
        output_file: Union[str, Path],
        progress_callback: Optional[object] = None,
    ) -> Path:
        """
        Assembles synchronous voice track with 100% authentic character timbre and bright tone.
        Guarantees that voices speak at natural cadence without pitch-drop or sluggish drag.
        """
        output_file = Path(output_file)
        output_file.parent.mkdir(parents=True, exist_ok=True)

        total_duration_ms = int(total_duration_seconds * 1000)
        master_track = AudioSegment.silent(duration=total_duration_ms)
        tot_segs = max(1, len(segments))

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

            if progress_callback:
                sub_pct = 0.75 + min(0.10, ((idx + 1) / tot_segs) * 0.10)
                cur_m, cur_s_val = divmod(int(seg.start), 60)
                progress_callback(
                    f"[Khớp khẩu hình] Đồng bộ câu {idx+1}/{tot_segs} (Mốc {cur_m:02d}:{cur_s_val:02d})",
                    sub_pct
                )

            # Mốc bắt đầu của câu thoại kế tiếp để tránh đè tiếng
            if idx + 1 < len(segments):
                next_start = segments[idx + 1].start
            else:
                next_start = total_duration_seconds

            clip_len_s = len(clip) / 1000.0
            orig_spoken_dur = max(0.5, seg.end - seg.start)
            max_window_s = max(0.5, next_start - seg.start - 0.05)

            # Khớp khẩu hình tự nhiên: Giọng AI phát âm tròn vành rõ chữ, dứt khoát và không bị nói quá nhanh
            # Cho phép kéo dài tự nhiên nếu khoảng cách tới câu thoại tiếp theo còn rộng (không đè tiếng)
            allowed_natural_dur = max(orig_spoken_dur, min(orig_spoken_dur + 0.5, orig_spoken_dur * 1.25))
            target_window_s = min(max_window_s, allowed_natural_dur)

            # Tự động tính toán tốc độ mượt mà bằng atempo nếu câu đọc dài hơn khoảng thời gian mục tiêu
            if clip_len_s > target_window_s:
                needed_speed = clip_len_s / target_window_s
                target_speed = min(needed_speed, self.max_speed_factor)
                adjusted_clip = change_audio_speed(clip, speed=target_speed)
            else:
                adjusted_clip = clip

            # Mốc kết thúc phụ đề chuẩn xác: Đồng bộ hoàn hảo với giọng đọc và che kín phụ đề gốc của video
            actual_spoken_len_s = round(len(adjusted_clip) / 1000.0, 3)
            target_sub_end = max(seg.start + actual_spoken_len_s, seg.end)
            if idx + 1 < len(segments):
                target_sub_end = min(target_sub_end, next_start - 0.05)
            seg.sub_end = round(max(seg.start + 0.5, target_sub_end), 3)

            start_pos_ms = int(seg.start * 1000)
            master_track = master_track.overlay(adjusted_clip, position=start_pos_ms)

        # Đảm bảo phụ đề câu trước không chồng lấn vào mốc bắt đầu của câu sau
        for i in range(len(segments) - 1):
            if hasattr(segments[i], "sub_end") and segments[i].sub_end > segments[i + 1].start:
                segments[i].sub_end = segments[i + 1].start

        master_track.export(str(output_file), format="wav")
        logger.info(f"Synchronized audio track exported to: {output_file}")
        return output_file
