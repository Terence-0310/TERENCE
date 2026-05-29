// ============================================
// Watch Party — Room Themes (TCoin "room-theme" perk)
// ============================================
// A host who has redeemed the room-theme perk can pick one of these skins;
// it's stored on the room and applied to the panel for every member.

export interface RoomTheme {
  id: string
  name: string
  /** Inline style applied to the panel container (background). */
  panelStyle: React.CSSProperties
  /** Accent color used for the room-code chip / highlights. */
  accent: string
}

export const ROOM_THEMES: RoomTheme[] = [
  {
    id: 'default',
    name: 'Mặc định',
    panelStyle: {},
    accent: '#2dd4bf',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    panelStyle: { background: 'linear-gradient(160deg, #0b1026 0%, #1b2a4a 55%, #0e2233 100%)' },
    accent: '#8b5cf6',
  },
  {
    id: 'sunset',
    name: 'Hoàng hôn',
    panelStyle: { background: 'linear-gradient(160deg, #2a0a18 0%, #3a1320 55%, #1a0a14 100%)' },
    accent: '#fb7185',
  },
  {
    id: 'forest',
    name: 'Rừng đêm',
    panelStyle: { background: 'linear-gradient(160deg, #06180f 0%, #0e2a1a 55%, #07140d 100%)' },
    accent: '#34d399',
  },
  {
    id: 'midnight',
    name: 'Nửa đêm',
    panelStyle: { background: 'linear-gradient(160deg, #05060a 0%, #0d1018 55%, #04050a 100%)' },
    accent: '#60a5fa',
  },
]

export const DEFAULT_ROOM_THEME = ROOM_THEMES[0]

export function getRoomTheme(id?: string | null): RoomTheme {
  return ROOM_THEMES.find((t) => t.id === id) ?? DEFAULT_ROOM_THEME
}

/** Valid theme ids — used by the API validator. */
export const ROOM_THEME_IDS = ROOM_THEMES.map((t) => t.id)
