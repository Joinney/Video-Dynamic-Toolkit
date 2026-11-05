#!/usr/bin/env python3
"""
AI Video Dubbing Engine for Soda Reels & MinuteDrama
Tự động tách âm -> Nhận diện giọng nói (Whisper) -> Dịch sang Tiếng Việt -> Lồng tiếng AI (Edge-TTS) -> Ghép Video
"""

import sys
import os
import json
import argparse
import asyncio
import subprocess
from pathlib import Path
import tempfile
import edge_tts
from deep_translator import GoogleTranslator

def emit_progress(status, pct, message, extra=None):
    payload = {
        "status": status,
        "pct": int(pct),
        "message": message
    }
    if extra:
        payload.update(extra)
    print(f"__PROGRESS__{json.dumps(payload, ensure_ascii=False)}__PROGRESS__", flush=True)

async def generate_speech_edge(text, voice, output_path, speed="+0%"):
    communicate = edge_tts.Communicate(text, voice, rate=speed)
    await communicate.save(output_path)

def run_dubbing(input_video, output_video, voice="vi-VN-HoaiMyNeural", speed="+0%", orig_volume=0.15, whisper_model_size="base"):
    input_path = Path(input_video).resolve()
    if not input_path.exists():
        emit_progress("error", 0, f"File video đầu vào không tồn tại: {input_video}")
        return False

    out_path = Path(output_video).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_dir = Path(tmpdir)
        extracted_audio = tmp_dir / "extracted_audio.wav"

        # 1. Tách âm thanh từ video
        emit_progress("extracting", 10, "Đang trích xuất âm thanh gốc từ video...")
        cmd_extract = [
            "ffmpeg", "-y", "-i", str(input_path),
            "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
            str(extracted_audio)
        ]
        ret = subprocess.run(cmd_extract, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if ret.returncode != 0:
            emit_progress("error", 0, "Lỗi khi trích xuất âm thanh từ video bằng ffmpeg!")
            return False

        # 2. Nhận diện giọng nói với Whisper
        emit_progress("transcribing", 25, f"Đang nhận diện giọng nói bằng AI Whisper ({whisper_model_size})...")
        try:
            from faster_whisper import WhisperModel
            # Chạy CPU hoặc GPU nếu có
            device = "cuda" if os.environ.get("USE_CUDA") == "1" else "cpu"
            compute_type = "float16" if device == "cuda" else "int8"
            model = WhisperModel(whisper_model_size, device=device, compute_type=compute_type)
            segments, info = model.transcribe(str(extracted_audio), beam_size=5)
            
            raw_segments = []
            for seg in segments:
                text = seg.text.strip()
                if text:
                    raw_segments.append({
                        "start": seg.start,
                        "end": seg.end,
                        "text": text
                    })
        except Exception as e:
            emit_progress("error", 0, f"Lỗi khi nhận diện giọng nói: {str(e)}")
            return False

        if not raw_segments:
            emit_progress("error", 0, "Không nhận diện được giọng nói trong video này (hoặc video không có lời thoại)!")
            return False

        detected_lang = info.language if 'info' in locals() else "unknown"
        emit_progress("transcribed", 45, f"Đã nhận diện {len(raw_segments)} câu thoại (Ngôn ngữ gốc: {detected_lang})")

        # 3. Dịch thuật sang Tiếng Việt
        emit_progress("translating", 50, f"Đang dịch {len(raw_segments)} câu sang tiếng Việt...")
        translator = GoogleTranslator(source='auto', target='vi')
        
        translated_segments = []
        for idx, seg in enumerate(raw_segments):
            try:
                vi_text = translator.translate(seg["text"])
                translated_segments.append({
                    "start": seg["start"],
                    "end": seg["end"],
                    "orig_text": seg["text"],
                    "vi_text": vi_text
                })
            except Exception as tr_err:
                translated_segments.append({
                    "start": seg["start"],
                    "end": seg["end"],
                    "orig_text": seg["text"],
                    "vi_text": seg["text"]
                })
            pct = 50 + int((idx + 1) / len(raw_segments) * 20)
            if (idx + 1) % 5 == 0 or idx == len(raw_segments) - 1:
                emit_progress("translating", pct, f"Đang dịch câu {idx + 1}/{len(raw_segments)}...")

        # 4. Lồng tiếng AI (TTS Edge-TTS)
        emit_progress("generating_tts", 72, f"Đang tạo giọng đọc AI tiếng Việt ({voice})...")
        tts_dir = tmp_dir / "tts_clips"
        tts_dir.mkdir(parents=True, exist_ok=True)

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

        # 5. Ghép các đoạn thoại vào đúng mốc thời gian (Audio Timeline)
        emit_progress("mixing", 85, "Đang khớp âm thanh lồng tiếng theo đúng mốc thời gian...")
        from pydub import AudioSegment

        # Đọc độ dài audio gốc
        orig_audio_seg = AudioSegment.from_wav(str(extracted_audio))
        total_duration_ms = len(orig_audio_seg)

        # Tạo track lồng tiếng tĩnh (silence)
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

        # 6. Trộn nhạc nền gốc (ducking) + Giọng đọc AI + Video
        emit_progress("merging", 92, "Đang hòa trộn âm thanh & xuất bản video lồng tiếng...")
        
        # Lệnh FFmpeg trộn âm thanh:
        # [0:a] âm lượng gốc giảm xuống orig_volume
        # [1:a] giọng đọc lồng tiếng giữ nguyên 1.0 (hoặc tăng nhẹ 1.2)
        # amix trộn 2 track âm thanh lại
        cmd_merge = [
            "ffmpeg", "-y",
            "-i", str(input_path),
            "-i", str(dub_audio_wav),
            "-filter_complex",
            f"[0:a]volume={orig_volume}[orig_bg];[1:a]volume=1.25[dub_fg];[orig_bg][dub_fg]amix=inputs=2:duration=first:dropout_transition=2[aout]",
            "-map", "0:v",
            "-map", "[aout]",
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            str(out_path)
        ]

        ret_merge = subprocess.run(cmd_merge, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if ret_merge.returncode != 0:
            # Fallback nếu copy video gặp trục trặc: Re-encode nhẹ video
            cmd_fallback = [
                "ffmpeg", "-y",
                "-i", str(input_path),
                "-i", str(dub_audio_wav),
                "-filter_complex",
                f"[0:a]volume={orig_volume}[orig_bg];[1:a]volume=1.25[dub_fg];[orig_bg][dub_fg]amix=inputs=2:duration=first:dropout_transition=2[aout]",
                "-map", "0:v",
                "-map", "[aout]",
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "22",
                "-c:a", "aac",
                "-b:a", "192k",
                str(out_path)
            ]
            ret_fallback = subprocess.run(cmd_fallback, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if ret_fallback.returncode != 0:
                emit_progress("error", 0, "Lỗi khi ghép âm thanh và video bằng ffmpeg!")
                return False

        # Xuất file phụ đề .srt tiếng Việt chuẩn StudioVDT
        srt_file = out_path.with_suffix(".srt")
        try:
            with open(srt_file, "w", encoding="utf-8") as f:
                for i, seg in enumerate(translated_segments, 1):
                    s_ms = int((seg["start"] % 1) * 1000)
                    s_s = int(seg["start"])
                    e_ms = int((seg["end"] % 1) * 1000)
                    e_s = int(seg["end"])
                    s_str = f"{s_s//3600:02d}:{(s_s%3600)//60:02d}:{s_s%60:02d},{s_ms:03d}"
                    e_str = f"{e_s//3600:02d}:{(e_s%3600)//60:02d}:{e_s%60:02d},{e_ms:03d}"
                    f.write(f"{i}\n{s_str} --> {e_str}\n{seg['vi_text']}\n\n")
        except Exception as srt_err:
            pass

        emit_progress("completed", 100, f"Lồng tiếng hoàn tất! Đã lưu video thành công.", extra={
            "outputPath": str(out_path),
            "srtPath": str(srt_file) if srt_file.exists() else None,
            "filename": out_path.name
        })
        return True

def main():
    parser = argparse.ArgumentParser(description="AI Video Dubber for Short Dramas")
    parser.add_argument("--input", required=True, help="Đường dẫn file video đầu vào (.mp4)")
    parser.add_argument("--output", required=True, help="Đường dẫn file video xuất ra (.mp4)")
    parser.add_argument("--voice", default="vi-VN-HoaiMyNeural", help="Giọng đọc Edge-TTS (vi-VN-HoaiMyNeural hoặc vi-VN-NamMinhNeural)")
    parser.add_argument("--speed", default="+0%", help="Tốc độ đọc (+0%, +10%, +20%)")
    parser.add_argument("--orig-vol", type=float, default=0.15, help="Âm lượng video gốc (0.1 đến 0.3)")
    parser.add_argument("--whisper-model", default="base", help="Model Whisper (tiny, base, small)")

    args = parser.parse_args()
    success = run_dubbing(
        args.input,
        args.output,
        voice=args.voice,
        speed=args.speed,
        orig_volume=args.orig_vol,
        whisper_model_size=args.whisper_model
    )
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
