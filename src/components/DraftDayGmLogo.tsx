interface DraftDayGmLogoProps {
  className?: string;
  title?: string;
}

export function DraftDayGmLogo({
  className,
  title = "Draft Day GM",
}: DraftDayGmLogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 236"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id="ddgm-shield-fill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="ddgm-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="45%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="ddgm-chrome" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="45%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="ddgm-ball" x1="20%" y1="15%" x2="80%" y2="85%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="55%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <filter id="ddgm-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#a855f7" floodOpacity="0.75" />
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#7c3aed" floodOpacity="0.35" />
        </filter>
      </defs>

      <g filter="url(#ddgm-glow)">
        <path
          d="M100 18 L168 42 V112 C168 156 142 190 100 214 C58 190 32 156 32 112 V42 Z"
          fill="url(#ddgm-shield-fill)"
          stroke="#a855f7"
          strokeWidth="4"
        />
        <path
          d="M100 24 L160 45 V110 C160 149 137 179 100 201 C63 179 40 149 40 110 V45 Z"
          fill="none"
          stroke="url(#ddgm-gold)"
          strokeWidth="3"
        />
      </g>

      <circle cx="100" cy="52" r="22" fill="url(#ddgm-ball)" stroke="#334155" strokeWidth="1.5" />
      <path
        d="M82 52 C88 42 112 42 118 52 C112 62 88 62 82 52Z"
        fill="none"
        stroke="#1e293b"
        strokeWidth="2"
      />
      <path
        d="M100 34 C108 40 108 64 100 70 C92 64 92 40 100 34Z"
        fill="none"
        stroke="#1e293b"
        strokeWidth="2"
      />
      <path d="M78 52 H122" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />

      <text
        x="100"
        y="128"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="54"
        fontWeight="900"
        fill="url(#ddgm-chrome)"
        stroke="#92400e"
        strokeWidth="1.2"
        paintOrder="stroke fill"
      >
        GM
      </text>

      <rect
        x="38"
        y="150"
        width="124"
        height="34"
        rx="6"
        fill="#111827"
        stroke="url(#ddgm-gold)"
        strokeWidth="2.5"
      />
      <text
        x="100"
        y="173"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="15"
        fontWeight="800"
        letterSpacing="2.5"
        fill="url(#ddgm-chrome)"
      >
        DRAFT DAY GM
      </text>
    </svg>
  );
}
