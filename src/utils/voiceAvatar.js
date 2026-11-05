// Bản đồ ảnh đại diện nhân vật chuẩn 100% từ Studio VDT
const VOICE_AVATAR_MAP = {
  // Adam series
  'Adam Tốp Tốp': 'adam1.png',
  'Adam bựa': 'adam2.png',
  'Adam': 'adam3.png',

  // Hot voices (Ưu tiên giọng hot trước)
  'Hải Đăng': 'n10.png',
  'Trúc Ly': 'nu3.png',
  'Thiện Minh': 'ch2.png',
  'Mai Anh': 'nu4.png',
  'Thùy Dung': 'nu6.png',
  'Thiền Tâm Đức': 'n15.png',
  'Ngọc Huyền': 'nu11.png',
  'Quang Sơn': 'n13.png',
  'Ngọc Trân': 'nu26.png',

  // Nam voices (n1 - n20, ch: chú)
  'Minh Đức': 'n1.png',
  'Phạm Tuyên': 'n2.png',
  'Xuân Vĩnh': 'n4.png',
  'Thanh Bình': 'n8.png',
  'Quốc Tuấn': 'n11.png',
  'Hữu Quân': 'n5.png',
  'Anh Khôi': 'n9.png',
  'Minh Quân': 'n18.png',
  'Mạnh Dũng': 'n7.png',
  'Thái Sơn': 'n6.png',
  'Minh Triết': 'n12.png',
  'Đức Trí': 'n19.png',
  'Hoàng Nam': 'n19.png',
  'Quang Huy': 'n20.png',
  'NM1': 'n10.png',
  'SM': 'n6.png',
  'NM2': 'n9.png',
  'NamMinh': 'n1.png',
  'Thầy Bảy': 'ch2.png',

  // Nữ voices (nu1 - nu27, co: cô)
  'Ngọc Linh': 'nu5.png',
  'Đoan Trang': 'nu15.png',
  'Quỳnh Anh': 'nu27.png',
  'Ái Hân': 'nu12.png',
  'Xuân Tiên': 'nu2.png',
  'Thục Đoan': 'nu14.png',
  'Mỹ Duyên': 'nu24.png',
  'Kim Thanh': 'nu1.png',
  'Ngọc Ánh': 'nu8.png',
  'Thanh Tâm': 'nu9.png',
  'Thu Hà': 'nu7.png',
  'NF': 'nu16.png',
  'SF': 'nu17.png',
  'HoaiMy': 'nu20.png',
  'Mỹ Linh': 'nu23.png'
};

export function getVoiceAvatarUrl(voiceLabel = '', voiceId = '') {
  const searchKey = `${voiceLabel} ${voiceId}`.toLowerCase();

  for (const [key, imgName] of Object.entries(VOICE_AVATAR_MAP)) {
    if (searchKey.includes(key.toLowerCase())) {
      return `/assets/${imgName}`;
    }
  }

  if (searchKey.includes('adam')) {
    return '/assets/adam1.png';
  }
  if (['chú', 'thầy', 'bác', 'ông', 'bảy', 'kể chuyện', 'rùng rợn', 'ma'].some(w => searchKey.includes(w))) {
    return '/assets/ch2.png';
  }
  if (['cô', 'bà', 'mẹ', 'lão'].some(w => searchKey.includes(w))) {
    return '/assets/co1.png';
  }
  if (['nữ', 'chị', 'bé', 'gái', 'mai', 'ly', 'dung', 'huyền', 'trân', 'linh', 'anh', 'hân', 'tiên', 'đoan', 'duyên', 'thanh', 'ánh', 'tâm', 'hà'].some(w => searchKey.includes(w))) {
    return '/assets/nu3.png';
  }

  return '/assets/n1.png';
}
