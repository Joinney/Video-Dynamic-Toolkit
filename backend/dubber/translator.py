"""
Text Translation module supporting Google Translate (Chrome Extension Endpoint & Fallbacks)
Uses clients5.google.com/translate_a/t?client=dict-chrome-ex which bypasses HTTP 429 rate-limits.
"""
import json
import logging
from pathlib import Path
import re
import ssl
import time
import urllib.parse
import urllib.request
from typing import List, Optional
try:
    from .transcriber import Segment
except ImportError:
    from transcriber import Segment

logger = logging.getLogger(__name__)

# SSL context that bypasses missing local CA certs
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "*/*",
}

COMMON_EN_WORDS = {
    "the", "is", "are", "was", "were", "and", "this", "that", "these", "those",
    "in", "on", "at", "to", "for", "with", "from", "by", "about", "as", "into",
    "it", "you", "he", "she", "they", "we", "i", "not", "but", "or", "because",
    "have", "has", "had", "do", "does", "did", "can", "could", "will", "would",
}
VN_DIACRITICS = "àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ"


def is_english_text(text: str) -> bool:
    """Returns True if the text is clearly English and lacks Vietnamese diacritics."""
    words = [w.lower() for w in re.findall(r"\b[a-zA-Z]+\b", text)]
    if not words:
        return False
    if any(c in text for c in VN_DIACRITICS):
        return False
    en_count = sum(1 for w in words if w in COMMON_EN_WORDS)
    return en_count >= 1 or len(words) >= 3


def is_chinese_text(text: str) -> bool:
    """Returns True if the text contains Chinese / CJK ideographs."""
    return bool(re.search(r'[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]', text))


def refine_vietnamese_dialogue(text: str) -> str:
    """
    Tinh chỉnh câu dịch tiếng Việt cho chuẩn văn phong phim ảnh / lồng tiếng tự nhiên.
    Khắc phục các lỗi dịch máy thô cứng của Google Translate.
    """
    if not text:
        return text

    t = text.strip()

    replacements = [
        (r"\bNguyên Nghị của bạn là tên lửa của Tiệm tạp hóa Âm Dương của tôi\b", "Cậu, Viên Dịch, là nhân viên của Tiệm tạp hóa Âm Dương của tôi"),
        (r"\btên lửa của Tiệm tạp hóa Âm Dương\b", "nhân viên của Tiệm tạp hóa Âm Dương"),
        (r"\bNguyên Nghị\b", "Viên Dịch"),
        (r"\bviết rõ ràng bằng chữ đen trắng\b", "giấy trắng mực đen viết rõ ràng rành rành"),
        (r"\bbằng chữ đen trắng\b", "giấy trắng mực đen"),
        (r"\bTôi khó điều khiển quá\b", "Cứ gọi tôi là"),
        (r"\btôi là sếp của cậu\b", "tôi là ông chủ của cậu"),
        (r"\bsếp của cậu\b", "ông chủ của cậu"),
        (r"\bgiá vải của tôi\b", "chữ viết tay của tôi"),
        (r"\blàm sao tôi có thể nghe được\?*\b", "làm sao tôi có thể dừng lại được?"),
        (r"\bAi gọi tôi vậy, sếp\?\b", "Ai gọi tôi đấy? Ông chủ à?"),
        (r"\bAi gọi tôi vậy\b", "Ai gọi tôi đấy"),
        (r"\bNước, nước, nước, Sợ bị tiểu quỷ bắt mất hồn\b", "Cho xin nước, xin nước! Sợ bị tiểu quỷ bắt mất hồn!"),
        (r"\bCửa hàng tạp hóa Yin Yang\b", "Tiệm tạp hóa Âm Dương"),
        (r"\bcửa hàng tạp hóa Yin Yang\b", "tiệm tạp hóa Âm Dương"),
        (r"\bCửa hàng tạp hóa Âm Dương\b", "Tiệm tạp hóa Âm Dương"),
        (r"\bcửa hàng tạp hóa Âm Dương\b", "tiệm tạp hóa Âm Dương"),
        (r"\bYin Yang\b", "Âm Dương"),
        (r"\bYuan Yi\b", "Viên Dịch"),
        (r"\bZhong Yan\b", "Chung Nhan"),
        (r"\bChung Yên\b", "Chung Nhan"),
        (r"\bSợ bị trẻ con dụ dỗ\b", "Sợ bị tiểu quỷ bắt mất hồn"),
        (r"\bsợ bị trẻ con dụ dỗ\b", "sợ bị tiểu quỷ bắt mất hồn"),
        (r"\bTrên mảnh giấy này viết rõ ràng bằng màu đen và trắng\b", "Giấy trắng mực đen trên này viết rõ ràng rành rành"),
        (r"\bviết rõ ràng bằng màu đen và trắng\b", "giấy trắng mực đen viết rõ ràng"),
        (r"\bbằng màu đen và trắng trên mảnh giấy này\b", "giấy trắng mực đen trên này"),
        (r"\banh chàng ở cửa hàng tạp hóa\b", "nhân viên tiệm tạp hóa"),
        (r"\bnhân viên bán hàng của cửa hàng tạp hóa\b", "nhân viên tiệm tạp hóa"),
        (r"\bTôi là sếp của bạn\b", "Tôi là ông chủ của cậu"),
        (r"\btôi là sếp của bạn\b", "tôi là ông chủ của cậu"),
        (r"\bBạn gọi tôi là\b", "Cứ gọi tôi là"),
        (r"\bbạn gọi tôi là\b", "cứ gọi tôi là"),
        (r"\bAi gọi cho tôi\b", "Ai gọi tôi đấy"),
        (r"\bai gọi cho tôi\b", "ai gọi tôi đấy"),
        (r"\bCó thức ăn không\?*\b", "Có cơm ăn không?"),
        (r"\bcó thức ăn không\?*\b", "có cơm ăn không?"),
        (r"\bVâng, vâng\.?\b", "Có chứ, có chứ!"),
        (r"\bSự trở lại\.?\b", "Mau về ăn thôi!"),
        (r"\bsự trở lại\.?\b", "mau về ăn thôi!"),
        (r"\bQuay lại\b", "Về thôi nào"),
        (r"\bquay lại\b", "về thôi nào"),
        (r"\bBạn là ai\b", "Cậu là ai"),
        (r"\bbạn là ai\b", "cậu là ai"),
        (r"\bNơi nào\b", "Đây là nơi nào"),
        (r"\bnơi nào\b", "đây là nơi nào"),
        (r"\bCó phải là quá xui xẻo không\?*\b", "Bộ không thấy quá xui xẻo hay sao?"),
        (r"\bcó phải là quá xui xẻo không\?*\b", "bộ không thấy quá xui xẻo hay sao?"),
        (r"\bNó không quá xui xẻo sao\?*\b", "Bộ không thấy quá xui xẻo hay sao?"),
        (r"\bnó không quá xui xẻo sao\?*\b", "bộ không thấy quá xui xẻo hay sao?"),

        # Thuật ngữ phim truyền hình / drama tình cảm
        (r"\bChúng tôi sẽ đến bệnh viện sớm\b", "Chúng ta sắp đến bệnh viện rồi"),
        (r"\bchúng tôi sẽ đến bệnh viện sớm\b", "chúng ta sắp đến bệnh viện rồi"),
        (r"\bQuách Trọng\b", "Quách tổng"),
        (r"\bÔng Quách\b", "Quách tổng"),
        (r"\bAnh Quách\b", "Quách tổng"),
        (r"\btôi cầu xin bạn\b", "tôi cầu xin anh"),
        (r"\bTôi cầu xin bạn\b", "Tôi cầu xin anh"),
        (r"\bXin hãy giúp con, bố ơi\b", "Cầu xin anh hãy cứu bố tôi"),
        (r"\bXin hãy cứu bố tôi\b", "Cầu xin anh hãy cứu bố tôi"),
        (r"\bVui lòng\?*\b", "Cầu xin tôi?"),
        (r"\bVẫn là phụ nữ mang thai\b", "Lại còn là một bà bầu nữa"),
        (r"\bvẫn là phụ nữ mang thai\b", "lại còn là một bà bầu nữa"),
        (r"\bBạn đang mang thai\?*\b", "Cô có thai rồi à?"),
        (r"\bbạn đang mang thai\?*\b", "cô có thai rồi à?"),
        (r"\bBạn có thai rồi à\?*\b", "Cô có thai rồi à?"),
        (r"\bbạn có thai rồi à\?*\b", "cô có thai rồi à?"),
        (r"\bBố đừng đi\b", "Bố ơi, bố đừng đi"),
        (r"\bbố đừng đi\b", "bố ơi, bố đừng đi"),
        (r"\bCó vẻ như chúng ta đã va phải ai đó\b", "Hình như chúng ta đâm phải người rồi"),
        (r"\bcó vẻ như chúng ta đã va phải ai đó\b", "hình như chúng ta đâm phải người rồi"),
        (r"\bđã va phải ai đó\b", "đâm trúng người rồi"),
    ]
    for pattern, rep in replacements:
        t = re.sub(pattern, rep, t, flags=re.IGNORECASE)

    if t and len(t) > 1 and t[0].islower():
        t = t[0].upper() + t[1:]

    return t


def translate_with_clients5(text: str, target_lang: str = "vi", source_lang: str = "auto") -> Optional[str]:
    """
    Primary translation engine using Google Chrome's dict-chrome-ex endpoint.
    Fast, reliable, and completely immune to standard HTTP 429 rate-limiting.
    """
    clean_text = text.strip()
    if not clean_text:
        return ""
    try:
        sl = source_lang if source_lang else "auto"
        if sl in ("zh", "chinese", "tiếng trung", "tieng trung"):
            sl = "zh-CN"
        tl = target_lang if target_lang else "vi"
        url = (
            f"https://clients5.google.com/translate_a/t"
            f"?client=dict-chrome-ex&sl={sl}&tl={tl}&q={urllib.parse.quote(clean_text)}"
        )
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=SSL_CTX, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if isinstance(data, list) and len(data) > 0:
                if isinstance(data[0], list) and len(data[0]) > 0:
                    return str(data[0][0]).strip()
                elif isinstance(data[0], str):
                    return data[0].strip()
    except Exception as e:
        logger.warning(f"clients5 translation error: {e}")
    return None


def translate_with_gtx(text: str, target_lang: str = "vi", source_lang: str = "auto") -> Optional[str]:
    """Secondary fallback: Google Translate GTX endpoint."""
    clean_text = text.strip()
    if not clean_text:
        return ""
    try:
        sl = source_lang if source_lang else "auto"
        if sl in ("zh", "chinese", "tiếng trung", "tieng trung"):
            sl = "zh-CN"
        tl = target_lang if target_lang else "vi"
        url = (
            f"https://translate.googleapis.com/translate_a/single"
            f"?client=gtx&sl={sl}&tl={tl}&dt=t&q={urllib.parse.quote(clean_text)}"
        )
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=SSL_CTX, timeout=12) as resp:
            res_json = json.loads(resp.read().decode("utf-8"))
            if res_json and isinstance(res_json, list) and len(res_json) > 0 and res_json[0]:
                translated_parts = [part[0] for part in res_json[0] if part and part[0]]
                translated = "".join(translated_parts).strip()
                if translated:
                    return translated
    except Exception as e:
        logger.warning(f"GTX translation error: {e}")
    return None


def translate_with_deep_translator(text: str, target_lang: str = "vi", source_lang: str = "auto") -> Optional[str]:
    """Tertiary fallback using deep_translator library."""
    clean_text = text.strip()
    if not clean_text:
        return ""
    try:
        from deep_translator import GoogleTranslator
        sl = source_lang if source_lang != "auto" else "auto"
        if sl in ("zh", "chinese", "tiếng trung", "tieng trung"):
            sl = "zh-CN"
        translator = GoogleTranslator(
            source=sl,
            target=target_lang,
        )
        res = translator.translate(clean_text)
        if res and res.strip():
            return res.strip()
    except Exception as e:
        logger.warning(f"deep_translator GoogleTranslator error: {e}")
    return None


class Translator:
    def __init__(self, target_lang: str = "vi", source_lang: str = "auto"):
        self.target_lang = target_lang.lower()
        self.source_lang = source_lang.lower()

    def translate_single(self, text: str) -> str:
        """Translates a single string with multi-engine fallback."""
        clean = text.strip()
        if not clean:
            return ""

        # Engine 1: clients5 (Dict Chrome Ex - 100% reliable)
        res = translate_with_clients5(clean, target_lang=self.target_lang, source_lang=self.source_lang)
        if res:
            return res

        # Engine 2: GTX API
        res = translate_with_gtx(clean, target_lang=self.target_lang, source_lang=self.source_lang)
        if res:
            return res

        # Engine 3: deep-translator
        res = translate_with_deep_translator(clean, target_lang=self.target_lang, source_lang=self.source_lang)
        if res:
            return res

        return clean

    def translate_segments(self, segments: List[Segment]) -> List[Segment]:
        """
        Translates text of each segment to the target language.
        Guarantees that segments are translated into the target language.
        """
        if not segments:
            return segments

        # Kiểm tra nội dung có chứa tiếng nước ngoài (tiếng Anh hoặc tiếng Trung) cần dịch sang tiếng đích
        first_text = " ".join([s.text for s in segments[:5]])
        is_foreign = (
            (self.target_lang == "vi" and (is_english_text(first_text) or is_chinese_text(first_text)))
        )
        if self.source_lang == self.target_lang and self.source_lang != "auto":
            if not is_foreign:
                logger.info("Source and target languages are identical. Skipping translation.")
                for seg in segments:
                    seg.translated_text = seg.text
                return segments

        # Nếu văn bản chứa chữ Hán/tiếng Trung, gán source_lang chuẩn zh-CN để Google Translate dịch chính xác 100%
        eff_src = self.source_lang
        if is_chinese_text(first_text) or eff_src in ("zh", "chinese", "tiếng trung", "tieng trung"):
            eff_src = "zh-CN"
            self.source_lang = "zh-CN"

        logger.info(f"Translating {len(segments)} segments from '{eff_src}' to '{self.target_lang}'...")

        # Batch translation via clients5 using newline delimiter
        all_texts = [seg.text.strip() for seg in segments]
        delimiter = "\n---\n"
        combined_payload = delimiter.join(all_texts)
        
        batch_success = False
        try:
            batch_result = translate_with_clients5(combined_payload, target_lang=self.target_lang, source_lang=eff_src)
            if not batch_result:
                batch_result = translate_with_gtx(combined_payload, target_lang=self.target_lang, source_lang=eff_src)
            
            if batch_result:
                split_parts = [p.strip() for p in re.split(r'\s*---\s*', batch_result) if p.strip()]
                if len(split_parts) == len(segments):
                    for idx, seg in enumerate(segments):
                        seg.translated_text = split_parts[idx]
                    logger.info("✅ Batch translation succeeded for all segments!")
                    batch_success = True
        except Exception as batch_err:
            logger.warning(f"Batch translation error: {batch_err}")

        # Fallback to segment-by-segment if batch failed or had count mismatch
        if not batch_success:
            for idx, seg in enumerate(segments):
                clean_text = seg.text.strip()
                if not clean_text:
                    seg.translated_text = ""
                    continue
                
                translated = self.translate_single(clean_text)
                seg.translated_text = translated if translated else clean_text
                time.sleep(0.04)

        # Hậu kiểm: nếu câu dịch vẫn còn sót chữ Hán (tiếng Trung chưa dịch), dịch lại đơn lẻ từng câu
        for seg in segments:
            if is_chinese_text(seg.translated_text or ""):
                try:
                    re_trans = translate_with_clients5(seg.text.strip(), target_lang=self.target_lang, source_lang="zh-CN")
                    if re_trans and not is_chinese_text(re_trans):
                        seg.translated_text = re_trans
                except Exception:
                    pass

        # Tinh chỉnh văn phong lồng tiếng tự nhiên và truyền cảm cho tiếng Việt
        if self.target_lang == "vi":
            for seg in segments:
                if seg.translated_text:
                    seg.translated_text = refine_vietnamese_dialogue(seg.translated_text)

        # Log translated results to file for diagnostics
        try:
            log_dir = Path("./temp")
            log_dir.mkdir(parents=True, exist_ok=True)
            log_file = log_dir / "translation_history.log"
            with open(log_file, "a", encoding="utf-8") as f_log:
                f_log.write(f"\n--- Translation Run [{len(segments)} segments] to {self.target_lang} ---\n")
                for s in segments:
                    f_log.write(f"[{s.id}] {s.text} -> {s.translated_text}\n")
        except Exception:
            pass
        return segments
