// ============================================
// Country Data Layer — for mega dropdown and client components
// ============================================
// Static country list with ISO 3166-1 codes supported by TMDB.

export interface Country {
  code: string
  name: string
  flag: string
}

export const COUNTRIES: Country[] = [
  { code: 'US', name: 'Mỹ', flag: '🇺🇸' },
  { code: 'KR', name: 'Hàn Quốc', flag: '🇰🇷' },
  { code: 'JP', name: 'Nhật Bản', flag: '🇯🇵' },
  { code: 'CN', name: 'Trung Quốc', flag: '🇨🇳' },
  { code: 'TH', name: 'Thái Lan', flag: '🇹🇭' },
  { code: 'IN', name: 'Ấn Độ', flag: '🇮🇳' },
  { code: 'GB', name: 'Anh', flag: '🇬🇧' },
  { code: 'FR', name: 'Pháp', flag: '🇫🇷' },
  { code: 'DE', name: 'Đức', flag: '🇩🇪' },
  { code: 'IT', name: 'Ý', flag: '🇮🇹' },
  { code: 'ES', name: 'Tây Ban Nha', flag: '🇪🇸' },
  { code: 'VN', name: 'Việt Nam', flag: '🇻🇳' },
  { code: 'HK', name: 'Hồng Kông', flag: '🇭🇰' },
  { code: 'TW', name: 'Đài Loan', flag: '🇹🇼' },
  { code: 'RU', name: 'Nga', flag: '🇷🇺' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'AU', name: 'Úc', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'SE', name: 'Thụy Điển', flag: '🇸🇪' },
]

/** Build browse URL for a country */
export function countryBrowseUrl(code: string): string {
  return `/browse?country=${code}`
}
