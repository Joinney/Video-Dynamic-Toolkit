"""
Text-to-Speech (TTS) module supporting Microsoft Edge-TTS and VieNeu-TTS (Adam Tốp Tốp)
"""
import asyncio
import logging
from pathlib import Path
from typing import List
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
        from pydub import AudioSegment
        try:
            from .vieneu_tts import enhance_vocal
        except ImportError:
            from vieneu_tts import enhance_vocal

        output_file.parent.mkdir(parents=True, exist_ok=True)
        communicate = edge_tts.Communicate(
            text=text,
            voice=voice,
            rate=rate,
            volume=volume,
        )
        # Tạm lưu raw audio để convert sang chuẩn studio WAV 48kHz
        raw_tmp = output_file.with_suffix(".raw.mp3")
        try:
            await communicate.save(str(raw_tmp))
            if raw_tmp.exists() and raw_tmp.stat().st_size > 300:
                snd = AudioSegment.from_file(str(raw_tmp))
                snd = enhance_vocal(snd, voice_name=voice, deep_warmth=True)
                snd.export(str(output_file), format="wav")
                return True
        except Exception as e_master:
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
                audio_file = output_dir / f"seg_{seg.id:04d}.wav"
                generate_vieneu_speech(text, voice=clean_voice, output_path=audio_file)
                seg.tts_audio_path = str(audio_file)
                if progress_callback:
                    sub_pct = 0.50 + min(0.25, ((idx + 1) / tot_segs) * 0.25)
                    snip = text.replace('"', '')[:30]
                    progress_callback(
                        f"[Lồng tiếng AI] [{idx+1}/{tot_segs}] Tạo giọng đọc ({clean_voice}): \"{snip}...\"",
                        sub_pct
                    )
        else:
            # Edge TTS (Async concurrent with progressive callback per sentence)
            async def run_edge_batch():
                done_count = 0
                async def wrapped_gen(seg_item):
                    nonlocal done_count
                    t_val = seg_item.translated_text.strip() or seg_item.text.strip()
                    if not t_val:
                        return
                    out_f = output_dir / f"seg_{seg_item.id:04d}.wav"
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
                        snip = t_val.replace('"', '')[:30]
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
