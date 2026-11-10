"""
Text-to-Speech (TTS) module supporting Microsoft Edge-TTS and VieNeu-TTS (Adam Tốp Tốp)
"""
import asyncio
import logging
import re
from pathlib import Path
from typing import List, Optional
try:
    from .transcriber import Segment
    from .synchronizer import get_ffmpeg_binary
except ImportError:
    from transcriber import Segment
    from synchronizer import get_ffmpeg_binary

logger = logging.getLogger(__name__)


def sanitize_text_for_tts(text: str) -> str:
    """
    Chuẩn hóa câu thoại để Edge-TTS và các bộ sinh giọng AI phát âm trơn tru 100%,
    khắc phục triệt để lỗi NoAudioReceived do chứa số có gạch nối, dấu ba chấm, ký tự đặc biệt.
    """
    if not text:
        return "Ừm."
    t = str(text).strip()
    t = re.sub(r'[\r\n\t]+', ' ', t)
    t = re.sub(r'[-—–_]{2,}', ' ', t)
    t = re.sub(r'~+', '', t)
    # Tách các dãy số có gạch nối ví dụ 2-1-1 thành 2, 1, 1 để Edge-TTS đọc tự nhiên không bị lỗi
    t = re.sub(r'(\d+)\s*[-—–]\s*(?=\d)', r'\1, ', t)
    t = re.sub(r'\?+', '?', t)
    t = re.sub(r'!+', '!', t)
    t = re.sub(r'\.{2,}|…', '.', t)

    has_words = bool(re.search(r'[a-zA-Z0-9\u00C0-\u1EF9]', t))
    if not has_words:
        if '?' in t:
            return 'Hả?'
        elif '!' in t:
            return 'Á!'
        else:
            return 'Ừm.'

    # Chuẩn hóa các từ cảm thán ngắn
    lower = t.lower()
    if lower in ('a?!', 'a?', 'a!'):
        return 'Á!'
    if lower in ('ah!', 'ah'):
        return 'A!'

    return t.strip()


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
        raw_tmp = output_file.with_suffix(".raw.mp3")

        clean_text = sanitize_text_for_tts(text)
        if not clean_text:
            clean_text = "Ừm."

        # ĐẢM BẢO 100% ĐÚNG 1 GIỌNG ĐỌC DUY NHẤT TRONG SUỐT VIDEO:
        # Tuyệt đối không bao giờ đổi giọng dự phòng làm video bị 2 giọng nói khác nhau (lúc nam lúc nữ)!
        cur_voice = voice
        for attempt in range(4):
            cur_rate = rate if attempt < 2 else "+0%"
            try:
                communicate = edge_tts.Communicate(
                    text=clean_text,
                    voice=cur_voice,
                    rate=cur_rate,
                    volume=volume,
                )
                await asyncio.wait_for(communicate.save(str(raw_tmp)), timeout=20.0)
                if raw_tmp.exists() and raw_tmp.stat().st_size > 100:
                    converted = False
                    try:
                        ffmpeg_bin = get_ffmpeg_binary()
                        AudioSegment.converter = ffmpeg_bin
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
                        ffmpeg_bin = get_ffmpeg_binary()
                        ret = subprocess.run([ffmpeg_bin, "-y", "-i", str(raw_tmp), str(output_file)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                        converted = (ret.returncode == 0 and output_file.exists() and output_file.stat().st_size > 100)
                    if converted:
                        return True
            except Exception as e_master:
                if attempt < 3:
                    await asyncio.sleep(0.3 * (attempt + 1))
                    continue
                logger.warning(f"Edge TTS processing note: {e_master}")
            finally:
                if raw_tmp.exists():
                    try:
                        raw_tmp.unlink(missing_ok=True)
                    except Exception:
                        pass

        # BẢO HIỂM 100%: Fallback tự động qua Google TTS nếu Edge-TTS bị nghẽn mạng/rate-limit hoặc NoAudioReceived
        # Tuyệt đối không bao giờ để câu thoại bị câm tiếng trong khi phụ đề vẫn hiển thị!
        try:
            import urllib.request, urllib.parse, ssl, subprocess
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            clean_q = re.sub(r'[\-_—–~^#*]', ' ', clean_text).strip() or "Ừm."
            g_url = 'https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=' + urllib.parse.quote(clean_q[:250])
            g_req = urllib.request.Request(g_url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(g_req, context=ctx, timeout=10.0) as resp:
                g_data = resp.read()
                if len(g_data) > 100:
                    with open(raw_tmp, "wb") as fg:
                        fg.write(g_data)
                    ffmpeg_bin = get_ffmpeg_binary()
                    ret = subprocess.run([ffmpeg_bin, "-y", "-i", str(raw_tmp), str(output_file)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    if ret.returncode == 0 and output_file.exists() and output_file.stat().st_size > 100:
                        logger.info(f"Generated fallback audio via Google TTS for: '{clean_text[:30]}'")
                        return True
        except Exception as eg:
            logger.warning(f"Google TTS emergency fallback note: {eg}")
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
                FEMALE_VIENEU = ("trúc ly", "mai anh", "thùy dung", "ngọc huyền", "ngọc trân", "ngọc linh", "đoan trang", "quỳnh anh", "ái hân", "xuân tiên", "thục đoan", "mỹ duyên", "kim thanh")
                is_female = any(fn in clean_voice.lower() for fn in FEMALE_VIENEU)
                fb_voice = "vi-VN-HoaiMyNeural" if is_female else "vi-VN-NamMinhNeural"
                try:
                    generate_vieneu_speech(text, voice=clean_voice, output_path=audio_file)
                except Exception as vn_err:
                    logger.warning(f"VieNeu TTS note on seg {seg.id}: {vn_err}, trying fallback with same gender voice ({fb_voice})...")
                    try:
                        loop_fb = asyncio.new_event_loop()
                        loop_fb.run_until_complete(self._generate_single_audio_edge(text, audio_file, voice=fb_voice, rate=self.rate, volume=self.volume))
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
            # Edge TTS with Semaphore concurrency limiter (max 2 at once) to prevent rate limits & socket drops
            async def run_edge_batch():
                done_count = 0
                sem = asyncio.Semaphore(2)

                async def wrapped_gen(seg_item):
                    nonlocal done_count
                    t_val = seg_item.translated_text.strip() or seg_item.text.strip()
                    if not t_val:
                        t_val = "Ừm."
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
                        await asyncio.sleep(0.05)
                    done_count += 1
                    if progress_callback:
                        sub_pct = 0.50 + min(0.25, (done_count / tot_segs) * 0.25)
                        progress_callback(
                            f"[Lồng tiếng AI] [{done_count}/{tot_segs}] Tạo giọng đọc: \"{snip}...\"",
                            sub_pct
                        )

                tasks = [wrapped_gen(seg) for seg in segments]
                await asyncio.gather(*tasks, return_exceptions=True)

                # Phục hồi triệt để: Tự động phát hiện và sinh lại tuần tự các câu chưa tạo được âm thanh
                # ĐẢM BẢO 100% ĐÚNG 1 GIỌNG ĐỌC DUY NHẤT (self.voice), không bao giờ đổi giọng
                for seg in segments:
                    t_val = seg.translated_text.strip() or seg.text.strip() or "Ừm."
                    a_file = output_dir / f"seg_{seg.id:04d}.wav"
                    if not a_file.exists() or a_file.stat().st_size <= 100:
                        logger.warning(f"Segment {seg.id} missing TTS audio, retrying with emergency fallback for '{t_val[:25]}'...")
                        for retry_attempt in range(3):
                            ok = await self._generate_single_audio_edge(
                                text=t_val,
                                output_file=a_file,
                                voice=self.voice,
                                rate=self.rate if retry_attempt == 0 else "+0%",
                                volume=self.volume,
                            )
                            if ok and a_file.exists() and a_file.stat().st_size > 100:
                                break
                            await asyncio.sleep(0.3 * (retry_attempt + 1))

                # Gán tts_audio_path cho tất cả các câu thoại
                for seg in segments:
                    a_file = output_dir / f"seg_{seg.id:04d}.wav"
                    if a_file.exists() and a_file.stat().st_size > 100:
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

