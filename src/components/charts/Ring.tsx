/** Small progress ring (0-100). Colour comes from the CSS class passed in `tone`. */
export function Ring({ percent, tone, label }: { percent: number; tone: "pos" | "neg"; label: string }) {
  const R = 15.9155; // circumference 100
  const p = Math.max(0, Math.min(100, percent));
  return (
    <svg className="ring" viewBox="0 0 36 36" role="img" aria-label={label}>
      <circle className="ring-track" cx="18" cy="18" r={R} fill="none" strokeWidth="4" />
      <circle
        className={`ring-fill ${tone}`}
        cx="18"
        cy="18"
        r={R}
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${p} ${100 - p}`}
        transform="rotate(-90 18 18)"
      />
    </svg>
  );
}
