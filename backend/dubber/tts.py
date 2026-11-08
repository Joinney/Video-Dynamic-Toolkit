"""
Text-to-Speech (TTS) module supporting Microsoft Edge-TTS and VieNeu-TTS (Adam Tốp Tốp)
"""
import asyncio
import logging
from pathlib import Path
from typing import List, Optional
try:
    from .transcriber import Segment
except ImportError:
    from transcriber import Segment

logger = logging.getLogger(__name__)


class TTSService:
    def __init__(
        self,
        voice: str = "vieneu:Adam",
        rate: str = "+0%",
        volume: str = "+0%",
    ):
        self.voice = voice
        self.rate = rate
        self.volume = volume

    async def _generate_single_audio_edge(
        self,
        text: str,
        output_file: Path,
        voice: str,
        rate: str,
        volume: str,
    ) -> bool:
        import edge_tts
        import re
        from pydub import AudioSegment
        try:
            from .vieneu_tts import enhance_vocal
        except ImportError:
            from vieneu_tts import enhance_vocal

        output_file.parent.mkdir(parents=True, exist_ok=True)
        raw_tmp = output_file.with_suffix(".raw.mp3")

        clean_text = re.sub(r'[\r\n\t]+', ' ', text).strip()
        clean_text = re.sub(r'[-—–_]{2,}', ' ', clean_text).strip()
        if not clean_text:
            return False

        # Thử lại tối đa 3 lần với backoff và đổi giọng dự phòng nếu cần
        candidate_voices = [voice]
        if "HoaiMy" in voice:
            candidate_voices.append("vi-VN-NamMinhNeural")
        elif "NamMinh" in voice:
            candidate_voices.append("vi-VN-HoaiMyNeural")
        else:
            candidate_voices.append("vi-VN-HoaiMyNeural")

        for attempt in range(3):
            cur_voice = candidate_voices[0] if attempt < 2 else candidate_voices[-1]
            try:
                communicate = edge_tts.Communicate(
                    text=clean_text,
                    voice=cur_voice,
                    rate=rate,
                    volume=volume,
                )
                await asyncio.wait_for(communicate.save(str(raw_tmp)), timeout=20.0)
                if raw_tmp.exists() and raw_tmp.stat().st_size > 150:
                    converted = False
                    try:
                        snd = AudioSegment.from_file(str(raw_tmp))
                        try:
                            snd = enhance_vocal(snd, voice_name=cur_voice, deep_warmth=True)
                        except Exception as e_enh:
                            logger.debug(f"enhance_vocal note: {e_enh}")
                        snd.export(str(output_file), format="wav")
                        converted = True
                    except Exception as e_pydub:
                        logger.warning(f"pydub audio conversion failed: {e_pydub}, trying direct ffmpeg...")
                        import subprocess
                        ret = subprocess.run(["ffmpeg", "-y", "-i", str(raw_tmp), str(output_file)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                        converted = (ret.returncode == 0 and output_file.exists() and output_file.stat().st_size > 150)
                    if converted:
                        return True
            except Exception as e_master:
                if attempt < 2:
                    await asyncio.sleep(0.4 * (attempt + 1))
                    continue
                logger.warning(f"Edge TTS processing note: {e_master}")
            finally:
                if raw_tmp.exists():
                    try:
                        raw_tmp.unlink(missing_ok=True)
                    except Exception:
                        pass
        return False

    def generate_speech_for_segments(
        self,
        segments: List[Segment],
        output_dir: Path,
        progress_callback: Optional[object] = None,
    ) -> List[Segment]:
        output_dir.mkdir(parents=True, exist_ok=True)

        is_vieneu = self.voice.startswith("vieneu:") or (not self.voice.endswith("Neural") and "Neural" not in self.voice)
        engine_label = "VieNeu-TTS" if is_vieneu else "Edge-TTS"
        tot_segs = max(1, len(segments))

        logger.info(
            f"Generating TTS speech for {len(segments)} segments using voice: {self.voice} (Engine: {engine_label})..."
        )
        if progress_callback:
            progress_callback(f"[Lồng tiếng AI] Khởi tạo bộ sinh giọng đọc {engine_label} ({len(segments)} câu)...", 0.50)

        if is_vieneu:
            try:
                from .vieneu_tts import generate_vieneu_speech
            except ImportError:
                from vieneu_tts import generate_vieneu_speech
            clean_voice = self.voice.replace("vieneu:", "")

            for idx, seg in enumerate(segments):
                text = seg.translated_text.strip() or seg.text.strip()
                if not text:
                    continue
                snip = text.replace('"', '')[:30]
                cur_pct = 0.50 + min(0.24, (idx / tot_segs) * 0.24)
                if progress_callback:
                    progress_callback(
                        f"[Lồng tiếng AI] [{idx+1}/{tot_segs}] Đang tạo giọng ({clean_voice}): \"{snip}...\"",
                        cur_pct
                    )
                audio_file = output_dir / f"seg_{seg.id:04d}.wav"
                try:
                    generate_vieneu_speech(text, voice=clean_voice, output_path=audio_file)
                except Exception as vn_err:
                    logger.warning(f"VieNeu TTS note on seg {seg.id}: {vn_err}, trying fallback...")
                    try:
                        loop_fb = asyncio.new_event_loop()
                        loop_fb.run_until_complete(self._generate_single_audio_edge(text, audio_file, voice="vi-VN-HoaiMyNeural", rate=self.rate, volume=self.volume))
                        loop_fb.close()
                    except Exception:
                        pass

                if audio_file.exists() and audio_file.stat().st_size > 150:
                    seg.tts_audio_path = str(audio_file)
                else:
                    seg.tts_audio_path = None
                if progress_callback:
                    done_pct = 0.50 + min(0.25, ((idx + 1) / tot_segs) * 0.25)
                    progress_callback(
                        f"[Lồng tiếng AI] [{idx+1}/{tot_segs}] Hoàn thành câu: \"{snip}...\"",
                        done_pct
                    )
        else:
            # Edge TTS with Semaphore concurrency limiter (max 3 at once) to prevent rate limits
            async def run_edge_batch():
                done_count = 0
                sem = asyncio.Semaphore(3)

                async def wrapped_gen(seg_item):
                    nonlocal done_count
                    t_val = seg_item.translated_text.strip() or seg_item.text.strip()
                    if not t_val:
                        return
                    out_f = output_dir / f"seg_{seg_item.id:04d}.wav"
                    snip = t_val.replace('"', '')[:30]
                    async with sem:
                        await self._generate_single_audio_edge(
                            text=t_val,
                            output_file=out_f,
                            voice=self.voice,
                            rate=self.rate,
                            volume=self.volume,
                        )
                    done_count += 1
                    if progress_callback:
                        sub_pct = 0.50 + min(0.25, (done_count / tot_segs) * 0.25)
                        progress_callback(
                            f"[Lồng tiếng AI] [{done_count}/{tot_segs}] Tạo giọng đọc: \"{snip}...\"",
                            sub_pct
                        )

                tasks = [wrapped_gen(seg) for seg in segments if (seg.translated_text.strip() or seg.text.strip())]
                await asyncio.gather(*tasks, return_exceptions=True)

                # Chỉ gán tts_audio_path cho các tệp WAV thực sự sinh thành công
                for seg in segments:
                    a_file = output_dir / f"seg_{seg.id:04d}.wav"
                    if a_file.exists() and a_file.stat().st_size > 500:
                        seg.tts_audio_path = str(a_file)
                    else:
                        seg.tts_audio_path = None

            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    import nest_asyncio
                    nest_asyncio.apply()
                    loop.run_until_complete(run_edge_batch())
                else:
                    loop.run_until_complete(run_edge_batch())
            except RuntimeError:
                asyncio.run(run_edge_batch())

        logger.info("Speech generation finished.")
        return segments

    def generate_speech(
        self,
        segments: List[Segment],
        output_dir: Path,
        progress_callback: Optional[object] = None,
    ) -> List[Segment]:
        return self.generate_speech_for_segments(segments, output_dir, progress_callback=progress_callback)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description="Generate TTS audio file")
    parser.add_argument("--text", required=True, help="Text to convert to speech")
    parser.add_argument("--voice", default="vi-VN-HoaiMyNeural", help="Voice model")
    parser.add_argument("--rate", default="+0%", help="Rate speed")
    parser.add_argument("--volume", default="+0%", help="Volume")
    parser.add_argument("--output", required=True, help="Output file path")
    args = parser.parse_args()

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    if args.voice.startswith("vieneu:"):
        try:
            from vieneu_tts import VieNeuTTS
        except ImportError:
            from .vieneu_tts import VieNeuTTS
        vtts = VieNeuTTS()
        vtts.generate_speech(args.text, out_path, voice=args.voice.split(":", 1)[1])
    else:
        async def run_edge():
            import edge_tts
            from pydub import AudioSegment
            try:
                from .vieneu_tts import enhance_vocal
            except ImportError:
                from vieneu_tts import enhance_vocal
            raw_tmp = out_path.with_suffix(".raw.mp3")
            communicate = edge_tts.Communicate(text=args.text, voice=args.voice, rate=args.rate, volume=args.volume)
            await communicate.save(str(raw_tmp))
            if raw_tmp.exists() and raw_tmp.stat().st_size > 0:
                try:
                    snd = AudioSegment.from_file(str(raw_tmp))
                    snd = enhance_vocal(snd, voice_name=args.voice, deep_warmth=True)
                    fmt = "mp3" if out_path.suffix.lower() == ".mp3" else "wav"
                    snd.export(str(out_path), format=fmt)
                except Exception:
                    if raw_tmp != out_path:
                        import shutil
                        shutil.copy2(str(raw_tmp), str(out_path))
                if raw_tmp.exists() and raw_tmp != out_path:
                    raw_tmp.unlink(missing_ok=True)
        asyncio.run(run_edge())

