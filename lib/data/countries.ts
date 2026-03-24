// ============================================
// Country Data Layer — for mega dropdown and client components
// ============================================
// Static country list with ISO 3166-1 codes supported by TMDB.

export interface Country {
  code: string
  name: string
}

export const COUNTRIES: Country[] = [
  { code: 'US', name: 'Mỹ' },
  { code: 'KR', name: 'Hàn Quốc' },
  { code: 'JP', name: 'Nhật Bản' },
  { code: 'CN', name: 'Trung Quốc' },
  { code: 'TH', name: 'Thái Lan' },
  { code: 'IN', name: 'Ấn Độ' },
  { code: 'GB', name: 'Anh' },
  { code: 'FR', name: 'Pháp' },
  { code: 'DE', name: 'Đức' },
  { code: 'IT', name: 'Ý' },
  { code: 'ES', name: 'Tây Ban Nha' },
  { code: 'VN', name: 'Việt Nam' },
  { code: 'HK', name: 'Hồng Kông' },
  { code: 'TW', name: 'Đài Loan' },
  { code: 'RU', name: 'Nga' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AU', name: 'Úc' },
  { code: 'CA', name: 'Canada' },
  { code: 'SE', name: 'Thụy Điển' },
]

/** Build browse URL for a country */
export function countryBrowseUrl(code: string): string {
  return `/browse?country=${code}`
}
