// Flowing contour lines, like a topo map of the river valley, used as a faint
// texture on dark bands. Built from fixed sine waves, so server and client match.
function contour(i: number) {
  const y0 = 40 + i * 46;
  const amp = 18 + (i % 3) * 9;
  const phase = i * 0.9;
  let d = "";
  for (let x = 0; x <= 1200; x += 24) {
    const y = y0 + Math.sin(x / 170 + phase) * amp + Math.sin(x / 61 + i) * 5;
    d += `${x ? "L" : "M"}${x} ${y.toFixed(1)} `;
  }
  return d;
}

const lines = Array.from({ length: 13 }, (_, i) => contour(i));

export function Contours({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      {lines.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={i % 4 === 0 ? 1.6 : 1} />
      ))}
    </svg>
  );
}
