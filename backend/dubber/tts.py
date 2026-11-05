#!/usr/bin/env python3
"""
TTS Audio Generation Engine (Tích hợp từ StudioVDT)
Chuyển đổi văn bản kịch bản thành giọng nói AI bằng Edge-TTS
"""
import sys
import os
import argparse
import asyncio
from pathlib import Path
import edge_tts

async def synthesize(text, voice, output_path, rate="+0%", volume="+0%"):
    communicate = edge_tts.Communicate(text, voice, rate=rate, volume=volume)
    await communicate.save(output_path)

def main():
    parser = argparse.ArgumentParser(description="TTS StudioVDT Engine")
    parser.add_argument("--text", required=True, help="Văn bản cần đọc")
    parser.add_argument("--voice", default="vi-VN-HoaiMyNeural", help="Mã giọng đọc (Edge-TTS)")
    parser.add_argument("--rate", default="+0%", help="Tốc độ đọc (+0%, +10%, -10%)")
    parser.add_argument("--volume", default="+0%", help="Âm lượng")
    parser.add_argument("--output", required=True, help="Đường dẫn file MP3 đầu ra")

    args = parser.parse_args()

    out_file = Path(args.output).resolve()
    out_file.parent.mkdir(parents=True, exist_ok=True)

    try:
        asyncio.run(synthesize(args.text, args.voice, str(out_file), args.rate, args.volume))
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
