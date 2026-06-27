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
        <linearGradient id="ddgm-shield-left" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a1440" />
          <stop offset="100%" stopColor="#0b1224" />
        </linearGradient>
        <linearGradient id="ddgm-shield-right" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#111827" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="ddgm-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff7d6" />
          <stop offset="40%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="ddgm-chrome" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="42%" stopColor="#dbe4ef" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="ddgm-gm-edge" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <linearGradient id="ddgm-ball" x1="18%" y1="12%" x2="82%" y2="88%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="48%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="ddgm-banner-fill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#172554" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <filter id="ddgm-glow" x="-35%" y="-35%" width="170%" height="170%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#c084fc" floodOpacity="0.9" />
          <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#7c3aed" floodOpacity="0.45" />
        </filter>
        <filter id="ddgm-metal">
          <feDropShadow dx="0" dy="1.5" stdDeviation="0.4" floodColor="#ffffff" floodOpacity="0.45" />
        </filter>
        <clipPath id="ddgm-shield-clip">
          <path d="M100 24 L160 45 V110 C160 149 137 179 100 201 C63 179 40 149 40 110 V45 Z" />
        </clipPath>
      </defs>

      <g filter="url(#ddgm-glow)">
        <path
          d="M100 18 L168 42 V112 C168 156 142 190 100 214 C58 190 32 156 32 112 V42 Z"
          fill="#4c1d95"
          opacity="0.35"
        />
        <path
          d="M100 18 L168 42 V112 C168 156 142 190 100 214 C58 190 32 156 32 112 V42 Z"
          fill="url(#ddgm-shield-left)"
          stroke="#c084fc"
          strokeWidth="4.5"
        />
        <path
          d="M100 24 L160 45 V110 C160 149 137 179 100 201 C63 179 40 149 40 110 V45 Z"
          fill="none"
          stroke="url(#ddgm-gold)"
          strokeWidth="3.2"
        />
        <g clipPath="url(#ddgm-shield-clip)">
          <path d="M40 45 H100 V201 H40 Z" fill="url(#ddgm-shield-left)" />
          <path d="M100 45 H160 V201 H100 Z" fill="url(#ddgm-shield-right)" />
          <path d="M100 45 V201" stroke="rgba(15,23,42,0.55)" strokeWidth="1.2" />
        </g>
      </g>

      <g filter="url(#ddgm-metal)">
        <circle cx="100" cy="50" r="23" fill="url(#ddgm-ball)" stroke="#1e293b" strokeWidth="1.6" />
        <path
          d="M81 50 C87.5 39 112.5 39 119 50 C112.5 61 87.5 61 81 50Z"
          fill="none"
          stroke="#0f172a"
          strokeWidth="2.1"
        />
        <path
          d="M100 31 C109 38 109 62 100 69 C91 62 91 38 100 31Z"
          fill="none"
          stroke="#0f172a"
          strokeWidth="2.1"
        />
        <path d="M77 50 H123" stroke="#0f172a" strokeWidth="2.1" strokeLinecap="round" />
        <ellipse cx="92" cy="42" rx="7" ry="4" fill="rgba(255,255,255,0.28)" />
      </g>

      <text
        x="100.8"
        y="130.5"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="56"
        fontWeight="900"
        fill="url(#ddgm-gm-edge)"
      >
        GM
      </text>
      <text
        x="100"
        y="128"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="56"
        fontWeight="900"
        fill="url(#ddgm-chrome)"
        stroke="#7c3aed"
        strokeWidth="1.4"
        paintOrder="stroke fill"
        filter="url(#ddgm-metal)"
      >
        GM
      </text>

      <path
        d="M34 154 C52 146 148 146 166 154 L158 184 C148 190 52 190 42 184 Z"
        fill="url(#ddgm-banner-fill)"
        stroke="url(#ddgm-gold)"
        strokeWidth="2.6"
      />
      <text
        x="100"
        y="174"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="14.5"
        fontWeight="800"
        letterSpacing="2.8"
        fill="url(#ddgm-chrome)"
        filter="url(#ddgm-metal)"
      >
        DRAFT DAY GM
      </text>
    </svg>
  );
}
