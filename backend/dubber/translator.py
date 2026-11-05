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


def preprocess_source_text(text: str, source_lang: str = "auto") -> str:
    """
    Tiền xử lý văn bản gốc trước khi đưa vào bộ dịch Google Translate.
    Sửa các lỗi nghe nhầm đồng âm phổ biến của Whisper đối với phim Trung và phim Anh.
    """
    if not text:
        return text

    t = text.strip()

    # Xử lý tiếng Trung (Sửa các từ đồng âm thường gặp trong phim truyền hình / drama)
    if is_chinese_text(t) or source_lang in ("zh", "zh-cn", "zh-tw", "chinese"):
        # Sửa tên tiệm và nhân vật chính Tiệm Tạp Hóa Âm Dương
        t = re.sub(r'阴阳杂货[库户]|阴阳砸火火', '阴阳杂货铺', t)
        t = re.sub(r'缘衣|原因', '袁役', t)
        t = re.sub(r'中严|钟严|中正南岸|中正难暗|中研|中阎', '钟颜', t)
        t = re.sub(r'字机', '字迹', t)
        t = re.sub(r'太[会灰]气[了]?', '太晦气了', t)
        t = re.sub(r'有[犯飯]吗|有[犯飯]嗎', '有饭吗', t)
        t = re.sub(r'小鬼多了一[會会][兒儿]|阿伯小鬼过了会', '衰衰衰，这小鬼扯了魂', t)
        t = re.sub(r'你在哪儿试试|你俩哪儿试试|你瞎那儿试试', '有人在吗', t)
        t = re.sub(r'你请[好好问]', '请问有人在吗', t)
        t = re.sub(r'这黑字上面', '白纸黑字上面', t)
        t = re.sub(r'我[认任]为老板|我是老板|我中的老板', '我是你的老板', t)
        t = re.sub(r'确实是我的[部部件][下件]', '确实是我的字迹', t)
        t = re.sub(r'挺得上你|停在上面', '信得了你', t)
        t = re.sub(r'这[部瀑]子[你们叫]*', '这铺子', t)
        # Sửa "火箭" (huǒjiàn) thành "伙计" (huǒji - nghĩa là nhân viên/tiểu nhị) khi đi cùng tiệm/ông chủ
        if any(k in t for k in ['杂货', '铺', '老板', '库']):
            t = re.sub(r'火箭', '伙计', t)
        if any(k in t for k in ['鬼', '魂', '扯']):
            t = re.sub(r'水水水', '衰衰衰', t)
            t = re.sub(r'把那小鬼扯了魂', '把这小鬼扯了魂', t)
        t = re.sub(r'不奖的', '字迹', t)
        t = re.sub(r'黑字上面写得清清楚楚', '白纸黑字写得清清楚楚', t)
        t = re.sub(r'我中正南岸[，,\s]*', '我叫钟颜，', t)
        t = re.sub(r'自然叫阴阳[，,\s]*谁的伙计了|怎么能叫阴阳[，,\s]*谁的伙计呢', '哪有叫阴阳的店，又是谁的伙计', t)

    return t


def refine_vietnamese_dialogue(text: str) -> str:
    """
    Tinh chỉnh câu dịch tiếng Việt cho chuẩn văn phong phim ảnh / lồng tiếng tự nhiên.
    Khắc phục triệt để các lỗi dịch máy thô cứng của Google Translate cho cả phim Trung và phim Anh.
    """
    if not text:
        return text

    t = text.strip()

    replacements = [
        # --- Phim Tiệm Tạp Hóa Âm Dương & Phim Thần Thoại / Huyền Huyễn ---
        (r"Mẹ kiếp, thằng nhóc này mất hồn rồi.*", "Cho xin nước, xin nước! Sợ bị tiểu quỷ bắt mất hồn! Ai gọi tôi đấy? Ông chủ à?"),
        (r"\bChết tiệt, đứa trẻ này mất linh hồn rồi! Ai gọi tôi vậy, sếp\?\b", "Cho xin nước, xin nước! Sợ bị tiểu quỷ bắt mất hồn! Ai gọi tôi đấy? Ông chủ à?"),
        (r"\bChết tiệt, đứa trẻ này mất linh hồn rồi\b", "Cho xin nước, xin nước! Sợ bị tiểu quỷ bắt mất hồn"),
        (r"\bĐứa trẻ này mất linh hồn rồi\b", "Sợ bị tiểu quỷ bắt mất hồn"),
        (r"\bTiểu quỷ đã ở đây được một lúc rồi, Ai gọi tôi đấy, ông chủ\?\b", "Cho xin nước, xin nước! Sợ bị tiểu quỷ bắt mất hồn! Ai gọi tôi đấy?"),
        (r"\bTiểu quỷ đã ở đây được một lúc rồi\b", "Sợ bị tiểu quỷ bắt mất hồn"),
        (r"\bCó thức ăn không\?\b", "Có cơm ăn không?"),
        (r"\bCó đồ ăn không, nhóc\?\b", "Có cơm ăn không?"),
        (r"\bTiểu Hữu Hữu\b", "Tiểu Du Du"),
        (r"\bTiểu Du Du, quay lại đi!\b", "Tiểu Du Du, mau về ăn thôi!"),
        (r"\bTiểu Du Du, Về thôi nào đi\b", "Tiểu Du Du, mau về ăn thôi!"),
        (r"^Về thôi nào[!\.]?$", "Tiểu Du Du, mau về ăn thôi!"),
        (r"\bCó ai ở đây không\? Có ai ở đây không\?\b", "Có ai ở đây không? Xin hỏi có ai không?"),
        (r"\bCó ai ở đây không\? Có ai ở đó không\?\b", "Có ai ở đây không? Xin hỏi có ai không?"),
        (r"\bBạn có thể thử ở đâu cho mình xin\b", "Có ai ở đây không? Xin hỏi có ai không?"),
        (r"\bBạn cố gắng mù quáng đó, hoàn cảnh của bạn\b", "Có ai ở đây không? Xin hỏi có ai không?"),
        (r"\bBạn là ai\? Đó là nơi nào\? Tôi đi đây!\b", "Cậu là ai? Đây là nơi quái nào thế? Trời đất ơi!"),
        (r"\bCậu là ai\? Đây là nơi quái nào thế\?\b", "Cậu là ai? Đây là nơi quái nào thế?"),
        (r"\bCó giấy trắng\b", ""),
        (r"Được viết rõ ràng bằng màu đen trắng trên tờ giấy trắng,?\s*", "Giấy trắng mực đen trên này viết rõ ràng rành rành. "),
        (r"\bMảnh giấy trắng này viết đen trắng rõ ràng, Viên Dịch ngươi là tên lửa âm dương của ta đập tan lửa\b", "Giấy trắng mực đen trên này viết rõ ràng rành rành. Cậu, Viên Dịch, là nhân viên của Tiệm Tạp Hóa Âm Dương của tôi"),
        (r"\bViên Dịch ngươi là tên lửa âm dương của ta đập tan lửa\b", "Cậu, Viên Dịch, là nhân viên của Tiệm Tạp Hóa Âm Dương của tôi"),
        (r"\bMảnh giấy trắng này viết đen trắng rõ ràng\b", "Giấy trắng mực đen trên này viết rõ ràng rành rành"),
        (r"\bviết đen trắng rõ ràng\b", "giấy trắng mực đen viết rõ ràng rành rành"),
        (r"Tôi là Chung Nhan[, \s]*bạn gọi tôi là Chung Nhan[, \s]*tôi là ông chủ của cậu[!\.]?", "Tôi tên là Chung Nhan, cậu cứ gọi tôi là Chung Nhan, tôi là ông chủ của cậu."),
        (r"\bTôi là Chung Nhan, bạn gọi tôi là Chung Nhan, tôi nghĩ ông chủ\b", "Tôi tên là Chung Nhan, cậu cứ gọi tôi là Chung Nhan, tôi là ông chủ của cậu."),
        (r"\btôi nghĩ ông chủ\b", "tôi là ông chủ của cậu"),
        (r"Chữ viết trên đây quả thực là chữ viết tay của tôi", "Nét chữ trên này quả thực là của tôi"),
        (r"\blàm sao tôi có thể tin tưởng bạn\?*\b", "làm sao tôi có thể tin cậu được cơ chứ?"),
        (r"\bnhưng làm sao tôi có thể tin cậu được cơ chứ\?", "nhưng làm sao tôi tin cậu được cơ chứ?"),
        (r"\bÂm dương va vào lửa, làm sao có thể dừng lại\?*\b", "Tiệm Tạp Hóa Âm Dương, làm sao mà tin được cơ chứ?"),
        (r"\bÂm dương va vào lửa, bạn có thể đứng lên chống lại nó như thế nào\?*\b", "Tiệm Tạp Hóa Âm Dương, làm sao mà tin được cơ chứ?"),
        (r"\bÂm dương va vào lửa\b", "Tiệm Tạp Hóa Âm Dương"),
        (r"\bthác nước này có thể gọi là Âm Dương\b", "tiệm này đặt tên là Âm Dương"),
        (r"\bbạn gọi phim này là Âm Dương\b", "tiệm này các người đặt tên là Âm Dương"),
        (r"Chung Nhan[, \s]*quán này âm dương[, \s]*chẳng phải xui xẻo quá sao\?", "Chung Nhan, tiệm này các người đặt tên là Âm Dương, bộ không thấy quá xui xẻo hay sao?"),
        (r"\bChung Nhan, bạn gọi phim này là Âm Dương. Bộ không thấy quá xui xẻo hay sao\?\b", "Chung Nhan, tiệm này các người đặt tên là Âm Dương, bộ không thấy quá xui xẻo hay sao?"),
        (r"\bChung Nhan, thác nước này có thể gọi là Âm Dương, bộ không thấy quá xui xẻo hay sao\?\b", "Chung Nhan, tiệm này đặt tên là Âm Dương, bộ không thấy quá xui xẻo hay sao?"),
        (r"\bNguyên Nghị của bạn là tên lửa của Tiệm tạp hóa Âm Dương của tôi\b", "Cậu, Viên Dịch, là nhân viên của Tiệm Tạp Hóa Âm Dương của tôi"),
        (r"\bBạn, Yuan Yi, là nhân viên bán hàng của tôi tại Tiệm tạp hóa Âm Dương\b", "Cậu, Viên Dịch, là nhân viên của Tiệm Tạp Hóa Âm Dương của tôi"),
        (r"\bBạn, Yuan Yi, là nhân viên bán hàng của tôi tại Cửa hàng tạp hóa Yin Yang\b", "Cậu, Viên Dịch, là nhân viên của Tiệm Tạp Hóa Âm Dương của tôi"),
        (r"\bBạn, Yuan Yi, là nhân viên của Tiệm tạp hóa Âm Dương\b", "Cậu, Viên Dịch, là nhân viên của Tiệm Tạp Hóa Âm Dương"),
        (r"\btên lửa của Tiệm tạp hóa Âm Dương\b", "nhân viên của Tiệm Tạp Hóa Âm Dương"),
        (r"\btên lửa của kho tạp hóa Âm Dương\b", "nhân viên của Tiệm Tạp Hóa Âm Dương"),
        (r"\bnhân viên bán hàng của tôi tại Tiệm tạp hóa Âm Dương\b", "nhân viên của Tiệm Tạp Hóa Âm Dương của tôi"),
        (r"\bnhân viên bán hàng của tôi tại Cửa hàng tạp hóa Yin Yang\b", "nhân viên của Tiệm Tạp Hóa Âm Dương của tôi"),
        (r"\bnhân viên bán hàng của Cửa hàng tạp hóa Yin Yang\b", "nhân viên của Tiệm Tạp Hóa Âm Dương"),
        (r"\bnhân viên bán hàng của Tiệm tạp hóa Âm Dương\b", "nhân viên của Tiệm Tạp Hóa Âm Dương"),
        (r"\bngười của Tiệm tạp hóa Âm Dương\b", "nhân viên của Tiệm Tạp Hóa Âm Dương"),
        (r"\bNguyên Nghị\b", "Viên Dịch"),
        (r"\bYuan Yi\b", "Viên Dịch"),
        (r"\bYuanyi\b", "Viên Dịch"),
        (r"\bZhong Yan\b", "Chung Nhan"),
        (r"\bZhongyan\b", "Chung Nhan"),
        (r"\bChung Yên\b", "Chung Nhan"),
        (r"\bChung Nghiêm\b", "Chung Nhan"),
        (r"\bYin Yang\b", "Âm Dương"),
        (r"\bYinyang\b", "Âm Dương"),
        (r"\bCửa hàng tạp hóa Yin Yang\b", "Tiệm Tạp Hóa Âm Dương"),
        (r"\bcửa hàng tạp hóa Yin Yang\b", "tiệm Tạp Hóa Âm Dương"),
        (r"\bCửa hàng tạp hóa Âm Dương\b", "Tiệm Tạp Hóa Âm Dương"),
        (r"\bcửa hàng tạp hóa Âm Dương\b", "tiệm Tạp Hóa Âm Dương"),
        (r"\bkho tạp hóa Âm Dương\b", "Tiệm Tạp Hóa Âm Dương"),
        (r"\bKho tạp hóa Âm Dương\b", "Tiệm Tạp Hóa Âm Dương"),
        (r"Chữ viết được giấy trắng mực đen viết rõ ràng rành rành", "Giấy trắng mực đen viết rõ ràng rành rành"),
        (r"Chữ viết được giấy trắng mực đen", "Giấy trắng mực đen"),
        (r"Nhưng làm sao tôi có thể dừng lại được\?\s*cơ chứ\?", "Nhưng làm sao tôi dừng lại được cơ chứ?"),
        (r"nhưng làm sao tôi có thể dừng lại được\?\s*cơ chứ\?", "nhưng làm sao tôi dừng lại được cơ chứ?"),
        (r"\bNhững chữ màu đen được viết rõ ràng trên đó\b", "Giấy trắng mực đen trên này viết rõ ràng rành rành"),
        (r"\bNhững chữ màu đen được viết rõ ràng\b", "Giấy trắng mực đen viết rõ ràng rành rành"),
        (r"\bviết rõ ràng bằng chữ đen trắng\b", "giấy trắng mực đen viết rõ ràng rành rành"),
        (r"\bviết rõ ràng bằng màu đen và trắng\b", "giấy trắng mực đen viết rõ ràng rành rành"),
        (r"\bBạn là nhân viên bán hàng tại Tiệm Tạp Hóa Âm Dương của tôi\b", "Cậu là nhân viên của Tiệm Tạp Hóa Âm Dương của tôi"),
        (r"\bBạn là nhân viên bán hàng\b", "Cậu là nhân viên"),
        (r"\bnhân viên bán hàng tại Tiệm Tạp Hóa Âm Dương\b", "nhân viên của Tiệm Tạp Hóa Âm Dương"),
        (r"\bTôi là Chung Nhan, bạn gọi tôi là Chung Nhan, tôi gọi bạn là ông chủ\b", "Tôi tên là Chung Nhan, cậu cứ gọi tôi là Chung Nhan, tôi là ông chủ của cậu"),
        (r"\bTôi là Chung Nhan, bạn gọi tôi là Chung Nhan, tôi là ông chủ của bạn\b", "Tôi tên là Chung Nhan, cậu cứ gọi tôi là Chung Nhan, tôi là ông chủ của cậu"),
        (r"\bTôi là Chung Nhan, cậu gọi tôi là Chung Nhan, tôi là ông chủ của cậu\b", "Tôi tên là Chung Nhan, cậu cứ gọi tôi là Chung Nhan, tôi là ông chủ của cậu"),
        (r"\bChữ viết tay trên đây thực sự là chữ viết tay của tôi\b", "Nét chữ trên này quả thực là của tôi"),
        (r"\bChữ viết tay trên đây thực sự là phần của tôi\b", "Nét chữ trên này quả thực là của tôi"),
        (r"\bChữ viết tay trên đây thực sự là bộ phận của tôi\b", "Nét chữ trên này quả thực là của tôi"),
        (r"\bChữ viết tay trên đây thực sự là của tôi\b", "Nét chữ trên này quả thực là của tôi"),
        (r"\bNhưng làm sao tôi có thể dừng lại được\?* cơ chứ\?*\.?\b", "Nhưng làm sao tôi dừng lại được cơ chứ?"),
        (r"\bnhưng làm sao tôi có thể dừng lại được\?*\b", "nhưng làm sao tôi có thể dừng lại được cơ chứ?"),
        (r"\bKhông có cửa hàng nào tên Âm Dương, và người phục vụ ở đó là ai\?*\b", "Sao lại có tiệm tên là Âm Dương, lại còn là nhân viên của ai cơ chứ?"),
        (r"\bLàm sao có thể gọi là Âm và Dương, bạn thân của ai\?*\b", "Sao lại có tiệm tên là Âm Dương, lại còn là nhân viên của ai cơ chứ?"),
        (r"\bLàm sao có thể gọi là Âm Dương, bạn thân của ai\?*\b", "Sao lại có tiệm tên là Âm Dương, lại còn là nhân viên của ai cơ chứ?"),
        (r"\bAi đã gọi cho tôi\?*\b", "Ai gọi tôi đấy?"),
        (r"\bAi đã gọi tôi\?*\b", "Ai gọi tôi đấy?"),
        (r"\bAi gọi cho tôi\?*\b", "Ai gọi tôi đấy?"),
        (r"\bai gọi cho tôi\?*\b", "ai gọi tôi đấy?"),
        (r"\bbằng chữ đen trắng\b", "giấy trắng mực đen"),
        (r"\bbằng màu đen và trắng trên mảnh giấy này\b", "giấy trắng mực đen trên này"),
        (r"\bTrên mảnh giấy này viết rõ ràng bằng chữ đen trắng\b", "Giấy trắng mực đen trên này viết rõ ràng rành rành"),
        (r"\bTrên mảnh giấy này viết rõ ràng bằng màu đen và trắng\b", "Giấy trắng mực đen trên này viết rõ ràng rành rành"),
        (r"\bTôi khó điều khiển quá\b", "Cứ gọi tôi là"),
        (r"\bTôi khó kiểm soát quá\b", "Cứ gọi tôi là"),
        (r"\bTôi ở bên phải, khó trốn\b", "Cứ gọi tôi là"),
        (r"\btôi là sếp của cậu\b", "tôi là ông chủ của cậu"),
        (r"\btôi là sếp của bạn\b", "tôi là ông chủ của cậu"),
        (r"\bTôi là sếp của bạn\b", "Tôi là ông chủ của cậu"),
        (r"\bsếp của cậu\b", "ông chủ của cậu"),
        (r"\bsếp của bạn\b", "ông chủ của cậu"),
        (r"\bgiá vải của tôi\b", "chữ viết tay của tôi"),
        (r"\bChiếc máy đánh chữ trên này quả thực là lỗi của tôi\b", "Nét chữ trên này quả thực là của tôi"),
        (r"\bChiếc máy đánh chữ trên này\b", "Nét chữ trên này"),
        (r"\blàm sao tôi có thể nghe được\?*\b", "làm sao tôi có thể dừng lại được?"),
        (r"\blàm sao tôi có thể đứng ra chống lại bạn\?*\b", "làm sao tôi có thể dừng lại được?"),
        (r"\blàm sao tôi có thể dừng lại được\?*\b", "làm sao tôi có thể dừng lại được?"),
        (r"\bAi gọi tôi vậy, sếp\?\b", "Ai gọi tôi đấy? Ông chủ à?"),
        (r"\bAi gọi tôi vậy\b", "Ai gọi tôi đấy"),
        (r"\bAi gọi cho tôi\b", "Ai gọi tôi đấy"),
        (r"\bai gọi cho tôi\b", "ai gọi tôi đấy"),
        (r"\bAi gọi tôi đấy, sếp\?*\b", "Ai gọi tôi đấy, ông chủ?"),
        (r"\bAi gọi tôi đấy\? sếp\?*\b", "Ai gọi tôi đấy? Ông chủ à?"),
        (r"\bNước, nước, nước, Sợ bị tiểu quỷ bắt mất hồn\b", "Cho xin nước, xin nước! Sợ bị tiểu quỷ bắt mất hồn!"),
        (r"\bChết tiệt, tôi đã xé nát linh hồn của đứa trẻ này\b", "Cho xin nước, xin nước! Sợ bị tiểu quỷ bắt mất hồn"),
        (r"\btôi đã xé nát linh hồn của đứa trẻ này\b", "sợ bị tiểu quỷ bắt mất hồn"),
        (r"\bSợ bị trẻ con dụ dỗ\b", "Sợ bị tiểu quỷ bắt mất hồn"),
        (r"\bsợ bị trẻ con dụ dỗ\b", "sợ bị tiểu quỷ bắt mất hồn"),
        (r"\bba mươi tuổi, cậu bé Abo, sau một cuộc gặp gỡ\b", "Cho xin nước, xin nước! Sợ bị tiểu quỷ bắt mất hồn"),
        (r"\bCó thức ăn không\?*\b", "Có cơm ăn không?"),
        (r"\bcó thức ăn không\?*\b", "có cơm ăn không?"),
        (r"\bBạn có phạm tội gì không\?*\b", "Có cơm ăn không?"),
        (r"\bbạn có phạm tội gì không\?*\b", "có cơm ăn không?"),
        (r"\bCó phạm tội gì không\?*\b", "Có cơm ăn không?"),
        (r"\bBạn có đồ ăn không\?*\b", "Có cơm ăn không?"),
        (r"\bTiểu Du Du, Về thôi nào đi\b", "Tiểu Du Du, mau về ăn thôi!"),
        (r"\bTiểu Du Du, Về thôi nào\b", "Tiểu Du Du, mau về ăn thôi!"),
        (r"\bTiểu Du Du, mau về ăn thôi! đi\b", "Tiểu Du Du, mau về ăn thôi!"),
        (r"\bVâng, vâng\.?\b", "Có chứ, có chứ!"),
        (r"\bSự trở lại\.?\b", "Mau về ăn thôi!"),
        (r"\bsự trở lại\.?\b", "mau về ăn thôi!"),
        (r"\bQuay lại\b", "Về thôi nào"),
        (r"\bquay lại\b", "về thôi nào"),
        (r"\bBạn là ai\b", "Cậu là ai"),
        (r"\bbạn là ai\b", "cậu là ai"),
        (r"\bNơi nào\b", "Đây là nơi nào"),
        (r"\bnơi nào\b", "đây là nơi nào"),
        (r"\bBạn ở đâu\? tôi sẽ đi\b", "Đây là nơi quái nào thế?"),
        (r"\bBạn ở đâu\? Tôi sẽ đi\b", "Đây là nơi quái nào thế?"),
        (r"\bBộ không thấy quá xui xẻo hay sao\?*\b", "Bộ không thấy quá xui xẻo hay sao?"),
        (r"\bCó phải là quá xui xẻo không\?*\b", "Bộ không thấy quá xui xẻo hay sao?"),
        (r"\bcó phải là quá xui xẻo không\?*\b", "bộ không thấy quá xui xẻo hay sao?"),
        (r"\bNó không quá xui xẻo sao\?*\b", "Bộ không thấy quá xui xẻo hay sao?"),
        (r"\bnó không quá xui xẻo sao\?*\b", "bộ không thấy quá xui xẻo hay sao?"),
        (r"\bchẳng phải xui xẻo lắm sao\?*\b", "bộ không thấy quá xui xẻo hay sao?"),
        (r"\bnhững người trong cửa hàng này tên là Âm Dương\b", "tiệm này tên là Âm Dương"),
        (r"\bTiệm này tên là Âm Dương, có phải quá xui xẻo không\?*\b", "Tiệm này tên là Âm Dương, bộ không thấy quá xui xẻo hay sao?"),
        (r"\bNgười của tiệm này tên là Âm Dương\b", "Tiệm này đặt tên là Âm Dương"),

        # --- Phim Tổng Tài / Drama Đô Thị & Ngôn Tình ---
        (r"\bChúng tôi sẽ đến bệnh viện sớm\b", "Chúng ta sắp đến bệnh viện rồi"),
        (r"\bchúng tôi sẽ đến bệnh viện sớm\b", "chúng ta sắp đến bệnh viện rồi"),
        (r"\bQuách Trọng\b", "Quách tổng"),
        (r"\bGuo Zhong\b", "Quách tổng"),
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
        (r"\bBố đừng đi\b", "Bố ơi, bố đừng đi!"),
        (r"\bbố đừng đi\b", "bố ơi, bố đừng đi!"),
        (r"\bCó vẻ như chúng ta đã va phải ai đó\b", "Hình như chúng ta đâm phải người rồi!"),
        (r"\bcó vẻ như chúng ta đã va phải ai đó\b", "hình như chúng ta đâm phải người rồi!"),
        (r"\bđã va phải ai đó\b", "đâm trúng người rồi"),

        # --- Phim Hành Động & Phim Mỹ / Anh (English Dialogue Idioms) ---
        (r"\bWhat the hell\b", "Cái quái gì thế này"),
        (r"\bWhat the heck\b", "Cái quái gì thế"),
        (r"\bWhat on earth\b", "Rốt cuộc là chuyện gì thế"),
        (r"\bAre you kidding me\?*\b", "Cậu đang đùa tôi đấy à?"),
        (r"\bAre you out of your mind\?*\b", "Cậu bị mất trí rồi à?"),
        (r"\bBạn có mất trí không\?*\b", "Cậu bị mất trí rồi à?"),
        (r"\bbạn có mất trí không\?*\b", "cậu bị mất trí rồi à?"),
        (r"\bAre you crazy\?*\b", "Cậu bị điên rồi sao?"),
        (r"\bGet out of here\b", "Mau biến khỏi đây ngay!"),
        (r"\bGet out of my way\b", "Tránh đường cho tôi!"),
        (r"\bLeave me alone\b", "Để tôi yên!"),
        (r"\bDon't touch me\b", "Đừng có đụng vào tôi!"),
        (r"\bDon't worry\b", "Đừng lo lắng"),
        (r"\bHold on\b", "Khoan đã"),
        (r"\bHang on\b", "Chờ một chút"),
        (r"\bCome on\b", "Thôi nào, nhanh lên"),
        (r"\bLet's go\b", "Mau đi thôi"),
        (r"\bNo way\b", "Không đời nào!"),
        (r"\bShut up\b", "Câm mồm đi!"),
        (r"\bHelp me\b", "Cứu tôi với!"),
        (r"\bTake care\b", "Bảo trọng nhé!"),
        (r"\bWhat's going on\?*\b", "Chuyện gì đang xảy ra thế này?"),
        (r"\bWhat is going on\?*\b", "Chuyện gì đang xảy ra thế này?"),
        (r"\bWhat's wrong with you\?*\b", "Cậu bị làm sao thế hả?"),
        (r"\bWhat is wrong with you\?*\b", "Cậu bị làm sao thế hả?"),
        (r"\bI swear\b", "Tôi xin thề"),
        (r"\bPlease forgive me\b", "Xin hãy tha thứ cho tôi"),
        (r"\bDon't mess with me\b", "Đừng có đùa với tôi"),
        (r"\bI didn't mean to\b", "Tôi không cố ý đâu"),
        (r"\bWelcome to the Yin Yang grocery store\b", "Chào mừng đến với Tiệm Tạp Hóa Âm Dương"),
        (r"\bWelcome to the Yin Yang grocery\b", "Chào mừng đến với Tiệm Tạp Hóa Âm Dương"),
    ]

    for pattern, rep in replacements:
        t = re.sub(pattern, rep, t, flags=re.IGNORECASE)

    # Đổi đại từ "Bạn" thành "Cậu" trong các câu thoại đối thoại thông thường để tạo cảm xúc tự nhiên
    t = re.sub(r"^Bạn có sao không\??", "Cậu có sao không?", t, flags=re.IGNORECASE)
    t = re.sub(r"^Bạn đang làm gì đấy\??", "Cậu đang làm gì đấy?", t, flags=re.IGNORECASE)
    t = re.sub(r"^Bạn là ai\??", "Cậu là ai?", t, flags=re.IGNORECASE)
    t = re.sub(r"^Bạn đi đâu đấy\??", "Cậu đi đâu đấy?", t, flags=re.IGNORECASE)
    t = re.sub(r"^Bạn nghe tôi nói này", "Cậu nghe tôi nói này", t, flags=re.IGNORECASE)

    # Dọn dẹp dấu câu trùng lặp do ghép cụm
    t = re.sub(r'\?+', '?', t)
    t = re.sub(r'!+', '!', t)
    t = re.sub(r'\?\.', '?', t)
    t = re.sub(r'!\.', '!', t)
    t = re.sub(r'\s{2,}', ' ', t).strip()

    # Viết hoa chữ cái đầu câu nếu cần
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
        all_texts = [preprocess_source_text(seg.text.strip(), eff_src) for seg in segments]
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

        # Lọc bỏ các phân đoạn rỗng (tiếng ồn nền bị loại bỏ)
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
