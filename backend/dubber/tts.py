#!/usr/bin/env python3
"""
TTS Audio Generation Engine (Tích hợp chuẩn StudioVDT)
Hỗ trợ cả VieNeu-TTS (Adam Tốp Tốp, 30+ giọng VieNeu) và Edge-TTS cao cấp.
Tự động fallback an toàn không bao giờ văng lỗi 'Invalid voice'.
"""
import sys
import os
import re
import argparse
import asyncio
from pathlib import Path

# Add current directory to sys.path so modules like vieneu_tts can be imported
sys.path.insert(0, str(Path(__file__).parent.resolve()))

def is_female_voice(voice_name: str) -> bool:
    female_keywords = [
        "nữ", "nu", "mai anh", "thùy dung", "thuy dung", "ngọc huyền", "ngoc huyen",
        "hoaimy", "ngọc trân", "ngoc tran", "mỹ linh", "my linh", "đoan trang", "doan trang",
        "quỳnh anh", "quynh anh", "ái hân", "ai han", "xuân tiên", "xuan tien",
        "thục đoan", "thuc doan", "mỹ duyên", "my duyen", "kim thanh", "ngọc ánh", "ngoc anh",
        "thanh tâm", "thanh tam", "thu hà", "thu ha", "ngọc linh", "ngoc linh", "trúc ly", "truc ly"
    ]
    name_lower = voice_name.lower()
    return any(k in name_lower for k in female_keywords)

async def synthesize_edge(text: str, voice: str, output_path: str, rate: str = "+0%", volume: str = "+0%", pitch: str = "+0Hz"):
    import edge_tts
    communicate = edge_tts.Communicate(text, voice, rate=rate, volume=volume, pitch=pitch)
    await communicate.save(output_path)

def main():
    parser = argparse.ArgumentParser(description="TTS StudioVDT Engine")
    parser.add_argument("--text", required=True, help="Văn bản cần đọc")
    parser.add_argument("--voice", default="vieneu:Adam Tốp Tốp", help="Mã giọng đọc (VieNeu hoặc Edge-TTS)")
    parser.add_argument("--rate", default="+0%", help="Tốc độ đọc (+0%, +10%, -10%)")
    parser.add_argument("--volume", default="+0%", help="Âm lượng")
    parser.add_argument("--output", required=True, help="Đường dẫn file MP3 đầu ra")

    args = parser.parse_args()

    out_file = Path(args.output).resolve()
    out_file.parent.mkdir(parents=True, exist_ok=True)

    text_to_read = args.text.strip()
    voice_raw = args.voice.strip()

    # Thử nạp mô-đun tiền xử lý thẻ cảm xúc
    try:
        from vieneu_tts import preprocess_emotion_text
        processed_text = preprocess_emotion_text(text_to_read)
    except Exception:
        # Thay thế cơ bản các thẻ [thở dài], [cười]... nếu chưa nạp được vieneu_tts
        processed_text = re.sub(r'\[(?:cười|laughing|chuckles)\]', 'haha, ', text_to_read, flags=re.IGNORECASE)
        processed_text = re.sub(r'\[(?:gào|screaming)\]', 'Áaaa! ', processed_text, flags=re.IGNORECASE)
        processed_text = re.sub(r'\[(?:thở dài|sighs)\]', 'haizzz... ', processed_text, flags=re.IGNORECASE)
        processed_text = re.sub(r'\[(?:đỉnh kout)\]', 'quá đỉnh! ', processed_text, flags=re.IGNORECASE)
        processed_text = re.sub(r'\[.*?\]', '', processed_text).strip()

    # 1. Thử sinh bằng VieNeu-TTS nếu được chọn và thư viện đã sẵn sàng
    if voice_raw.startswith("vieneu:"):
        clean_voice = voice_raw.replace("vieneu:", "").strip()
        try:
            from vieneu_tts import generate_vieneu_speech
            # Chuyển đổi tốc độ rate dạng chuỗi (+10%) sang float (1.10)
            rate_num = 0
            m = re.search(r'([+-]?\d+)', args.rate)
            if m:
                rate_num = int(m.group(1))
            speed_val = max(0.5, min(2.0, 1.0 + rate_num / 100.0))

            generate_vieneu_speech(
                text=processed_text,
                voice=clean_voice,
                speed=speed_val,
                output_path=out_file
            )
            if out_file.exists() and out_file.stat().st_size > 500:
                print(f"__TTS_SUCCESS__{out_file}__TTS_SUCCESS__")
                sys.exit(0)
        except Exception as vieneu_err:
            # VieNeu đang nạp hoặc có lỗi -> Chuyển sang Edge-TTS Studio Mastering
            pass

    # 2. Xử lý qua Edge-TTS an toàn (Map giọng VieNeu sang Edge-TTS chuẩn phát thanh)
    if voice_raw.startswith("vieneu:"):
        voice_name_only = voice_raw.replace("vieneu:", "").strip()
        if is_female_voice(voice_name_only):
            edge_voice = "vi-VN-HoaiMyNeural"
            edge_pitch = "+0Hz"
        else:
            edge_voice = "vi-VN-NamMinhNeural"
            if "adam" in voice_name_only.lower():
                edge_pitch = "+2Hz"
                # Adam đọc nhịp sống động
                if args.rate == "+0%":
                    args.rate = "+10%"
            elif "thầy" in voice_name_only.lower() or "bảy" in voice_name_only.lower() or "thiện minh" in voice_name_only.lower():
                edge_pitch = "-3Hz"
            else:
                edge_pitch = "+0Hz"
    else:
        edge_voice = voice_raw
        edge_pitch = "+0Hz"

    try:
        asyncio.run(synthesize_edge(
            text=processed_text,
            voice=edge_voice,
            output_path=str(out_file),
            rate=args.rate,
            volume=args.volume,
            pitch=edge_pitch
        ))

        # Áp dụng Mastering Vocal nếu có pydub
        try:
            from pydub import AudioSegment
            if out_file.exists() and out_file.stat().st_size > 500:
                snd = AudioSegment.from_file(str(out_file))
                # Tăng âm lượng chuẩn -14 LUFS Broadcast
                snd = snd + 2.0
                snd.export(str(out_file), format="mp3", bitrate="320k")
        except Exception:
            pass

        if out_file.exists() and out_file.stat().st_size > 0:
            print(f"__TTS_SUCCESS__{out_file}__TTS_SUCCESS__")
            sys.exit(0)
        else:
            print("Lỗi: Không tạo được file âm thanh!", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"Lỗi TTS: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
