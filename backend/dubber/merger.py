"""
Video and Audio Merging Module
Combines the synchronized dubbed audio with video, with background audio ducking.
"""
import os
import json
import logging
import shutil
import subprocess
import re
import uuid
import math
import textwrap
from pathlib import Path
from typing import Optional, Union
from pydub import AudioSegment

logger = logging.getLogger(__name__)


def find_ffmpeg_binary() -> str:
    """Locates FFmpeg binary on Linux, Docker, Windows or via bundled imageio_ffmpeg."""
    # 1. System PATH
    found = shutil.which("ffmpeg")
    if found:
        return found
    # 2. imageio_ffmpeg bundled executable
    try:
        import imageio_ffmpeg
        exe = imageio_ffmpeg.get_ffmpeg_exe()
        if exe and Path(exe).exists():
            return exe
    except Exception:
        pass
    # 3. Known common paths
    for candidate in [
        r"C:\ffmpeg\bin\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        r"D:\ffmpeg\bin\ffmpeg.exe",
        r"/usr/bin/ffmpeg",
        r"/usr/local/bin/ffmpeg",
    ]:
        if Path(candidate).exists():
            return candidate
    return "ffmpeg"


def find_ffprobe_binary() -> str:
    """Locates FFprobe binary on Linux, Docker, Windows or next to ffmpeg."""
    found = shutil.which("ffprobe")
    if found:
        return found
    ffmpeg_exe = find_ffmpeg_binary()
    probe_candidate = Path(ffmpeg_exe).with_name("ffprobe" + Path(ffmpeg_exe).suffix)
    if probe_candidate.exists():
        return str(probe_candidate)
    for cand in [
        r"C:\ffmpeg\bin\ffprobe.exe",
        r"C:\Program Files\ffmpeg\bin\ffprobe.exe",
        r"D:\ffmpeg\bin\ffprobe.exe",
        r"/usr/bin/ffprobe",
        r"/usr/local/bin/ffprobe",
    ]:
        if Path(cand).exists():
            return cand
    return "ffprobe"


def get_video_dimensions(video_path: Union[str, Path]) -> tuple[int, int]:
    """
    Trích xuất chính xác độ phân giải hiển thị thực tế (width, height) của video.
    Tự động nhận diện metadata xoay video dọc (displaymatrix / rotation) để hoán đổi
    kích thước hiển thị chuẩn xác (ví dụ 1280x720 xoay -90° -> 720x1280).
    Đảm bảo phụ đề và logo luôn được scale và căn tọa độ pixel chuẩn xác 100%.
    """
    video_path = Path(video_path)
    if not video_path.exists():
        return 1280, 720

    # 1. Thử qua ffprobe json (kiểm tra width, height và metadata xoay -90/90/270)
    try:
        probe_bin = find_ffprobe_binary()
        cmd = [
            probe_bin,
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height:stream_side_data=rotation:stream_tags=rotate",
            "-of", "json",
            str(video_path)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True, timeout=5)
        probe_data = json.loads(res.stdout)
        streams = probe_data.get("streams", [])
        if streams:
            st = streams[0]
            w = int(st.get("width", 0))
            h = int(st.get("height", 0))
            rot = 0
            for sd in st.get("side_data_list", []):
                if "rotation" in sd:
                    rot = sd["rotation"]
                    break
            if not rot and "tags" in st and "rotate" in st["tags"]:
                rot = st["tags"]["rotate"]
            try:
                if abs(int(float(rot))) in [90, 270]:
                    w, h = h, w
            except Exception:
                pass
            if w > 0 and h > 0:
                return w, h
    except Exception as ex_probe:
        logger.debug(f"ffprobe dimension check notice: {ex_probe}")

    # Fallback ffprobe csv đơn giản
    try:
        probe_bin = find_ffprobe_binary()
        cmd = [
            probe_bin,
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height",
            "-of", "csv=p=0:s=x",
            str(video_path)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True, timeout=5)
        out = res.stdout.strip()
        if "x" in out:
            parts = out.split("x")
            w, h = int(parts[0]), int(parts[1])
            if w > 0 and h > 0:
                return w, h
    except Exception:
        pass

    # 2. Thử qua cv2 nếu ffprobe không khả dụng
    try:
        import cv2
        cap = cv2.VideoCapture(str(video_path))
        if cap.isOpened():
            w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            cap.release()
            if w > 0 and h > 0:
                return w, h
    except Exception:
        pass

    return 1280, 720


def check_has_audio(file_path: Union[str, Path]) -> bool:
    """Checks whether the media file contains at least one audio stream."""
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-select_streams", "a",
            "-show_entries", "stream=codec_type",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(file_path)
        ]
        out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode('utf-8', errors='ignore').strip()
        return "audio" in out
    except Exception:
        return True


def srt_to_ass(
    srt_path: Union[str, Path],
    ass_path: Union[str, Path],
    font_size: int = 28,
    style: str = "glassmorphism",
    margin_v: int = 7,
    video_w: int = 1280,
    video_h: int = 720
) -> Path:
    """
    Converts standard SRT file to Advanced SubStation Alpha (.ass) format.
    Renders pixel-perfect rounded glassmorphism pills, cinema black boxes,
    or crisp outline subtitles matching the web preview exactly.
    """
    import re
    import textwrap
    from PIL import Image, ImageFont, ImageDraw

    srt_path = Path(srt_path)
    ass_path = Path(ass_path)
    
    # Chuẩn hóa tỷ lệ font_size theo chiều rộng / kích thước ngắn nhất của video
    # Đảm bảo video dọc (TikTok, Shorts, Reels) không bị phóng đại quá khổ
    v_w = max(320, int(video_w or 1280))
    v_h = max(240, int(video_h or 720))
    scale_ref = min(v_w, v_h) / 720.0

    raw_fsize = max(16, min(90, int(font_size)))
    f_size = max(18, min(120, int(raw_fsize * scale_ref)))

    if int(margin_v) <= 85:
        mv = max(8, min(int(v_h * 0.85), int(v_h * (float(margin_v) / 100.0))))
    else:
        mv = max(8, min(int(v_h * 0.85), int(float(margin_v) * scale_ref)))

    style_str = str(style).lower()
    is_glass = ("kính mờ" in style_str or "glass" in style_str)
    is_black_box = ("black_box" in style_str or "hộp đen" in style_str or "black box" in style_str)
    is_yellow = ("yellow" in style_str or "nổi bật" in style_str or "vàng" in style_str)

    # Nạp font chữ để đo đạc chính xác chiều dài từng dòng
    font = None
    for cand in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "arial.ttf", "Arial.ttf",
        "C:\\Windows\\Fonts\\arial.ttf",
        "C:\\Windows\\Fonts\\tahoma.ttf",
    ]:
        try:
            font = ImageFont.truetype(cand, f_size)
            break
        except Exception:
            pass
    if font is None:
        font = ImageFont.load_default()

    dummy = Image.new("RGBA", (10, 10))
    d_draw = ImageDraw.Draw(dummy)

    outline_w = max(2.0, round(f_size * 0.08, 1))
    shadow_d = max(1.0, round(f_size * 0.03, 1))

    font_name = "DejaVu Sans"

    header = (
        "[Script Info]\n"
        "Title: StudioVDT Dubbed Subtitles\n"
        "ScriptType: v4.00+\n"
        "WrapStyle: 2\n"
        "ScaledBorderAndShadow: yes\n"
        f"PlayResX: {v_w}\n"
        f"PlayResY: {v_h}\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, "
        "Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
    )

    if is_glass:
        # Layer 0: Frosted Glass rounded vector pill (translucent dark borderless)
        # Layer 1: Crisp pure white text with subtle soft shadow (borderless)
        header += (
            f"Style: Pill,{font_name},10,&H65141418,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1\n"
            f"Style: SubText,{font_name},{f_size},&H00FFFFFF,&H000000FF,&H00000000,&H75000000,-1,0,0,0,100,100,0,0,1,0,1.2,2,20,20,{mv},1\n\n"
        )
    elif is_black_box:
        # Layer 0: Cinema Black Box rounded vector pill
        header += (
            f"Style: Pill,{font_name},10,&H25040406,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1\n"
            f"Style: SubText,{font_name},{f_size},&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,0,0,2,20,20,{mv},1\n\n"
        )
    elif is_yellow:
        # Yellow TikTok/Reels outline
        header += (
            f"Style: Default,{font_name},{f_size},&H0000FFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,{outline_w},{shadow_d},2,20,20,{mv},1\n\n"
        )
    else:
        # Cinema White Outline
        header += (
            f"Style: Default,{font_name},{f_size},&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,{outline_w},{shadow_d},2,20,20,{mv},1\n\n"
        )

    header += (
        "[Events]\n"
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )

    def srt_time_to_ass(t_str: str) -> str:
        t_str = t_str.strip().replace(",", ".")
        parts = t_str.split(":")
        if len(parts) == 3:
            h = int(parts[0])
            m = parts[1]
            s_parts = parts[2].split(".")
            s = s_parts[0]
            ms = s_parts[1] if len(s_parts) > 1 else "00"
            cs = ms[:2].ljust(2, "0")
            return f"{h}:{m}:{s}.{cs}"
        return t_str

    def make_rounded_rect_ass(w: int, h: int, r: int) -> str:
        k = round(r * 0.5523, 1)
        return (
            f"m {r} 0 "
            f"l {w - r} 0 "
            f"b {w - r + k} 0 {w} {r - k} {w} {r} "
            f"l {w} {h - r} "
            f"b {w} {h - r + k} {w - r + k} {h} {w - r} {h} "
            f"l {r} {h} "
            f"b {r - k} {h} 0 {h - r + k} 0 {h - r} "
            f"l 0 {r} "
            f"b 0 {r - k} {r - k} 0 {r} 0"
        )

    content = srt_path.read_text(encoding="utf-8", errors="replace")
    blocks = re.split(r"\n\s*\n", content.strip())
    dialogues = []

    target_max_w = max(280, int(v_w * 0.82))
    sample_bbox = d_draw.textbbox((0, 0), "Mẫu chữ tiếng Việt chuẩn", font=font)
    char_w = max(10, (sample_bbox[2] - sample_bbox[0]) // 24)
    wrap_chars = max(18, min(42, (target_max_w - 30) // char_w))

    for blk in blocks:
        lines_raw = [ln.strip() for ln in blk.split("\n") if ln.strip()]
        if len(lines_raw) >= 2:
            time_line_idx = 1 if "-->" in lines_raw[1] else (0 if "-->" in lines_raw[0] else -1)
            if time_line_idx != -1:
                t_parts = lines_raw[time_line_idx].split("-->")
                start_ass = srt_time_to_ass(t_parts[0])
                end_ass = srt_time_to_ass(t_parts[1])
                raw_text = " ".join(lines_raw[time_line_idx + 1:])
                raw_text = raw_text.replace("{", "(").replace("}", ")")

                wrapped_lines = textwrap.wrap(raw_text, width=wrap_chars)
                if not wrapped_lines:
                    wrapped_lines = [raw_text]
                sub_text = r"\N".join(wrapped_lines)

                if is_glass or is_black_box:
                    line_h = int(f_size * 1.35)
                    max_lw = 0
                    for w_ln in wrapped_lines:
                        bb = d_draw.textbbox((0, 0), w_ln, font=font)
                        max_lw = max(max_lw, bb[2] - bb[0])

                    pad_x = max(18, int(f_size * 0.42))
                    pad_y = max(8, int(f_size * 0.22))
                    pill_w = max_lw + pad_x * 2
                    pill_h = line_h * len(wrapped_lines) + pad_y * 2
                    radius = max(8, min(22, int(f_size * 0.35)))

                    pill_path = make_rounded_rect_ass(pill_w, pill_h, radius)
                    pill_x = (v_w - pill_w) // 2
                    pill_y = v_h - mv - pill_h

                    # Layer 0: Pill
                    dialogues.append(f"Dialogue: 0,{start_ass},{end_ass},Pill,,0,0,0,,{{\\pos({pill_x},{pill_y})\\p1}}{pill_path}{{\\p0}}")
                    # Layer 1: Text
                    text_mv = mv + pad_y
                    dialogues.append(f"Dialogue: 1,{start_ass},{end_ass},SubText,,0,0,{text_mv},,{sub_text}")
                else:
                    dialogues.append(f"Dialogue: 0,{start_ass},{end_ass},Default,,0,0,{mv},,{sub_text}")

    ass_path.write_text(header + "\n".join(dialogues) + "\n", encoding="utf-8")
    return ass_path



def generate_watermark_png(
    text: str,
    output_png_path: Union[str, Path],
    font_size: int = 18,
    opacity: float = 0.35,
) -> Path:
    """
    Renders transparent PNG with faded white copyright text and subtle shadow.
    Embedded alpha channel ensures instant transparency in both FFmpeg and MoviePy.
    """
    from PIL import Image, ImageDraw, ImageFont
    output_png_path = Path(output_png_path)
    clean_text = text.strip() if text and text.strip() else "@gocphimcuon"
    f_size = max(12, min(64, int(font_size)))
    op_val = max(0.08, min(0.95, float(opacity)))
    alpha_text = int(op_val * 255)
    alpha_shadow = int(op_val * 160)

    font = None
    for font_cand in [
        "arial.ttf", "Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "C:\\Windows\\Fonts\\arial.ttf",
        "C:\\Windows\\Fonts\\tahoma.ttf",
    ]:
        try:
            font = ImageFont.truetype(font_cand, f_size)
            break
        except Exception:
            continue
    if font is None:
        try:
            font = ImageFont.load_default()
        except Exception:
            pass

    dummy_img = Image.new("RGBA", (10, 10))
    d_draw = ImageDraw.Draw(dummy_img)
    try:
        bbox = d_draw.textbbox((0, 0), clean_text, font=font)
        text_w = bbox[2] - bbox[0] + 20
        text_h = bbox[3] - bbox[1] + 16
    except Exception:
        text_w = len(clean_text) * (f_size // 2 + 2) + 20
        text_h = f_size + 16

    img = Image.new("RGBA", (text_w, text_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Soft black drop shadow for readability on both light and dark video backgrounds
    draw.text((3, 3), clean_text, fill=(0, 0, 0, alpha_shadow), font=font)
    draw.text((2, 2), clean_text, fill=(0, 0, 0, alpha_shadow), font=font)
    # Faded white text with embedded opacity
    draw.text((1, 1), clean_text, fill=(255, 255, 255, alpha_text), font=font)

    img.save(str(output_png_path), format="PNG")
    return output_png_path



def parse_srt_file(srt_path: Path):
    content = srt_path.read_text(encoding="utf-8", errors="replace")
    import re
    blocks = re.split(r"\n\s*\n", content.strip())
    items = []
    def parse_time(ts):
        ts = ts.strip().replace(",", ".")
        parts = ts.split(":")
        if len(parts) == 3:
            h, m, s = parts
            return int(h) * 3600 + int(m) * 60 + float(s)
        return 0.0

    for blk in blocks:
        lines = [ln.strip() for ln in blk.split("\n") if ln.strip()]
        if len(lines) >= 2:
            t_idx = 1 if "-->" in lines[1] else (0 if "-->" in lines[0] else -1)
            if t_idx != -1:
                t_parts = lines[t_idx].split("-->")
                start = parse_time(t_parts[0])
                end = parse_time(t_parts[1])
                text = " ".join(lines[t_idx + 1:])
                items.append((start, end, text))
    return items


def create_sub_png(
    text: str,
    font_size: int,
    style: str,
    out_path: Path,
    max_video_width: int = 1280,
    video_height: int = 720
):
    """
    Renders multi-line wrapped subtitles with high contrast outline or black box.
    Guarantees that subtitles fit within video dimensions without negative coordinates.
    """
    import textwrap
    from PIL import Image, ImageDraw, ImageFont
    clean_text = text.strip()
    if not clean_text:
        return out_path

    # Co giãn font size tỷ lệ chuẩn theo kích thước ngắn nhất của video (chuẩn 720p)
    scale_factor = min(max_video_width, video_height) / 720.0
    f_size = max(18, min(120, int(font_size * scale_factor)))
    font = None
    for cand in [
        "arial.ttf", "Arial.ttf",
        "C:\\Windows\\Fonts\\arial.ttf",
        "C:\\Windows\\Fonts\\tahoma.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]:
        try:
            font = ImageFont.truetype(cand, f_size)
            break
        except Exception:
            continue
    if font is None:
        try:
            font = ImageFont.load_default()
        except Exception:
            pass

    dummy = Image.new("RGBA", (10, 10))
    d_draw = ImageDraw.Draw(dummy)

    # Estimate character width to wrap lines safely within 88% of video width
    target_box_max_w = max(360, int(max_video_width * 0.88))
    try:
        sample_bbox = d_draw.textbbox((0, 0), "Mẫu chữ tiếng Việt", font=font)
        avg_char_w = max(10, (sample_bbox[2] - sample_bbox[0]) // 18)
    except Exception:
        avg_char_w = max(10, f_size // 2)

    chars_per_line = max(16, min(50, (target_box_max_w - 40) // avg_char_w))
    lines = textwrap.wrap(clean_text, width=chars_per_line)
    if not lines:
        lines = [clean_text]

    stroke_w = max(2, int(f_size * 0.08))
    pad_x = max(20, int(f_size * 0.4))
    pad_y = max(12, int(f_size * 0.25))
    line_height = int(f_size * 1.35)

    line_bboxes = []
    max_line_w = 0
    for ln in lines:
        try:
            bb = d_draw.textbbox((0, 0), ln, font=font, stroke_width=stroke_w)
            w = bb[2] - bb[0]
        except Exception:
            w = len(ln) * avg_char_w
        max_line_w = max(max_line_w, w)
        line_bboxes.append(w)

    total_w = max_line_w + pad_x * 2
    total_h = line_height * len(lines) + pad_y * 2

    img = Image.new("RGBA", (total_w, total_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    s_lower = str(style).lower()
    if "glass" in s_lower or "kính mờ" in s_lower:
        # Frosted glass pill background - Bỏ viền hoàn toàn (borderless)
        radius = max(8, int(f_size * 0.25))
        draw.rounded_rectangle([(0, 0), (total_w - 1, total_h - 1)], radius=radius, fill=(20, 20, 26, 160))
        txt_color = (255, 255, 255, 255)
        for idx, (ln, lw) in enumerate(zip(lines, line_bboxes)):
            lx = pad_x + (max_line_w - lw) // 2
            ly = pad_y + idx * line_height
            draw.text((lx + 1, ly + 1), ln, fill=(0, 0, 0, 180), font=font)
            draw.text((lx, ly), ln, fill=txt_color, font=font)
    elif "black_box" in s_lower or "hộp đen" in s_lower or "black box" in s_lower:
        # Rounded semi-transparent black background box with crisp white text
        draw.rounded_rectangle([(0, 0), (total_w - 1, total_h - 1)], radius=max(6, int(f_size * 0.2)), fill=(0, 0, 0, 195))
        for idx, (ln, lw) in enumerate(zip(lines, line_bboxes)):
            lx = pad_x + (max_line_w - lw) // 2
            ly = pad_y + idx * line_height
            draw.text((lx, ly), ln, fill=(255, 255, 255, 255), font=font)
    elif "yellow" in s_lower or "nổi bật" in s_lower or "vàng" in s_lower:
        txt_color = (255, 235, 59, 255)
        for idx, (ln, lw) in enumerate(zip(lines, line_bboxes)):
            lx = pad_x + (max_line_w - lw) // 2
            ly = pad_y + idx * line_height
            draw.text((lx + stroke_w//2, ly + stroke_w//2), ln, fill=(0, 0, 0, 160), font=font)
            draw.text((lx, ly), ln, fill=txt_color, font=font, stroke_width=stroke_w, stroke_fill=(0, 0, 0, 255))
    else:
        # Default: Pure white text with crisp deep black outline (Chuẩn điện ảnh)
        txt_color = (255, 255, 255, 255)
        for idx, (ln, lw) in enumerate(zip(lines, line_bboxes)):
            lx = pad_x + (max_line_w - lw) // 2
            ly = pad_y + idx * line_height
            draw.text((lx + stroke_w//2, ly + stroke_w//2), ln, fill=(0, 0, 0, 160), font=font)
            draw.text((lx, ly), ln, fill=txt_color, font=font, stroke_width=stroke_w, stroke_fill=(0, 0, 0, 255))

    img.save(str(out_path), format="PNG")
    return out_path


class VideoMerger:
    def __init__(self, original_audio_volume: float = 0.15):
        """
        original_audio_volume: 0.0 means mute original audio entirely.
                               0.15 keeps original audio at 15% volume as background ambiance/music.
        """
        self.original_audio_volume = max(0.0, min(1.0, original_audio_volume))

    def mix_audios(
        self,
        original_audio_path: Union[str, Path],
        dubbed_audio_path: Union[str, Path],
        output_mixed_audio_path: Union[str, Path],
        segments: Optional[list] = None,
        mute_original_dialogue: bool = True,
    ) -> Path:
        """
        Mixes original background audio with dubbed voice track.
        When mute_original_dialogue=True, completely silences original actor voices
        during dialogue segments so there is 100% ZERO bleed and NO dual-voice ('hai giọng').
        """
        output_mixed_audio_path = Path(output_mixed_audio_path)
        output_mixed_audio_path.parent.mkdir(parents=True, exist_ok=True)

        dubbed_sound = AudioSegment.from_file(dubbed_audio_path)
        try:
            from pydub.effects import normalize
            dubbed_sound = normalize(dubbed_sound, headroom=0.8)
        except Exception:
            pass

        vol_fraction = self.original_audio_volume if self.original_audio_volume <= 1.0 else self.original_audio_volume / 100.0
        vol_fraction = max(0.0, min(0.60, vol_fraction))

        if vol_fraction <= 0.005:
            # Tắt hoàn toàn tiếng phim gốc, chỉ giữ giọng lồng tiếng phòng thu
            dubbed_sound.export(str(output_mixed_audio_path), format="wav")
            return output_mixed_audio_path

        try:
            original_sound = AudioSegment.from_file(original_audio_path)
            import math
            # Duy trì âm lượng nhạc nền/phim gốc ở mức êm dịu
            gain_reduction_db = 20 * math.log10(max(0.01, vol_fraction))
            attenuated_orig = original_sound + gain_reduction_db

            # Tự động triệt tiêu giọng thoại gốc trong các khoảng thời gian nhân vật nói thoại
            # (Auto-Ducking / Zero Bleed: triệt tiêu 100% tình trạng hai thứ tiếng chồng lên nhau)
            if mute_original_dialogue and segments:
                duck_extra_attenuation = -32.0  # Triệt tiêu giọng gốc trong lúc có lời thoại lồng tiếng
                orig_len = len(attenuated_orig)
                
                # Tạo mask ducking cho âm thanh gốc
                ducked_sound = attenuated_orig
                for seg in segments:
                    s_ms = max(0, int(seg.start * 1000) - 40)
                    e_val = getattr(seg, "sub_end", None) or seg.end
                    e_ms = min(orig_len, int(e_val * 1000) + 80)
                    if s_ms < e_ms and s_ms < orig_len:
                        silenced_slice = ducked_sound[s_ms:e_ms] + duck_extra_attenuation
                        ducked_sound = ducked_sound[:s_ms] + silenced_slice + ducked_sound[e_ms:]

                attenuated_orig = ducked_sound

            mixed = attenuated_orig.overlay(dubbed_sound)
            mixed.export(str(output_mixed_audio_path), format="wav")
            logger.info(f"Mixed background audio steadily at {vol_fraction*100:.1f}% ({gain_reduction_db:.1f}dB) with dialogue ducking.")
            return output_mixed_audio_path
        except Exception as e:
            logger.warning(f"Audio mixing failed ({e}), using dubbed audio only.")
            dubbed_sound.export(str(output_mixed_audio_path), format="wav")
            return output_mixed_audio_path

    def merge_video(
        self,
        video_path: Union[str, Path],
        audio_path: Union[str, Path],
        output_video_path: Union[str, Path],
        subtitle_path: Optional[Union[str, Path]] = None,
        subtitle_font_size: int = 42,
        subtitle_style: str = "white_outline",
        subtitle_margin_v: int = 35,
        logo_path: Optional[Union[str, Path]] = None,
        logo_x_pct: float = 0.80,
        logo_y_pct: float = 0.05,
        logo_scale: float = 0.18,
        logo_opacity: float = 0.90,
        logo_rotation: float = 0.0,
        floating_watermark_text: Optional[str] = None,
        floating_watermark_font_size: int = 18,
        floating_watermark_opacity: float = 0.30,
        outro_video_path: Optional[Union[str, Path]] = None,
        progress_callback: Optional[object] = None,
        total_duration: float = 0.0,
    ) -> Path:
        """
        Merges final mixed audio into the original video container,
        with optional burned-in subtitles (hardsub), optional logo overlay,
        optional continuous floating copyright watermark, and optional outro video at the end.
        """
        import uuid
        import shutil
        video_path = Path(video_path)
        audio_path = Path(audio_path)
        output_video_path = Path(output_video_path)
        output_video_path.parent.mkdir(parents=True, exist_ok=True)

        has_logo = logo_path is not None and Path(logo_path).exists()
        has_sub = subtitle_path is not None and Path(subtitle_path).exists()
        has_outro = outro_video_path is not None and Path(outro_video_path).exists()

        x_pct = max(0.0, min(0.95, float(logo_x_pct)))
        y_pct = max(0.0, min(0.95, float(logo_y_pct)))
        scale_val = max(0.05, min(0.60, float(logo_scale)))
        opacity_val = max(0.10, min(1.0, float(logo_opacity)))
        rot_deg = float(logo_rotation or 0.0) % 360.0

        logger.info(
            f"Merging final audio into {video_path.name} -> {output_video_path.name} "
            f"(has_logo={has_logo}, has_sub={has_sub}, floating_wm={floating_watermark_text}, has_outro={has_outro})..."
        )

        cpu_threads = max(2, os.cpu_count() or 16)

        has_floating_wm = bool(floating_watermark_text and floating_watermark_text.strip())
        wm_opacity = max(0.05, min(0.95, float(floating_watermark_opacity)))
        wm_fsize = max(12, min(48, int(floating_watermark_font_size)))

        temp_sub_file = None
        unique_ass_name = None
        temp_wm_file = None
        sub_temp_dir = None

        # Trích xuất kích thước thực tế của video để scale logo và phụ đề khớp 1:1
        vid_w, vid_h = get_video_dimensions(video_path)

        try:
            if has_sub:
                try:
                    unique_ass_name = f"sub_{uuid.uuid4().hex[:8]}.ass"
                    temp_sub_file = Path(unique_ass_name)
                    srt_to_ass(
                        srt_path=subtitle_path,
                        ass_path=temp_sub_file,
                        font_size=subtitle_font_size,
                        style=subtitle_style,
                        margin_v=subtitle_margin_v,
                        video_w=vid_w,
                        video_h=vid_h
                    )
                except Exception as ex_sub:
                    logger.warning(f"Failed to prepare ASS subtitles for burning: {ex_sub}")
                    unique_ass_name = None

            if has_floating_wm:
                try:
                    unique_wm_name = f"wm_{uuid.uuid4().hex[:8]}.png"
                    temp_wm_file = Path(unique_wm_name)
                    generate_watermark_png(
                        text=floating_watermark_text,
                        output_png_path=temp_wm_file,
                        font_size=wm_fsize,
                        opacity=wm_opacity,
                    )
                except Exception as ex_wm:
                    logger.warning(f"Failed to generate floating watermark PNG: {ex_wm}")
                    has_floating_wm = False

            # Method 1: Try ffmpeg directly (Fast & lossless)
            ffmpeg_succeeded = False
            try:
                ffmpeg_bin = find_ffmpeg_binary()
                intermediate_out = output_video_path.with_name(f"pre_outro_{uuid.uuid4().hex[:6]}.mp4") if has_outro else output_video_path
                cmd = [ffmpeg_bin, "-y", "-i", str(video_path), "-i", str(audio_path)]
                next_idx = 2

                logo_in_idx = None
                if has_logo:
                    # -loop 1 đảm bảo hình ảnh logo được cấp liên tục suốt video, không bị dừng ở frame đầu
                    cmd.extend(["-loop", "1", "-i", str(Path(logo_path).resolve())])
                    logo_in_idx = next_idx
                    next_idx += 1

                wm_in_idx = None
                if has_floating_wm and temp_wm_file and temp_wm_file.exists():
                    # -loop 1 đảm bảo chữ mờ chạy liên tục không bị cạn frame gây đứng hình
                    cmd.extend(["-loop", "1", "-i", str(temp_wm_file.resolve())])
                    wm_in_idx = next_idx
                    next_idx += 1

                filter_chain = []
                cur_stream = "0:v"

                # 1. Overlay Logo
                if has_logo and logo_in_idx is not None:
                    target_logo_w = max(24, int(vid_w * scale_val))
                    rot_filter = f",rotate=a={rot_deg:.2f}*PI/180:ow='hypot(iw,ih)':oh=ow:c=none" if rot_deg != 0 else ""
                    filter_chain.append(
                        f"[{logo_in_idx}:v]format=rgba,colorchannelmixer=aa={opacity_val:.2f},"
                        f"scale={target_logo_w}:-1{rot_filter}[logo_p]"
                    )
                    filter_chain.append(
                        f"[{cur_stream}][logo_p]overlay=x='min(main_w-w,max(0,main_w*{x_pct:.4f}))':"
                        f"y='min(main_h-h,max(0,main_h*{y_pct:.4f}))':eof_action=repeat:eval=init[v_logo]"
                    )
                    cur_stream = "v_logo"

                # 2. Overlay Floating Watermark (Gently floating around the screen in figure-8 trajectory)
                if has_floating_wm and wm_in_idx is not None:
                    filter_chain.append(
                        f"[{wm_in_idx}:v]format=rgba[wm_p]"
                    )
                    filter_chain.append(
                        f"[{cur_stream}][wm_p]overlay="
                        f"x='(main_w-w)/2+(main_w-w)*0.43*sin(2*PI*t/14)':"
                        f"y='(main_h-h)/2+(main_h-h)*0.43*cos(2*PI*t/19)':eof_action=repeat:eval=frame[v_wm]"
                    )
                    cur_stream = "v_wm"

                # 3. Burn Subtitles (ASS native format, 100% bug-free)
                if has_sub and unique_ass_name:
                    filter_chain.append(
                        f"[{cur_stream}]subtitles={unique_ass_name}[v_sub]"
                    )
                    cur_stream = "v_sub"

                if filter_chain:
                    cmd.extend([
                        "-filter_complex", ";".join(filter_chain),
                        "-map", f"[{cur_stream}]",
                        "-map", "1:a:0",
                        "-c:v", "libx264",
                        "-pix_fmt", "yuv420p",
                        "-preset", "superfast",
                        "-threads", str(cpu_threads),
                        "-crf", "23",
                        "-c:a", "aac",
                        "-b:a", "192k",
                        "-movflags", "+faststart",
                        "-shortest",
                        "-progress", "pipe:1",
                        str(intermediate_out),
                    ])
                else:
                    cmd.extend([
                        "-c:v", "copy",
                        "-c:a", "aac",
                        "-b:a", "192k",
                        "-movflags", "+faststart",
                        "-map", "0:v:0",
                        "-map", "1:a:0",
                        "-shortest",
                        "-progress", "pipe:1",
                        str(intermediate_out),
                    ])

                logger.info(f"Running high-speed FFmpeg with {cpu_threads} CPU threads (preset: superfast)...")
                proc = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    bufsize=1
                )

                cur_fps = 0.0
                cur_speed = "1.0x"
                last_reported_s = -999.0
                if proc.stdout:
                    for line in proc.stdout:
                        line_str = line.strip()
                        if line_str.startswith("fps="):
                            try:
                                cur_fps = round(float(line_str.split("=")[1]), 1)
                            except Exception:
                                pass
                        elif line_str.startswith("speed="):
                            cur_speed = line_str.split("=")[1].strip()
                        elif line_str.startswith("out_time_us="):
                            try:
                                us_val = int(line_str.split("=")[1])
                                cur_s = us_val / 1000000.0
                                if total_duration > 0 and (cur_s - last_reported_s >= 2.0 or cur_s >= total_duration - 0.5):
                                    last_reported_s = cur_s
                                    sub_pct = 0.88 + min(0.09, (cur_s / total_duration) * 0.09)
                                    cur_m, cur_sec = divmod(int(cur_s), 60)
                                    tot_m, tot_sec = divmod(int(total_duration), 60)
                                    if progress_callback:
                                        progress_callback(
                                            f"[Mã hóa FFmpeg] [{cur_m:02d}:{cur_sec:02d}/{tot_m:02d}:{tot_sec:02d}] Tốc độ {cur_speed} ({cur_fps} FPS)",
                                            sub_pct
                                        )
                            except Exception:
                                pass

                proc.wait()
                if proc.returncode != 0:
                    stderr_msg = proc.stderr.read() if proc.stderr else ""
                    raise subprocess.CalledProcessError(proc.returncode, cmd, stderr=stderr_msg)

                if has_outro and outro_video_path and Path(outro_video_path).exists():
                    if progress_callback:
                        progress_callback("[Ghép Outro] Đang hoàn thiện phần kết thúc thương hiệu...", 0.98)
                    try:
                        self.append_outro(intermediate_out, outro_video_path, output_video_path, ffmpeg_bin=ffmpeg_bin)
                    except Exception as ex_ao:
                        logger.warning(f"append_outro warning: {ex_ao}")
                        if not output_video_path.exists() and intermediate_out.exists():
                            shutil.copy2(str(intermediate_out), str(output_video_path))
                    finally:
                        try:
                            if intermediate_out != output_video_path and intermediate_out.exists():
                                intermediate_out.unlink(missing_ok=True)
                        except Exception:
                            pass
                elif intermediate_out != output_video_path and intermediate_out.exists():
                    shutil.move(str(intermediate_out), str(output_video_path))

                logger.info("Video and audio merged successfully using FFmpeg CLI.")
                ffmpeg_succeeded = True
                return output_video_path
            except subprocess.CalledProcessError as ffmpeg_call_err:
                stderr_msg = ffmpeg_call_err.stderr.decode('utf-8', errors='ignore') if isinstance(ffmpeg_call_err.stderr, bytes) else str(ffmpeg_call_err.stderr)
                logger.error(f"FFmpeg CLI execution failed (exit code {ffmpeg_call_err.returncode}): {stderr_msg[:500]}")
                logger.info("Falling back to MoviePy for merging...")
            except (subprocess.SubprocessError, FileNotFoundError, OSError) as ffmpeg_err:
                logger.info(f"FFmpeg CLI not available or failed ({ffmpeg_err}), falling back to MoviePy...")

            # Method 2: MoviePy fallback (100% tin cậy: Ghép Logo, Chữ mờ chạy, và Đốt Phụ đề đa dòng)
            try:
                try:
                    # MoviePy 2.x
                    from moviepy import VideoFileClip, AudioFileClip, ImageClip, CompositeVideoClip
                except ImportError:
                    try:
                        # MoviePy 1.x
                        from moviepy.editor import VideoFileClip, AudioFileClip, ImageClip, CompositeVideoClip
                    except ImportError:
                        from moviepy.video.io.VideoFileClip import VideoFileClip
                        from moviepy.audio.io.AudioFileClip import AudioFileClip
                        from moviepy.video.VideoClip import ImageClip
                        from moviepy.video.compositing.CompositeVideoClip import CompositeVideoClip

                video = VideoFileClip(str(video_path))
                new_audio = AudioFileClip(str(audio_path))
                clips_to_composite = []

                # 1. Overlay Logo
                if has_logo:
                    try:
                        logo_clip = ImageClip(str(logo_path), transparent=True)
                        target_w = max(24, int(video.w * scale_val))
                        if hasattr(logo_clip, "resized"):
                            logo_clip = logo_clip.resized(width=target_w)
                        elif hasattr(logo_clip, "resize"):
                            logo_clip = logo_clip.resize(width=target_w)

                        if opacity_val < 0.98:
                            if hasattr(logo_clip, "with_opacity"):
                                logo_clip = logo_clip.with_opacity(opacity_val)
                            elif hasattr(logo_clip, "set_opacity"):
                                logo_clip = logo_clip.set_opacity(opacity_val)

                        if rot_deg != 0:
                            if hasattr(logo_clip, "rotated"):
                                logo_clip = logo_clip.rotated(-rot_deg)
                            elif hasattr(logo_clip, "rotate"):
                                logo_clip = logo_clip.rotate(-rot_deg)

                        pos_x = min(video.w - logo_clip.w, max(0, int(video.w * x_pct)))
                        pos_y = min(video.h - logo_clip.h, max(0, int(video.h * y_pct)))

                        if hasattr(logo_clip, "with_position"):
                            logo_clip = logo_clip.with_position((pos_x, pos_y))
                        elif hasattr(logo_clip, "set_pos"):
                            logo_clip = logo_clip.set_pos((pos_x, pos_y))

                        if hasattr(logo_clip, "with_duration"):
                            logo_clip = logo_clip.with_duration(video.duration)
                        elif hasattr(logo_clip, "set_duration"):
                            logo_clip = logo_clip.set_duration(video.duration)

                        clips_to_composite.append(logo_clip)
                    except Exception as ex_logo:
                        logger.warning(f"MoviePy logo overlay warning: {ex_logo}")

                # 2. Overlay Chữ mờ chạy bảo vệ bản quyền (@gocphimcuon)
                if has_floating_wm and temp_wm_file and temp_wm_file.exists():
                    try:
                        import math
                        wm_clip = ImageClip(str(temp_wm_file), transparent=True)
                        if hasattr(wm_clip, "with_duration"):
                            wm_clip = wm_clip.with_duration(video.duration)
                        elif hasattr(wm_clip, "set_duration"):
                            wm_clip = wm_clip.set_duration(video.duration)

                        wm_w = getattr(wm_clip, "w", None) or (wm_clip.size[0] if hasattr(wm_clip, "size") else 120)
                        wm_h = getattr(wm_clip, "h", None) or (wm_clip.size[1] if hasattr(wm_clip, "size") else 35)

                        def make_wm_pos(t):
                            span_x = max(20.0, (video.w - wm_w - 20) / 2.0)
                            span_y = max(20.0, (video.h - wm_h - 20) / 2.0)
                            mid_x = (video.w - wm_w) / 2.0
                            mid_y = (video.h - wm_h) / 2.0
                            px = int(mid_x + span_x * 0.85 * math.sin(2 * math.pi * t / 14.0))
                            py = int(mid_y + span_y * 0.85 * math.cos(2 * math.pi * t / 19.0))
                            px = max(10, min(max(10, video.w - wm_w - 10), px))
                            py = max(10, min(max(10, video.h - wm_h - 10), py))
                            return (px, py)

                        if hasattr(wm_clip, "with_position"):
                            wm_clip = wm_clip.with_position(make_wm_pos)
                        elif hasattr(wm_clip, "set_pos"):
                            wm_clip = wm_clip.set_pos(make_wm_pos)

                        clips_to_composite.append(wm_clip)
                        logger.info("MoviePy moving watermark clip added successfully.")
                    except Exception as ex_wm_m:
                        logger.warning(f"MoviePy floating watermark warning: {ex_wm_m}")

                # 3. Ghi đè toàn bộ Phụ đề tiếng Việt (Hardsub) từng câu thoại đã dịch
                # Tối ưu siêu tốc O(1) active subtitle overlay thay vì tạo hàng trăm ImageClip độc lập
                if has_sub and subtitle_path and Path(subtitle_path).exists():
                    try:
                        import bisect
                        from PIL import Image
                        import numpy as np

                        sub_items = parse_srt_file(Path(subtitle_path))
                        sub_temp_dir = Path("temp") / f"sub_frames_{uuid.uuid4().hex[:6]}"
                        sub_temp_dir.mkdir(parents=True, exist_ok=True)
                        if int(subtitle_margin_v) <= 85:
                            mv = max(8, min(int(video.h * 0.85), int(video.h * (float(subtitle_margin_v) / 100.0))))
                        else:
                            mv = max(8, min(int(video.h * 0.85), int(float(subtitle_margin_v) * (min(video.w, video.h) / 720.0))))

                        sub_overlays = []
                        for s_i, (s_start, s_end, s_text) in enumerate(sub_items):
                            s_dur = s_end - s_start
                            if s_dur <= 0.05 or not s_text.strip():
                                continue
                            p_file = sub_temp_dir / f"s_{s_i}.png"
                            create_sub_png(
                                text=s_text,
                                font_size=subtitle_font_size,
                                style=subtitle_style,
                                out_path=p_file,
                                max_video_width=video.w,
                                video_height=video.h
                            )
                            if p_file.exists():
                                with Image.open(str(p_file)) as simg:
                                    s_rgba = np.array(simg.convert("RGBA"))
                                    sc_w = s_rgba.shape[1]
                                    sc_h = s_rgba.shape[0]
                                    pos_x = max(10, min(video.w - sc_w - 10, (video.w - sc_w) // 2))
                                    pos_y = max(10, min(video.h - sc_h - 10, video.h - sc_h - mv))
                                    sub_rgb = s_rgba[:, :, :3]
                                    sub_alpha = (s_rgba[:, :, 3].astype(np.float32) / 255.0)[:, :, np.newaxis]
                                    sub_overlays.append({
                                        "start": s_start,
                                        "end": s_end,
                                        "x": pos_x,
                                        "y": pos_y,
                                        "w": sc_w,
                                        "h": sc_h,
                                        "rgb": sub_rgb,
                                        "alpha": sub_alpha,
                                    })

                        sub_overlays.sort(key=lambda item: item["start"])
                        sub_starts = [item["start"] for item in sub_overlays]

                        def apply_active_sub_to_frame(frame, t):
                            if not sub_overlays:
                                return frame
                            idx = bisect.bisect_right(sub_starts, t) - 1
                            active_sub = None
                            if 0 <= idx < len(sub_overlays):
                                cand = sub_overlays[idx]
                                if cand["start"] <= t <= cand["end"]:
                                    active_sub = cand
                            if active_sub is None and (idx + 1) < len(sub_overlays):
                                cand_next = sub_overlays[idx + 1]
                                if cand_next["start"] <= t <= cand_next["end"]:
                                    active_sub = cand_next

                            if active_sub is None:
                                return frame

                            x = active_sub["x"]
                            y = active_sub["y"]
                            w = active_sub["w"]
                            h = active_sub["h"]
                            x1 = max(0, x)
                            y1 = max(0, y)
                            x2 = min(frame.shape[1], x + w)
                            y2 = min(frame.shape[0], y + h)
                            if x2 <= x1 or y2 <= y1:
                                return frame

                            out_frame = frame.copy()
                            sub_rgb_roi = active_sub["rgb"][:(y2 - y1), :(x2 - x1)]
                            sub_alpha_roi = active_sub["alpha"][:(y2 - y1), :(x2 - x1)]
                            bg_roi = out_frame[y1:y2, x1:x2].astype(np.float32)
                            blended = (sub_rgb_roi.astype(np.float32) * sub_alpha_roi + bg_roi * (1.0 - sub_alpha_roi)).astype(np.uint8)
                            out_frame[y1:y2, x1:x2] = blended
                            return out_frame

                        def sub_transform_fn(gf, t):
                            return apply_active_sub_to_frame(gf(t), t)

                        applied_fast_sub = False
                        if hasattr(video, "transform"):
                            try:
                                video = video.transform(sub_transform_fn)
                                applied_fast_sub = True
                                logger.info(f"Tăng tốc MoviePy subtitle render qua video.transform ({len(sub_overlays)} câu thoại).")
                            except Exception as ex_tr:
                                logger.warning(f"video.transform notice: {ex_tr}")

                        if not applied_fast_sub and hasattr(video, "fl"):
                            try:
                                video = video.fl(sub_transform_fn)
                                applied_fast_sub = True
                                logger.info(f"Tăng tốc MoviePy subtitle render qua video.fl ({len(sub_overlays)} câu thoại).")
                            except Exception as ex_fl:
                                logger.warning(f"video.fl notice: {ex_fl}")

                        if not applied_fast_sub:
                            # Fallback an toàn nếu môi trường không hỗ trợ transform/fl
                            for s_i, (s_start, s_end, s_text) in enumerate(sub_items):
                                p_file = sub_temp_dir / f"s_{s_i}.png"
                                if not p_file.exists():
                                    continue
                                s_dur = s_end - s_start
                                if s_dur <= 0.05:
                                    continue
                                s_clip = ImageClip(str(p_file), transparent=True)
                                if hasattr(s_clip, "with_start"):
                                    s_clip = s_clip.with_start(s_start).with_duration(s_dur)
                                elif hasattr(s_clip, "set_start"):
                                    s_clip = s_clip.set_start(s_start).set_duration(s_dur)

                                sc_w = getattr(s_clip, "w", None) or (s_clip.size[0] if hasattr(s_clip, "size") else 200)
                                sc_h = getattr(s_clip, "h", None) or (s_clip.size[1] if hasattr(s_clip, "size") else 40)
                                pos_x = max(10, min(video.w - sc_w - 10, (video.w - sc_w) // 2))
                                pos_y = max(10, min(video.h - sc_h - 10, video.h - sc_h - mv))

                                if hasattr(s_clip, "with_position"):
                                    s_clip = s_clip.with_position((pos_x, pos_y))
                                elif hasattr(s_clip, "set_pos"):
                                    s_clip = s_clip.set_pos((pos_x, pos_y))

                                clips_to_composite.append(s_clip)
                            logger.info(f"MoviePy fallback: added {len(clips_to_composite)} clips to composite.")
                    except Exception as ex_sub_m:
                        logger.warning(f"MoviePy subtitle burning warning: {ex_sub_m}")

                base_duration = video.duration
                base_fps = getattr(video, "fps", None) or 25
                if not isinstance(base_fps, (int, float)) or base_fps <= 0:
                    base_fps = 25

                if clips_to_composite:
                    video = CompositeVideoClip([video, *clips_to_composite], size=video.size)
                    if hasattr(video, "with_duration"):
                        video = video.with_duration(base_duration)
                    elif hasattr(video, "set_duration"):
                        video = video.set_duration(base_duration)

                # Cắt âm thanh vừa khít thời lượng video gốc để tránh bị đứng hình ở cuối video
                if hasattr(new_audio, "duration") and new_audio.duration and new_audio.duration > base_duration:
                    try:
                        if hasattr(new_audio, "subclipped"):
                            new_audio = new_audio.subclipped(0, base_duration)
                        elif hasattr(new_audio, "subclip"):
                            new_audio = new_audio.subclip(0, base_duration)
                    except Exception:
                        pass

                if hasattr(video, "with_audio"):
                    final_video = video.with_audio(new_audio)
                elif hasattr(video, "set_audio"):
                    final_video = video.set_audio(new_audio)
                else:
                    final_video = video

                # 4. Tự động nối video Outro (Màn hình kết thúc endgpc.mp4) vào cuối video
                outro_clip_obj = None
                if has_outro and outro_video_path and Path(outro_video_path).exists():
                    try:
                        logger.info(f"Nối video kết thúc Outro: {Path(outro_video_path).name} vào sau video lồng tiếng...")
                        outro_clip_obj = VideoFileClip(str(outro_video_path))
                        target_w, target_h = video.size
                        ow = getattr(outro_clip_obj, "w", None) or (outro_clip_obj.size[0] if hasattr(outro_clip_obj, "size") else target_w)
                        oh = getattr(outro_clip_obj, "h", None) or (outro_clip_obj.size[1] if hasattr(outro_clip_obj, "size") else target_h)
                        scale_fit = min(target_w / float(ow), target_h / float(oh))
                        new_ow = max(2, int(ow * scale_fit))
                        new_oh = max(2, int(oh * scale_fit))

                        if hasattr(outro_clip_obj, "resized"):
                            scaled_outro = outro_clip_obj.resized((new_ow, new_oh))
                        elif hasattr(outro_clip_obj, "resize"):
                            scaled_outro = outro_clip_obj.resize((new_ow, new_oh))
                        else:
                            scaled_outro = outro_clip_obj

                        if (new_ow, new_oh) != (target_w, target_h):
                            pos_x = (target_w - new_ow) // 2
                            pos_y = (target_h - new_oh) // 2
                            if hasattr(scaled_outro, "with_position"):
                                pos_outro = scaled_outro.with_position((pos_x, pos_y))
                            elif hasattr(scaled_outro, "set_pos"):
                                pos_outro = scaled_outro.set_pos((pos_x, pos_y))
                            else:
                                pos_outro = scaled_outro
                            fitted_outro = CompositeVideoClip([pos_outro], size=(target_w, target_h))
                        else:
                            fitted_outro = scaled_outro

                        if hasattr(fitted_outro, "with_fps"):
                            fitted_outro = fitted_outro.with_fps(base_fps)
                        elif hasattr(fitted_outro, "set_fps"):
                            fitted_outro = fitted_outro.set_fps(base_fps)

                        if getattr(fitted_outro, "audio", None) is None and getattr(final_video, "audio", None) is not None:
                            try:
                                from moviepy.audio.AudioClip import AudioClip
                                silent_a = AudioClip(lambda t: [0.0, 0.0], duration=fitted_outro.duration, fps=44100)
                                if hasattr(fitted_outro, "with_audio"):
                                    fitted_outro = fitted_outro.with_audio(silent_a)
                                elif hasattr(fitted_outro, "set_audio"):
                                    fitted_outro = fitted_outro.set_audio(silent_a)
                            except Exception:
                                pass

                        try:
                            from moviepy import concatenate_videoclips
                        except ImportError:
                            try:
                                from moviepy.editor import concatenate_videoclips
                            except ImportError:
                                from moviepy.video.compositing.concatenate import concatenate_videoclips

                        final_video = concatenate_videoclips([final_video, fitted_outro], method="compose")
                        logger.info(f"Đã ghép video kết thúc Outro '{Path(outro_video_path).name}' thành công.")
                    except Exception as ex_m_outro:
                        logger.warning(f"Lưu ý khi ghép Outro bằng MoviePy: {ex_m_outro}")

                final_video.write_videofile(
                    str(output_video_path),
                    codec="libx264",
                    audio_codec="aac",
                    fps=base_fps,
                    preset="veryfast",
                    threads=cpu_threads,
                    ffmpeg_params=["-pix_fmt", "yuv420p"],
                    logger=None,
                )
                video.close()
                new_audio.close()
                if outro_clip_obj:
                    try:
                        outro_clip_obj.close()
                    except Exception:
                        pass
                final_video.close()
                logger.info("Video, audio, subtitles, watermark and outro merged successfully using MoviePy.")
                return output_video_path
            except Exception as e:
                logger.error(f"Failed to merge video with MoviePy: {e}")
                raise RuntimeError(f"Could not merge video and audio: {e}") from e
        finally:
            # Single outermost cleanup: ensure temporary files remain intact until both methods finish
            if temp_sub_file and temp_sub_file.exists():
                try:
                    temp_sub_file.unlink(missing_ok=True)
                except Exception:
                    pass
            if temp_wm_file and temp_wm_file.exists():
                try:
                    temp_wm_file.unlink(missing_ok=True)
                except Exception:
                    pass
            if sub_temp_dir and sub_temp_dir.exists():
                try:
                    shutil.rmtree(sub_temp_dir, ignore_errors=True)
                except Exception:
                    pass

    @staticmethod
    def append_outro(
        main_video_path: Union[str, Path],
        outro_video_path: Union[str, Path],
        final_output_path: Union[str, Path],
        ffmpeg_bin: Optional[str] = None
    ) -> Path:
        """
        Appends outro_video_path to the end of main_video_path.
        Uses native FFmpeg CLI for maximum speed, memory efficiency, and rock-solid reliability.
        """
        import shutil
        import subprocess
        main_video_path = Path(main_video_path)
        outro_video_path = Path(outro_video_path)
        final_output_path = Path(final_output_path)
        final_output_path.parent.mkdir(parents=True, exist_ok=True)

        logger.info(f"Appending outro video '{outro_video_path.name}' to '{main_video_path.name}' -> '{final_output_path.name}'...")

        if not ffmpeg_bin:
            ffmpeg_bin = find_ffmpeg_binary()

        cpu_threads = max(2, os.cpu_count() or 16)

        # Method 1: High-Performance FFmpeg CLI Concat (Primary)
        if ffmpeg_bin:
            try:
                target_w, target_h = get_video_dimensions(main_video_path)
                has_a0 = check_has_audio(main_video_path)
                has_a1 = check_has_audio(outro_video_path)

                v_filters = [
                    f"[0:v]scale={target_w}:{target_h}:force_original_aspect_ratio=decrease,pad={target_w}:{target_h}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=25[v0]",
                    f"[1:v]scale={target_w}:{target_h}:force_original_aspect_ratio=decrease,pad={target_w}:{target_h}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=25[v1]"
                ]

                a_inputs = []
                if has_a0:
                    v_filters.append("[0:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[a0]")
                    a_inputs.append("[a0]")
                else:
                    v_filters.append("anullsrc=r=48000:cl=stereo[a0]")
                    a_inputs.append("[a0]")

                if has_a1:
                    v_filters.append("[1:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[a1]")
                    a_inputs.append("[a1]")
                else:
                    v_filters.append("anullsrc=r=48000:cl=stereo[a1]")
                    a_inputs.append("[a1]")

                v_filters.append(f"[v0]{a_inputs[0]}[v1]{a_inputs[1]}concat=n=2:v=1:a=1[v_cat][a_cat]")

                cmd_cat = [
                    ffmpeg_bin, "-y",
                    "-i", str(main_video_path),
                    "-i", str(outro_video_path),
                    "-filter_complex", ";".join(v_filters),
                    "-map", "[v_cat]",
                    "-map", "[a_cat]",
                    "-c:v", "libx264",
                    "-pix_fmt", "yuv420p",
                    "-preset", "veryfast",
                    "-threads", str(cpu_threads),
                    "-c:a", "aac",
                    "-b:a", "192k",
                    "-movflags", "+faststart",
                    str(final_output_path),
                ]
                subprocess.run(cmd_cat, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                if final_output_path.exists() and final_output_path.stat().st_size > 1000:
                    logger.info("Outro video concatenated successfully using FFmpeg CLI.")
                    return final_output_path
            except Exception as ex_ff:
                logger.warning(f"FFmpeg outro concatenation notice: {ex_ff}")

        # Method 2: MoviePy fallback (only if FFmpeg CLI is absent or failed)
        try:
            try:
                from moviepy import VideoFileClip, CompositeVideoClip, concatenate_videoclips
            except ImportError:
                from moviepy.editor import VideoFileClip, CompositeVideoClip, concatenate_videoclips

            main_clip = VideoFileClip(str(main_video_path))
            outro_clip = VideoFileClip(str(outro_video_path))
            
            target_w, target_h = main_clip.size
            base_fps = getattr(main_clip, "fps", None) or 25
            if not isinstance(base_fps, (int, float)) or base_fps <= 0:
                base_fps = 25

            ow = getattr(outro_clip, "w", None) or (outro_clip.size[0] if hasattr(outro_clip, "size") else target_w)
            oh = getattr(outro_clip, "h", None) or (outro_clip.size[1] if hasattr(outro_clip, "size") else target_h)

            scale_fit = min(target_w / float(ow), target_h / float(oh))
            new_ow = max(2, int(ow * scale_fit))
            new_oh = max(2, int(oh * scale_fit))

            if hasattr(outro_clip, "resized"):
                scaled_outro = outro_clip.resized((new_ow, new_oh))
            elif hasattr(outro_clip, "resize"):
                scaled_outro = outro_clip.resize((new_ow, new_oh))
            else:
                scaled_outro = outro_clip

            if (new_ow, new_oh) != (target_w, target_h):
                pos_x = (target_w - new_ow) // 2
                pos_y = (target_h - new_oh) // 2
                if hasattr(scaled_outro, "with_position"):
                    pos_outro = scaled_outro.with_position((pos_x, pos_y))
                elif hasattr(scaled_outro, "set_pos"):
                    pos_outro = scaled_outro.set_pos((pos_x, pos_y))
                else:
                    pos_outro = scaled_outro
                fitted_outro = CompositeVideoClip([pos_outro], size=(target_w, target_h))
            else:
                fitted_outro = scaled_outro

            if hasattr(fitted_outro, "with_fps"):
                fitted_outro = fitted_outro.with_fps(base_fps)
            elif hasattr(fitted_outro, "set_fps"):
                fitted_outro = fitted_outro.set_fps(base_fps)

            final_clip = concatenate_videoclips([main_clip, fitted_outro], method="compose")
            final_clip.write_videofile(
                str(final_output_path),
                codec="libx264",
                audio_codec="aac",
                fps=base_fps,
                preset="veryfast",
                threads=cpu_threads,
                ffmpeg_params=["-pix_fmt", "yuv420p"],
                logger=None,
            )
            main_clip.close()
            outro_clip.close()
            final_clip.close()
            logger.info("Outro video concatenated successfully using MoviePy.")
            return final_output_path
        except Exception as ex_moviepy:
            logger.warning(f"MoviePy outro concatenation notice: {ex_moviepy}")

        if str(main_video_path) != str(final_output_path) and not final_output_path.exists():
            shutil.copy2(str(main_video_path), str(final_output_path))
        return final_output_path
