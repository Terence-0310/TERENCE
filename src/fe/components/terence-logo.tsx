/**
 * Terence Logo — SVG component with transparent background.
 * Based on the wave + paw print brand identity.
 * Props: size (px), className (optional)
 */
export function TerenceLogo({
  size = 32,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Terence logo"
      role="img"
    >
      {/* Outer circular wave stroke */}
      <path
        d="M256 48C370.4 48 464 141.6 464 256C464 322.4 434 382 388 422"
        stroke="url(#wave-grad-1)"
        strokeWidth="28"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M124 422C78 382 48 322.4 48 256C48 141.6 141.6 48 256 48"
        stroke="url(#wave-grad-2)"
        strokeWidth="28"
        strokeLinecap="round"
        fill="none"
      />

      {/* Inner wave (stylized ocean wave) */}
      <path
        d="M160 290C160 290 200 230 256 230C312 230 340 270 360 290C380 310 400 310 400 290"
        stroke="url(#wave-grad-3)"
        strokeWidth="24"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M120 310C120 310 160 260 210 280C260 300 280 340 340 340"
        stroke="url(#wave-grad-4)"
        strokeWidth="20"
        strokeLinecap="round"
        fill="none"
      />

      {/* Spiral curl */}
      <path
        d="M200 320C200 320 180 280 210 260C240 240 260 270 250 290C240 310 220 310 220 300"
        stroke="url(#wave-grad-5)"
        strokeWidth="18"
        strokeLinecap="round"
        fill="none"
      />

      {/* Paw print (top-left accent) */}
      <circle cx="175" cy="105" r="14" fill="#0F2137" />
      <circle cx="155" cy="130" r="10" fill="#0F2137" />
      <circle cx="200" cy="130" r="10" fill="#0F2137" />
      <ellipse cx="178" cy="148" rx="16" ry="12" fill="#0F2137" />

      {/* Gradient definitions */}
      <defs>
        <linearGradient id="wave-grad-1" x1="256" y1="48" x2="464" y2="256" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E90FF" />
          <stop offset="100%" stopColor="#0066CC" />
        </linearGradient>
        <linearGradient id="wave-grad-2" x1="48" y1="256" x2="256" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0077DD" />
          <stop offset="100%" stopColor="#3BA3FF" />
        </linearGradient>
        <linearGradient id="wave-grad-3" x1="160" y1="230" x2="400" y2="310" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0066CC" />
          <stop offset="100%" stopColor="#004E99" />
        </linearGradient>
        <linearGradient id="wave-grad-4" x1="120" y1="280" x2="340" y2="340" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#55B9FF" />
          <stop offset="100%" stopColor="#0077DD" />
        </linearGradient>
        <linearGradient id="wave-grad-5" x1="180" y1="260" x2="260" y2="320" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3BA3FF" />
          <stop offset="100%" stopColor="#0066CC" />
        </linearGradient>
      </defs>
    </svg>
  )
}
