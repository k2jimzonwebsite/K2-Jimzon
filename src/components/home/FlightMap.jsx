// A deliberately lightweight editorial route map. The detailed review globe is
// loaded separately below the fold, so the hero stays fast on mobile networks.
export default function FlightMap() {
  return (
    <svg viewBox="0 0 600 300" className="h-auto w-full text-navy" role="img" aria-label="Illustrated sourcing route from Milano, Italy to Manila, Philippines">
      <g fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1">
        <path d="M20 75h560M20 150h560M20 225h560" />
        <path d="M110 24v252M220 24v252M330 24v252M440 24v252M550 24v252" />
      </g>

      <g fill="currentColor" fillOpacity="0.07" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1.2">
        <path d="M42 76 70 53l48 7 24 24 38 7 19 26-13 32-34 11-20 33-39-5-18-30-31-17-12-35Z" />
        <path d="m188 53 40-23 57 16 20 28-20 19-17 29-26 7-15 39-29-20-3-34-24-27Z" />
        <path d="m274 72 54-31 75 4 42 22 63 10 45 38-17 25-49 2-21 24-55 5-36 30-38-15-27-35-39-19-23-34Z" />
        <path d="m449 206 42-13 34 14 18 27-24 22-43-8-33-21Z" />
        <path d="m510 158 10 6-5 18-8-12Zm21 19 7 7-4 14-8-9Z" />
      </g>

      <path d="M205 105 Q355 18 508 190" fill="none" stroke="#B63835" strokeWidth="2.4" strokeDasharray="2 9" strokeLinecap="round" />
      <g transform="translate(354 63) rotate(27)">
        <path d="M9 0 -6-5-1 0-6 5Z" fill="#762826" stroke="#FFFDF9" strokeWidth="0.7" strokeLinejoin="round" />
      </g>

      <circle cx="205" cy="105" r="6" fill="#A97832" />
      <circle cx="205" cy="105" r="2.5" fill="#FFFDF9" />
      <text x="205" y="88" textAnchor="middle" fill="currentColor" fontFamily="Fraunces, Georgia, serif" fontSize="15" fontWeight="600">Milano</text>

      <circle cx="508" cy="190" r="6" fill="#B63835" />
      <circle cx="508" cy="190" r="2.5" fill="#FFFDF9" />
      <text x="508" y="215" textAnchor="middle" fill="currentColor" fontFamily="Fraunces, Georgia, serif" fontSize="15" fontWeight="600">Manila</text>
    </svg>
  )
}
