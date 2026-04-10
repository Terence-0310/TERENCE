// ============================================
// TCoin Data Layer — virtual currency for Terence platform
// ============================================
// Demo implementation with localStorage persistence.
// Replace with real backend API when ready.

export interface TCoinTransaction {
  id: string
  type: 'earn' | 'spend'
  amount: number
  description: string
  date: string
}

export interface TCoinPackage {
  id: string
  name: string
  coins: number
  price: string
  popular?: boolean
  bonus?: number
}

export interface TCoinReward {
  id: string
  action: string
  coins: number
  description: string
  icon: string
  repeatable: boolean
}

// ── Packages ──
export const TCOIN_PACKAGES: TCoinPackage[] = [
  { id: 'starter', name: 'Gói Khởi Đầu', coins: 100, price: '19.000₫' },
  { id: 'popular', name: 'Gói Phổ Biến', coins: 500, price: '79.000₫', popular: true, bonus: 50 },
  { id: 'premium', name: 'Gói Premium', coins: 1200, price: '169.000₫', bonus: 200 },
  { id: 'vip', name: 'Gói VIP', coins: 3000, price: '399.000₫', bonus: 600 },
]

// ── Earn rewards ──
export const TCOIN_REWARDS: TCoinReward[] = [
  { id: 'daily-login', action: 'Đăng nhập hàng ngày', coins: 5, description: 'Nhận mỗi ngày khi đăng nhập', icon: '📅', repeatable: true },
  { id: 'first-review', action: 'Viết review đầu tiên', coins: 50, description: 'Thưởng khi viết review phim lần đầu', icon: '✍️', repeatable: false },
  { id: 'watch-movie', action: 'Xem phim', coins: 2, description: 'Mỗi phim xem hoàn tất', icon: '🎬', repeatable: true },
  { id: 'invite-friend', action: 'Mời bạn bè', coins: 100, description: 'Bạn bè đăng ký thành công', icon: '👥', repeatable: true },
  { id: 'share-movie', action: 'Chia sẻ phim', coins: 3, description: 'Chia sẻ phim lên mạng xã hội', icon: '📤', repeatable: true },
  { id: 'complete-profile', action: 'Hoàn thiện hồ sơ', coins: 30, description: 'Cập nhật avatar, bio, sở thích', icon: '👤', repeatable: false },
]

// ── Spend options ──
export interface TCoinSpendOption {
  id: string
  name: string
  cost: number
  description: string
  icon: string
}

export const TCOIN_SPEND_OPTIONS: TCoinSpendOption[] = [
  { id: 'remove-ads', name: 'Xóa quảng cáo 7 ngày', cost: 50, description: 'Trải nghiệm xem phim không quảng cáo', icon: '🚫' },
  { id: 'hd-quality', name: 'Nâng HD → Full HD', cost: 30, description: 'Xem phim chất lượng cao hơn', icon: '📺' },
  { id: 'early-access', name: 'Xem sớm 24h', cost: 100, description: 'Xem phim mới trước cộng đồng', icon: '⏰' },
  { id: 'exclusive-badge', name: 'Huy hiệu đặc biệt', cost: 200, description: 'Nhận badge hiển thị khi chat', icon: '🏅' },
  { id: 'room-theme', name: 'Theme phòng xem chung', cost: 80, description: 'Tùy chỉnh giao diện phòng', icon: '🎨' },
  { id: 'avatar-frame', name: 'Khung Avatar Neon', cost: 150, description: 'Hiệu ứng viền Avatar độc quyền', icon: '🖼️' },
]

// ── Demo balance ──
export function getDemoBalance(): number {
  if (typeof window === 'undefined') return 250
  const saved = localStorage.getItem('tcoin_balance')
  return saved ? Number(saved) : 250
}

export function getDemoTransactions(): TCoinTransaction[] {
  return [
    { id: 't1', type: 'earn', amount: 100, description: 'Chào mừng thành viên mới', date: '15/03/2026' },
    { id: 't2', type: 'earn', amount: 50, description: 'Viết review phim đầu tiên', date: '14/03/2026' },
    { id: 't3', type: 'earn', amount: 5, description: 'Đăng nhập hàng ngày', date: '14/03/2026' },
    { id: 't4', type: 'spend', amount: 30, description: 'Nâng HD → Full HD', date: '13/03/2026' },
    { id: 't5', type: 'earn', amount: 100, description: 'Mời bạn bè thành công', date: '12/03/2026' },
    { id: 't6', type: 'earn', amount: 25, description: 'Hoàn thành nhiệm vụ tuần', date: '11/03/2026' },
  ]
}
