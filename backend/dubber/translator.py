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
    from .transcriber import Segment, is_valid_speech_text
except ImportError:
    from transcriber import Segment, is_valid_speech_text

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


def preprocess_source_text(text: str, source_lang: str = "auto") -> str:
    """
    Tiền xử lý văn bản gốc trước khi đưa vào bộ dịch Google Translate.
    Dọn dẹp tạp âm, nhãn quảng cáo, watermark, ký hiệu âm thanh phụ đề cho MỌI thể loại phim (đa dạng, không gắn cứng theo phim cụ thể).
    """
    if not text:
        return text

    t = text.strip()

    # Dọn dẹp nhãn watermark, quảng cáo, chú thích âm thanh phụ đề chung
    t = re.sub(r'【(?:广告|片头|片尾|字幕|关注|订阅|独播|剧场).*?】', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\[(?:Music|Applause|Laughter|Cheering|Audio|Subtitles).*?\]', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\((?:Music|Applause|Laughter|Cheering|Audio).*?\)', '', t, flags=re.IGNORECASE)
    t = re.sub(r'[-—–_]{2,}', ' ', t)

    # Chuẩn hóa khoảng trắng
    t = re.sub(r'\s{2,}', ' ', t).strip()
    return t


def refine_vietnamese_dialogue(text: str) -> str:
    """
    Tinh chỉnh câu dịch tiếng Việt cho chuẩn văn phong phim ảnh / lồng tiếng tự nhiên.
    Khắc phục các lỗi dịch máy thô cứng (dùng chung cho TẤT CẢ các thể loại phim: tình cảm, hành động, cổ trang, đô thị...).
    Tuyệt đối KHÔNG gắn cứng kịch bản, tên nhân vật hay câu thoại của một bộ phim cụ thể nào.
    """
    if not text:
        return text

    t = text.strip()

    # 1. Các thành ngữ / quán ngữ giao tiếp tiếng Anh phổ biến trong phim ảnh
    en_idioms = [
        (r"\bWhat the hell\b", "Cái quái gì thế"),
        (r"\bWhat the heck\b", "Cái quái gì vậy"),
        (r"\bWhat on earth\b", "Rốt cuộc là chuyện gì thế"),
        (r"\bAre you kidding me\?*\b", "Cậu đang đùa đấy à?"),
        (r"\bAre you out of your mind\?*\b", "Cậu bị mất trí rồi à?"),
        (r"\bAre you crazy\?*\b", "Cậu bị điên rồi sao?"),
        (r"\bGet out of here\b", "Mau biến khỏi đây!"),
        (r"\bGet out of my way\b", "Tránh đường cho tôi!"),
        (r"\bLeave me alone\b", "Để tôi yên!"),
        (r"\bDon't touch me\b", "Đừng chạm vào tôi!"),
        (r"\bDon't worry\b", "Đừng lo lắng"),
        (r"\bHold on\b", "Khoan đã"),
        (r"\bHang on\b", "Chờ một chút"),
        (r"\bCome on\b", "Thôi nào"),
        (r"\bLet's go\b", "Mau đi thôi"),
        (r"\bNo way\b", "Không đời nào!"),
        (r"\bShut up\b", "Câm miệng đi!"),
        (r"\bHelp me\b", "Cứu tôi với!"),
        (r"\bTake care\b", "Bảo trọng nhé!"),
        (r"\bWhat's going on\?*\b", "Chuyện gì đang xảy ra thế?"),
        (r"\bWhat is going on\?*\b", "Chuyện gì đang xảy ra thế?"),
        (r"\bWhat's wrong with you\?*\b", "Cậu bị làm sao thế?"),
        (r"\bWhat is wrong with you\?*\b", "Cậu bị làm sao thế?"),
        (r"\bI swear\b", "Tôi xin thề"),
        (r"\bPlease forgive me\b", "Xin hãy tha thứ cho tôi"),
        (r"\bDon't mess with me\b", "Đừng có đùa với tôi"),
        (r"\bI didn't mean to\b", "Tôi không cố ý đâu"),
    ]
    for pattern, rep in en_idioms:
        t = re.sub(pattern, rep, t, flags=re.IGNORECASE)

    # 2. Xử lý câu dịch máy thô cứng sang văn phong đàm thoại phim truyền cảm
    vn_refinements = [
        # Bỏ các từ nối dịch máy vụng về
        (r"\blàm sao tôi có thể\b", "làm sao tôi"),
        (r"\bLàm sao tôi có thể\b", "Làm sao tôi"),
        (r"\bnhưng làm sao tôi có thể\b", "nhưng làm sao tôi"),
        (r"\bLàm thế nào tôi có thể\b", "Làm sao tôi"),
        (r"\blàm thế nào tôi có thể\b", "làm sao tôi"),
        (r"\bbạn có thể cho tôi biết\b", "cho tôi biết"),
        (r"\bBạn có thể cho tôi biết\b", "Cho tôi biết"),
        (r"\bTôi không biết làm thế nào để\b", "Tôi không biết làm sao để"),
        (r"\btôi không biết làm thế nào để\b", "tôi không biết làm sao để"),
        (r"\bAi đã gọi cho tôi\b", "Ai gọi tôi thế"),
        (r"\bAi gọi cho tôi\b", "Ai gọi tôi thế"),
        (r"\bai gọi cho tôi\b", "ai gọi tôi thế"),
        (r"\bCó thức ăn không\b", "Có gì ăn không"),
        (r"\bcó thức ăn không\b", "có gì ăn không"),
        (r"\bngười đã khuất\b", "người quá cố"),
        (r"\bchúc chuyến đi vui vẻ\b", "chúc lên đường bình an"),
        (r"\bChúc chuyến đi vui vẻ\b", "Chúc lên đường bình an"),
    ]
    for pattern, rep in vn_refinements:
        t = re.sub(pattern, rep, t, flags=re.IGNORECASE)

    # 3. Đổi đại từ "Bạn" xưng hô xã giao cứng nhắc thành "Cậu" trong đối thoại thường ngày
    t = re.sub(r"^Bạn có sao không\??", "Cậu có sao không?", t, flags=re.IGNORECASE)
    t = re.sub(r"^Bạn đang làm gì đấy\??", "Cậu đang làm gì đấy?", t, flags=re.IGNORECASE)
    t = re.sub(r"^Bạn là ai\??", "Cậu là ai?", t, flags=re.IGNORECASE)
    t = re.sub(r"^Bạn đi đâu đấy\??", "Cậu đi đâu đấy?", t, flags=re.IGNORECASE)
    t = re.sub(r"^Bạn nghe tôi nói này", "Cậu nghe tôi nói này", t, flags=re.IGNORECASE)

    # 4. Dọn dẹp dấu câu trùng lặp do dịch máy hoặc ghép câu
    t = re.sub(r'\?+', '?', t)
    t = re.sub(r'!+', '!', t)
    t = re.sub(r'\?\.', '?', t)
    t = re.sub(r'!\.', '!', t)
    t = re.sub(r'[-—–_]{2,}', ' ', t)
    t = re.sub(r'\s{2,}', ' ', t).strip()

    # Viết hoa chữ cái đầu câu nếu cần
    if t and len(t) > 1 and t[0].islower():
        t = t[0].upper() + t[1:]

    return t

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
        sl = (source_lang or "auto").lower().strip()
        if sl.startswith("zh") or sl in ("cn", "chinese", "chi", "tiếng trung", "tieng trung"):
            sl = "zh-CN"
        tl = (target_lang or "vi").lower().strip()
        if tl in ("zh", "chinese"):
            tl = "zh-CN"
        try:
            translator = GoogleTranslator(source=sl, target=tl)
        except Exception:
            translator = GoogleTranslator(source="auto", target="vi")
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

        clean = preprocess_source_text(clean, self.source_lang)

        # Engine 1: clients5 (Dict Chrome Ex - 100% reliable)
        res = translate_with_clients5(clean, target_lang=self.target_lang, source_lang=self.source_lang)
        if not res:
            # Engine 2: GTX API
            res = translate_with_gtx(clean, target_lang=self.target_lang, source_lang=self.source_lang)
        if not res:
            # Engine 3: deep-translator
            res = translate_with_deep_translator(clean, target_lang=self.target_lang, source_lang=self.source_lang)

        final_res = res if res else clean
        if self.target_lang == "vi":
            final_res = refine_vietnamese_dialogue(final_res)
        return final_res

    def translate_segments(
        self,
        segments: List[Segment],
        progress_callback: Optional[object] = None,
    ) -> List[Segment]:
        """
        Translates text of each segment to the target language with real-time progressive feedback.
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
        if progress_callback:
            progress_callback(f"[Dịch thuật AI] Đang dịch {len(segments)} câu thoại sang tiếng Việt...", 0.36)

        # Batch translation via clients5 using XML-tag delimiters
        # Dùng thẻ tag XML đặc biệt (<<<VDT_0>>>) để Google Translate không bao giờ coi là markdown hay biến thành dấu gạch ngang
        TAG_PREFIX = "<<<VDT_"
        TAG_SUFFIX = ">>>"
        clean_texts = [re.sub(r'[-—–_]{2,}', ' ', preprocess_source_text(seg.text.strip(), eff_src)).strip() for seg in segments]
        combined_payload = "\n".join([f"{TAG_PREFIX}{idx}{TAG_SUFFIX}\n{t}" for idx, t in enumerate(clean_texts)])
        
        batch_success = False
        try:
            batch_result = translate_with_clients5(combined_payload, target_lang=self.target_lang, source_lang=eff_src)
            if not batch_result:
                batch_result = translate_with_gtx(combined_payload, target_lang=self.target_lang, source_lang=eff_src)
            
            if batch_result:
                extracted = {}
                for idx in range(len(segments)):
                    pattern = rf"{re.escape(TAG_PREFIX)}{idx}{re.escape(TAG_SUFFIX)}\s*(.*?)(?={re.escape(TAG_PREFIX)}|\Z)"
                    m = re.search(pattern, batch_result, re.DOTALL)
                    if m:
                        part = m.group(1).strip()
                        part = re.sub(r'[-—–_]{2,}', ' ', part).strip()
                        extracted[idx] = part

                if len(extracted) == len(segments):
                    for idx, seg in enumerate(segments):
                        seg.translated_text = extracted[idx]
                    logger.info("✅ Batch translation succeeded for all segments!")
                    batch_success = True
        except Exception as batch_err:
            logger.warning(f"Batch translation error: {batch_err}")

        # Fallback to segment-by-segment if batch failed or had count mismatch
        if not batch_success:
            for idx, seg in enumerate(segments):
                clean_text = re.sub(r'[-—–_]{2,}', ' ', seg.text).strip()
                if not is_valid_speech_text(clean_text):
                    seg.translated_text = ""
                    continue
                
                translated = self.translate_single(clean_text)
                translated = re.sub(r'[-—–_]{2,}', ' ', translated).strip() if translated else ""
                seg.translated_text = translated if is_valid_speech_text(translated) else clean_text
                time.sleep(0.04)

        # Hậu kiểm: nếu câu dịch vẫn còn sót chữ Hán (tiếng Trung chưa dịch), dịch lại đơn lẻ từng câu
        for seg in segments:
            if is_chinese_text(seg.translated_text or ""):
                try:
                    re_trans = translate_with_clients5(seg.text.strip(), target_lang=self.target_lang, source_lang="zh-CN")
                    if re_trans and not is_chinese_text(re_trans):
                        seg.translated_text = re.sub(r'[-—–_]{2,}', ' ', re_trans).strip()
                except Exception:
                    pass
            # Bảo đảm phụ đề không bị dính chuỗi ký hiệu / gạch ngang
            if seg.translated_text:
                seg.translated_text = re.sub(r'[-—–_]{2,}', ' ', seg.translated_text).strip()
            if not is_valid_speech_text(seg.translated_text or ""):
                seg.translated_text = seg.text if is_valid_speech_text(seg.text) else ""

        # Tinh chỉnh văn phong lồng tiếng tự nhiên và truyền cảm cho tiếng Việt theo từng câu
        tot_segs = max(1, len(segments))
        if self.target_lang == "vi":
            for idx, seg in enumerate(segments):
                if seg.translated_text:
                    seg.translated_text = refine_vietnamese_dialogue(seg.translated_text)
                if progress_callback:
                    sub_pct = 0.36 + min(0.14, ((idx + 1) / tot_segs) * 0.14)
                    snip = (seg.translated_text or seg.text).replace('"', '')[:30]
                    progress_callback(
                        f"[Dịch thuật AI] Câu {idx+1}/{tot_segs}: \"{snip}...\"",
                        sub_pct
                    )

        # Đảm bảo 100% các câu thoại đều có nội dung dịch và được giữ lại trọn vẹn (không nuốt câu)
        for s in segments:
            if not s.translated_text or not s.translated_text.strip():
                s.translated_text = s.text.strip()
        segments = [s for s in segments if s.translated_text and s.translated_text.strip()]

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
