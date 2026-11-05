#!/usr/bin/env python3
"""
Quick Transcribe & Translate Subtitles Engine
Trích xuất giọng nói và dịch phụ đề trước khi lồng tiếng bằng faster-whisper và Google Translate
"""
import sys
import os
import json
import argparse
import subprocess
from pathlib import Path

# Add current directory to sys.path
sys.path.insert(0, str(Path(__file__).parent.resolve()))

def extract_audio_wav(video_path: Path, output_wav: Path):
    """Trích xuất âm thanh 16kHz mono WAV cho Whisper nhận diện nhanh nhất"""
    cmd = [
        "ffmpeg", "-y", "-i", str(video_path),
        "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        str(output_wav)
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

def main():
    parser = argparse.ArgumentParser(description="Quick Transcribe & Translate Subtitles")
    parser.add_argument("--input", required=True, help="Đường dẫn file video đầu vào")
    parser.add_argument("--source-lang", default="auto", help="Ngôn ngữ gốc (auto, zh, en, ja, ko...)")
    parser.add_argument("--target-lang", default="vi", help="Ngôn ngữ dịch phụ đề (vi)")
    parser.add_argument("--whisper-model", default="base", help="Kích thước mô hình Whisper (tiny, base, small)")
    parser.add_argument("--output", help="Đường dẫn file JSON lưu kết quả")

    args = parser.parse_args()
    input_file = Path(args.input).resolve()

    if not input_file.exists():
        print(f"Lỗi: Không tìm thấy video {input_file}", file=sys.stderr)
        sys.exit(1)

    temp_dir = Path("./.temp_preview")
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_wav = temp_dir / f"quick_audio_{input_file.stem}_{int(os.getpid())}.wav"

    try:
        # 1. Trích xuất âm thanh
        extract_audio_wav(input_file, temp_wav)

        # 2. Nhận diện giọng nói
        from transcriber import Transcriber
        w_device = "cpu"
        try:
            import torch
            if torch.cuda.is_available():
                w_device = "cuda"
        except Exception:
            pass

        src_lang = None if args.source_lang == "auto" else args.source_lang
        transcriber = Transcriber(model_size=args.whisper_model, device=w_device)
        segments, detected_lang = transcriber.transcribe(temp_wav, language=src_lang)

        # 3. Dịch sang ngôn ngữ đích (Tiếng Việt)
        from translator import Translator
        translator = Translator(target_lang=args.target_lang, source_lang=detected_lang)
        translated_segments = translator.translate_segments(segments)

        res_list = []
        for i, seg in enumerate(translated_segments, 1):
            text_val = str(getattr(seg, "translated_text", "") or getattr(seg, "text", "")).strip()
            orig_val = str(getattr(seg, "text", "")).strip()
            res_list.append({
                "id": getattr(seg, "id", i),
                "start": round(float(seg.start), 2),
                "end": round(float(seg.end), 2),
                "text": text_val,
                "original_text": orig_val
            })

        output_data = {
            "success": True,
            "detected_language": detected_lang,
            "total_segments": len(res_list),
            "segments": res_list
        }

        # Lưu file nếu có --output
        if args.output:
            out_json = Path(args.output).resolve()
            out_json.parent.mkdir(parents=True, exist_ok=True)
            with open(out_json, "w", encoding="utf-8") as f:
                json.dump(output_data, f, ensure_ascii=False, indent=2)

        # In kết quả dạng JSON marker
        json_str = json.dumps(output_data, ensure_ascii=False)
        print(f"__TRANSCRIBE_RESULT__{json_str}__TRANSCRIBE_RESULT__")
        sys.exit(0)

    except Exception as e:
        print(f"Lỗi nhận diện / dịch phụ đề: {str(e)}", file=sys.stderr)
        sys.exit(1)
    finally:
        if temp_wav.exists():
            try:
                temp_wav.unlink(missing_ok=True)
            except Exception:
                pass

if __name__ == "__main__":
    main()
