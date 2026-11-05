"""
Text-to-Speech (TTS) module supporting Microsoft Edge-TTS and VieNeu-TTS (Adam Tốp Tốp)
"""
import asyncio
import logging
from pathlib import Path
from typing import List
from .transcriber import Segment

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
        from .vieneu_tts import enhance_vocal

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
    ) -> List[Segment]:
        output_dir.mkdir(parents=True, exist_ok=True)

        is_vieneu = self.voice.startswith("vieneu:") or (not self.voice.endswith("Neural") and "Neural" not in self.voice)

        logger.info(
            f"Generating TTS speech for {len(segments)} segments using voice: {self.voice} (Engine: {'VieNeu-TTS' if is_vieneu else 'Edge-TTS'})..."
        )

        if is_vieneu:
            from .vieneu_tts import generate_vieneu_speech
            clean_voice = self.voice.replace("vieneu:", "")

            for seg in segments:
                text = seg.translated_text.strip() or seg.text.strip()
                if not text:
                    continue
                audio_file = output_dir / f"seg_{seg.id:04d}.wav"
                generate_vieneu_speech(text, voice=clean_voice, output_path=audio_file)
                seg.tts_audio_path = str(audio_file)
        else:
            # Edge TTS (Async concurrent)
            async def run_edge_batch():
                tasks = []
                for seg in segments:
                    text = seg.translated_text.strip() or seg.text.strip()
                    if not text:
                        continue
                    audio_file = output_dir / f"seg_{seg.id:04d}.wav"
                    task = self._generate_single_audio_edge(
                        text=text,
                        output_file=audio_file,
                        voice=self.voice,
                        rate=self.rate,
                        volume=self.volume,
                    )
                    tasks.append(task)
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
    ) -> List[Segment]:
        return self.generate_speech_for_segments(segments, output_dir)
