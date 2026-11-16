// The signed-in camp's badge in the staff app: a round camp-patch emblem with
// the camp's own name set around the ring, pines and a stream in the middle.
// The name comes from the database, so every camp gets its own badge.

// Fits the name on the top arc: long names get a smaller font and tighter tracking.
function fit(name: string) {
  const ARC = 205; // usable length of the top arc, in SVG units
  const size = Math.max(8, Math.min(15, ARC / (name.length * 0.82 + 1)));
  return { size, spacing: size * 0.22 };
}

export function CampBadge({ name, className = "" }: { name: string; className?: string }) {
  const label = name.trim().toUpperCase();
  const { size, spacing } = fit(label);
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={name}>
      <defs>
        <path id="badge-top" d="M 30 100 A 70 70 0 0 1 170 100" />
        <path id="badge-bottom" d="M 22 100 A 78 78 0 0 0 178 100" />
      </defs>
      <circle cx="100" cy="100" r="96" fill="#0f2f37" />
      <circle cx="100" cy="100" r="88" fill="none" stroke="#d98d2b" strokeWidth="2" />
      <circle cx="100" cy="100" r="56" fill="#14586b" />
      <text fill="#fdfefd" fontSize={size} fontWeight="700" letterSpacing={spacing} fontFamily="var(--font-geist-sans), sans-serif">
        <textPath href="#badge-top" startOffset="50%" textAnchor="middle">
          {label}
        </textPath>
      </text>
      <text fill="#f3b97a" fontSize="11" fontWeight="600" letterSpacing="2.5" fontFamily="var(--font-geist-sans), sans-serif">
        <textPath href="#badge-bottom" startOffset="50%" textAnchor="middle">
          CAMP OFFICE
        </textPath>
      </text>
      <circle cx="26" cy="100" r="3" fill="#d98d2b" />
      <circle cx="174" cy="100" r="3" fill="#d98d2b" />
      <g fill="#3c7146">
        <path d="M100 58 L 82 98 H 118Z" />
        <path d="M78 72 L 64 102 H 92Z" />
        <path d="M122 72 L 108 102 H 136Z" />
      </g>
      <path d="M58 112 Q 72 104 86 112 T 114 112 T 142 112" stroke="#fdfefd" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M62 124 Q 76 116 90 124 T 118 124 T 138 124" stroke="#f3b97a" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
