/**
 * MAP-027 — the K2 shopkeeper, drawn.
 *
 * An illustrated anime/cartoon human character rather than a photograph or an
 * uncanny rendered 3D face. The distinction matters: a drawing is unmistakably a
 * welcoming mascot, so it can front the store without implying that a specific
 * named employee is sitting there waiting. MAP-027 forbids simulating staff
 * presence, and an expressive cartoon human is the honest way to have a face on
 * the counter.
 *
 * She stands free on her shadow rather than inside a medallion. Her expressions
 * are driven by state the store already knows: whether a product is selected,
 * whether something just went in the basket, or whether the customer is typing.
 *
 * Everything is inline SVG so it costs no network request and cannot be blocked
 * by the production CSP's ban on external asset hosts. Motion lives in index.css
 * and is disabled wholesale under prefers-reduced-motion.
 */

/** Illustration tones. Character art, not UI surfaces — see note in index.css. */
const SKIN = '#F6D9BE'
const SKIN_LIGHT = '#FFEBD8'
const SKIN_SHADE = '#E4B996'
const HAIR = '#3A2A22'
const HAIR_DARK = '#241813'
const HAIR_LIGHT = '#5B4335'
const HAIR_SHEEN = '#D4A876'
const CAP = '#B84E3A'
const CAP_LIGHT = '#D06A52'
const CAP_SHADE = '#9A3F2E'
const GOLD = '#C6A867'
const INK = '#2B2B2B'
const APRON = '#6E7F52'
const APRON_LIGHT = '#82936A'
const BLOUSE = '#FBF9F6'
const BLOUSE_SHADE = '#EBE5DC'
const BLUSH = '#E89B86'

/**
 * Mouth per expression.
 *
 * `delighted` is the bright open-mouthed smile; it fires on a basket add and clears
 * itself, so she is not permanently grinning at a resting shelf.
 */
const MOUTHS = {
  idle: (
    <path
      d="M55 80q5 3.5 10 0"
      stroke={INK}
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  ),
  speaking: (
    <g>
      <path d="M54 78q6 9 12 0q-6 3-12 0z" fill="#7A3B36" />
      <path d="M56 78q4 1.5 8 0" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <ellipse cx="60" cy="81.5" rx="3" ry="1.6" fill="#D96E65" />
    </g>
  ),
  delighted: (
    <g>
      <path d="M53 76q7 11 14 0q-7 3-14 0z" fill="#7A3B36" />
      <path d="M55 76.5q5 2 10 0" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <ellipse cx="60" cy="81.5" rx="4.2" ry="2.2" fill="#E8837C" />
    </g>
  ),
  listening: (
    <path
      d="M56 79.5q4 1.5 8 0"
      stroke={INK}
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  ),
}

export default function StoreKeeperAvatar({
  expression = 'idle',
  size = 168,
  waving = true,
}) {
  const mouth = MOUTHS[expression] || MOUTHS.idle
  const isDelighted = expression === 'delighted'
  const isListening = expression === 'listening'
  const browLift = isDelighted ? -2.5 : isListening ? -1.5 : 0
  const headTilt = isDelighted ? -1.5 : isListening ? 1.5 : 0

  return (
    <svg
      viewBox="0 0 120 140"
      width={size}
      height={size * (140 / 120)}
      className="k2-keeper-avatar"
      role="img"
      aria-label="K2 shopkeeper, an illustrated anime character in a K2 cap, waving hello"
    >
      <defs>
        <radialGradient id="k2-keeper-skin" cx="42%" cy="32%" r="70%">
          <stop offset="0%" stopColor={SKIN_LIGHT} />
          <stop offset="65%" stopColor={SKIN} />
          <stop offset="100%" stopColor={SKIN_SHADE} />
        </radialGradient>

        <linearGradient id="k2-keeper-cap" x1="18%" y1="0%" x2="82%" y2="100%">
          <stop offset="0%" stopColor={CAP_LIGHT} />
          <stop offset="55%" stopColor={CAP} />
          <stop offset="100%" stopColor={CAP_SHADE} />
        </linearGradient>

        <linearGradient id="k2-keeper-hair" x1="25%" y1="0%" x2="75%" y2="100%">
          <stop offset="0%" stopColor={HAIR_LIGHT} />
          <stop offset="50%" stopColor={HAIR} />
          <stop offset="100%" stopColor={HAIR_DARK} />
        </linearGradient>

        <linearGradient id="k2-keeper-apron" x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor={APRON_LIGHT} />
          <stop offset="100%" stopColor={APRON} />
        </linearGradient>

        <linearGradient id="k2-keeper-iris" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#24140D" />
          <stop offset="35%" stopColor="#4A2F1E" />
          <stop offset="70%" stopColor="#8C5C32" />
          <stop offset="100%" stopColor="#C99452" />
        </linearGradient>

        {/* Soft ground shadow filter */}
        <filter id="k2-keeper-lift" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3.5" stdDeviation="3" floodColor="#6E675E" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="60" cy="133" rx="34" ry="6" fill="#6E675E" opacity="0.18" />

      {/* Sparkles when delighted or interactive */}
      {isDelighted && (
        <g className="k2-keeper-sparkles" fill={GOLD}>
          {/* Sparkle star 1 */}
          <path d="M24 42q3-1 4-4q1 3 4 4q-3 1-4 4q-1-3-4-4z" opacity="0.85" />
          {/* Sparkle star 2 */}
          <path d="M96 36q2.5-0.8 3.5-3.5q0.8 2.5 3.5 3.5q-2.5 0.8-3.5 3.5q-0.8-2.5-3.5-3.5z" opacity="0.9" />
          {/* Sparkle dot */}
          <circle cx="28" cy="54" r="1.5" opacity="0.75" />
          <circle cx="92" cy="50" r="1.5" opacity="0.75" />
        </g>
      )}

      <g className="k2-keeper-figure" filter="url(#k2-keeper-lift)" transform={`rotate(${headTilt} 60 130)`}>
        {/* Back Hair & Low Ponytail */}
        <path d="M30 58q0-32 30-32t30 32q0 24-6 38H36q-6-14-6-38z" fill="url(#k2-keeper-hair)" />
        {/* Low ponytail bundle extending to one side */}
        <path d="M68 92q12 6 15 20q-3 6-9 2q-4-10-8-18z" fill="url(#k2-keeper-hair)" />
        {/* Ribbon tie */}
        <ellipse cx="70" cy="94" rx="2.5" ry="1.5" fill={CAP} />

        {/* Body: Blouse with collar */}
        <path d="M38 132q1-24 22-29q21 5 22 29z" fill={BLOUSE} />
        {/* Blouse neck line / collar */}
        <path d="M52 98l8 9l8-9" stroke={BLOUSE_SHADE} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M52 97l8 8l8-8" fill={BLOUSE} />
        {/* Collar Gold Button / Pin */}
        <circle cx="60" cy="104.5" r="1.3" fill={GOLD} />

        {/* Apron: tailored front panel */}
        <path d="M49 107q11-3 22 0l3 25H46z" fill="url(#k2-keeper-apron)" />
        {/* Apron top trim & straps */}
        <path d="M49 107h22" stroke={GOLD} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M51 107l-3 25M69 107l3 25" stroke={APRON_LIGHT} strokeWidth="1" opacity="0.6" />
        {/* Apron small pocket */}
        <path d="M55 120h10v8h-10z" fill={APRON_LIGHT} opacity="0.45" />
        <path d="M55 120h10" stroke={GOLD} strokeWidth="0.8" />

        {/* Resting Left Arm */}
        <path d="M40 108q-6 10-5 22" stroke={BLOUSE} strokeWidth="8" strokeLinecap="round" fill="none" />
        {/* Left cuff */}
        <path d="M36 126q-1 3 0 4" stroke={BLOUSE_SHADE} strokeWidth="1.5" fill="none" />
        {/* Left hand */}
        <circle cx="35" cy="129" r="4.6" fill="url(#k2-keeper-skin)" />

        {/* The Waving Right Arm */}
        <g className={waving ? 'k2-keeper-wave' : undefined}>
          <path d="M80 107q11-8 14-22" stroke={BLOUSE} strokeWidth="8" strokeLinecap="round" fill="none" />
          {/* Right cuff */}
          <path d="M92 86q3-1 4 1" stroke={BLOUSE_SHADE} strokeWidth="1.5" fill="none" />
          {/* Hand & anime fingers */}
          <g>
            <circle cx="95" cy="80" r="5.6" fill="url(#k2-keeper-skin)" />
            {/* Expressive open fingers */}
            <path d="M91.5 76v-4.5M94.5 74.5v-5M97.5 75v-4.5M100 76.5v-3.5" stroke={SKIN_SHADE} strokeWidth="1.7" strokeLinecap="round" />
            {/* Thumb */}
            <path d="M89.5 78.5q-1.5-1.5-1-3" stroke={SKIN_SHADE} strokeWidth="1.7" strokeLinecap="round" />
          </g>
        </g>

        {/* Neck */}
        <path d="M54 88h12v9q-6 4-12 0z" fill={SKIN_SHADE} />

        {/* Face Base: tapered anime jawline */}
        <path
          d="M39 58q0-20 21-20t21 20q0 18-9 28q-5 4-12 4t-12-4q-9-10-9-28z"
          fill="url(#k2-keeper-skin)"
        />

        {/* Side locks framing jawline */}
        <path d="M37 50q-4 26 5 40q-9-12-8-30z" fill="url(#k2-keeper-hair)" />
        <path d="M83 50q4 26-5 40q9-12 8-30z" fill="url(#k2-keeper-hair)" />
        {/* Soft side wisp highlights */}
        <path d="M36.5 56q-2 18 3 28" stroke={HAIR_LIGHT} strokeWidth="1" fill="none" opacity="0.6" />
        <path d="M83.5 56q2 18-3 28" stroke={HAIR_LIGHT} strokeWidth="1" fill="none" opacity="0.6" />

        {/* Anime Eyes */}
        <g className="k2-keeper-eyes">
          {/* Sclera */}
          <ellipse cx="49" cy="65.5" rx="6.2" ry="7.6" fill="#FFFFFF" />
          <ellipse cx="71" cy="65.5" rx="6.2" ry="7.6" fill="#FFFFFF" />

          {/* Double eyelid crease line */}
          <path d="M43.5 57.5q5-2.2 10.5 0" stroke={SKIN_SHADE} strokeWidth="1.1" fill="none" strokeLinecap="round" />
          <path d="M66 57.5q5-2.2 10.5 0" stroke={SKIN_SHADE} strokeWidth="1.1" fill="none" strokeLinecap="round" />

          {/* Irises, pupils, and catchlights */}
          <g>
            {/* Irises with gradient */}
            <ellipse cx="49.2" cy="66.2" rx="4.8" ry="6.4" fill="url(#k2-keeper-iris)" />
            <ellipse cx="71.2" cy="66.2" rx="4.8" ry="6.4" fill="url(#k2-keeper-iris)" />

            {/* Golden inner light reflection ring in lower iris */}
            <ellipse cx="49.2" cy="69.2" rx="3.6" ry="2.2" fill={GOLD} opacity="0.45" />
            <ellipse cx="71.2" cy="69.2" rx="3.6" ry="2.2" fill={GOLD} opacity="0.45" />

            {/* Pupils */}
            <ellipse cx="49.2" cy="66.5" rx="2.2" ry="3.2" fill="#120A06" />
            <ellipse cx="71.2" cy="66.5" rx="2.2" ry="3.2" fill="#120A06" />

            {/* Anime Glossy Catchlights */}
            {/* Main primary upper-left highlight */}
            <ellipse cx="47.2" cy="62.8" rx="1.8" ry="2.1" fill="#FFFFFF" />
            <ellipse cx="69.2" cy="62.8" rx="1.8" ry="2.1" fill="#FFFFFF" />
            {/* Secondary lower-right sparkle */}
            <circle cx="51.4" cy="69" r="1.1" fill="#FFFFFF" opacity="0.85" />
            <circle cx="73.4" cy="69" r="1.1" fill="#FFFFFF" opacity="0.85" />
            {/* Tiny accent shimmer */}
            <circle cx="47.8" cy="68.2" r="0.6" fill="#FFFFFF" opacity="0.6" />
            <circle cx="69.8" cy="68.2" r="0.6" fill="#FFFFFF" opacity="0.6" />
          </g>

          {/* Upper Eyelashes: Thick anime line with winged flick */}
          <path d="M42 60q6.5-4.8 14 0" stroke={INK} strokeWidth="2.7" fill="none" strokeLinecap="round" />
          <path d="M64 60q6.5-4.8 14 0" stroke={INK} strokeWidth="2.7" fill="none" strokeLinecap="round" />
          {/* Outer wing flick */}
          <path d="M55.5 59.8l2.2-1.8" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M77.5 59.8l2.2-1.8" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />

          {/* Lower lash accent */}
          <path d="M47 72.8q3.5 1 5.5-0.8" stroke="rgba(43,43,43,0.45)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M69 72.8q3.5 1 5.5-0.8" stroke="rgba(43,43,43,0.45)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>

        {/* Eyebrows */}
        <g transform={`translate(0 ${browLift})`}>
          <path d="M43 53.5q6-3 12-0.8" stroke={HAIR} strokeWidth="2.1" fill="none" strokeLinecap="round" />
          <path d="M65 52.7q6-2.2 12 0.8" stroke={HAIR} strokeWidth="2.1" fill="none" strokeLinecap="round" />
        </g>

        {/* Anime Soft Blush with diagonal micro-lines */}
        <g opacity="0.55">
          <ellipse cx="41.5" cy="73.5" rx="5" ry="2.6" fill={BLUSH} />
          <ellipse cx="78.5" cy="73.5" rx="5" ry="2.6" fill={BLUSH} />
          <path d="M39.5 73l2 2.2M42 72.5l2 2.2M44.5 73l1.8 2" stroke="#D47363" strokeWidth="0.8" strokeLinecap="round" />
          <path d="M76.5 73l2 2.2M79 72.5l2 2.2M81.5 73l1.8 2" stroke="#D47363" strokeWidth="0.8" strokeLinecap="round" />
        </g>

        {/* Delicate Anime Nose */}
        <path d="M60 69v3" stroke={SKIN_SHADE} strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="59.2" cy="72" r="0.7" fill={SKIN_SHADE} />

        {/* Dynamic Mouth */}
        {mouth}

        {/* Anime Layered Fringe / Bangs */}
        <path
          d="M38 52q3-20 22-20t22 20q-5-9-13-10q-3 5-11 5q-8 0-15 5q-3 5-5 0z"
          fill="url(#k2-keeper-hair)"
        />
        {/* Layered center lock */}
        <path d="M57 32q5 14 0 23q-2-8-6-14z" fill={HAIR_DARK} opacity="0.35" />
        <path d="M53 32q-4 13 4 21q1-7 2-15z" fill="url(#k2-keeper-hair)" />

        {/* Hair Sheen Ribbon (Anime Angel Ring) */}
        <path
          d="M42 43q18-7 36 0"
          stroke={HAIR_SHEEN}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="4 2.5 8 2.5"
          fill="none"
          opacity="0.7"
        />

        {/* The K2 Baker-Boy Cap */}
        <path d="M34 46q1-23 26-23t26 23q-26-8-52 0z" fill="url(#k2-keeper-cap)" />
        {/* Cap front panel seam */}
        <path d="M47 24q13-2 26 0l4 21q-17-4-34 0z" fill={CAP} opacity="0.35" />

        {/* Cap Visor / Brim */}
        <path d="M33 46q27-8 54 0q1 6-8 7q-19-5-38 0q-9-1-8-7z" fill={CAP_SHADE} />
        {/* Visor highlight edge */}
        <path d="M36 47.5q24-7 48 0" stroke={CAP_LIGHT} strokeWidth="1" fill="none" opacity="0.6" />

        {/* Cap Gold Button */}
        <circle cx="60" cy="24.5" r="2.4" fill={GOLD} />
        <circle cx="59.3" cy="23.8" r="0.8" fill="#FFF2D6" />

        {/* Embroidered K2 Logo */}
        <text
          x="60"
          y="42"
          textAnchor="middle"
          fontFamily="Fraunces, Georgia, serif"
          fontSize="13"
          fontWeight="700"
          fill={GOLD}
          letterSpacing="0.04em"
        >
          K2
        </text>
      </g>
    </svg>
  )
}
