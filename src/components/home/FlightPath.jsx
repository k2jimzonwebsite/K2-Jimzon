// Animated Milano → Manila flight route for the hero.
// A paper-plane departs Milano, arcs across, and fades in on arrival to Manila —
// looping gently. Text uses currentColor so it flips with light/dark mode.
export default function FlightPath() {
  return (
    <div className="relative mx-auto w-full max-w-md text-navy md:max-w-none">
      <svg
        viewBox="0 0 500 340"
        className="h-auto w-full"
        role="img"
        aria-label="Flight route from Milano, Italy to Manila, Philippines"
      >
        {/* Faint context arcs (like latitude lines) */}
        <path d="M35 95 Q250 25 475 150" fill="none" stroke="currentColor" strokeOpacity="0.07" strokeWidth="1.5" strokeDasharray="1 11" strokeLinecap="round" />
        <path d="M25 210 Q250 165 485 250" fill="none" stroke="currentColor" strokeOpacity="0.05" strokeWidth="1.5" strokeDasharray="1 11" strokeLinecap="round" />

        {/* The flight route */}
        <path id="k2-flight-arc" d="M90 135 Q262 28 410 255" fill="none" stroke="#D4AF37" strokeWidth="2" strokeDasharray="1 9" strokeLinecap="round" strokeOpacity="0.9" />

        {/* Milano origin */}
        <circle cx="90" cy="135" r="5" fill="#D4AF37">
          <animate attributeName="r" values="4;7.5;4" dur="2.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0.4;1" dur="2.6s" repeatCount="indefinite" />
        </circle>
        <circle cx="90" cy="135" r="2.5" fill="#B59226" />
        <text x="90" y="116" textAnchor="middle" fill="currentColor" fontFamily="Fraunces, Georgia, serif" fontSize="16" fontWeight="600">Milano 🇮🇹</text>

        {/* Manila destination */}
        <circle cx="410" cy="255" r="5" fill="#EF4444">
          <animate attributeName="r" values="4;7.5;4" dur="2.6s" begin="1.3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0.4;1" dur="2.6s" begin="1.3s" repeatCount="indefinite" />
        </circle>
        <circle cx="410" cy="255" r="2.5" fill="#B91C1C" />
        <text x="410" y="282" textAnchor="middle" fill="currentColor" fontFamily="Fraunces, Georgia, serif" fontSize="16" fontWeight="600">Manila 🇵🇭</text>

        {/* The plane — flies the arc on a loop, fading in on departure and out on arrival */}
        <g>
          <path d="M19 0 L-11 -9 L-2 0 L-11 9 Z" fill="#B91C1C" stroke="#FFFDF9" strokeWidth="0.6" strokeLinejoin="round" />
          <animateMotion dur="8s" repeatCount="indefinite" rotate="auto" calcMode="linear">
            <mpath href="#k2-flight-arc" />
          </animateMotion>
          <animate attributeName="opacity" values="0;1;1;1;0" keyTimes="0;0.12;0.5;0.88;1" dur="8s" repeatCount="indefinite" />
        </g>
      </svg>

      <p className="mt-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-navy-faint md:text-left">
        Direct monthly air cargo · ~14 days
      </p>
    </div>
  )
}
