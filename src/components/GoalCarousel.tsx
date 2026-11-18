"use client";

import Link from "next/link";
import { useRef, useState } from "react";

export type CarouselGoal = {
  id: string;
  name: string;
  savedText: string;
  targetText: string;
  pct: number;
  note: string;
};

/**
 * One goal at a time. Previous/next arrows sit on the card edges and fade in on hover or focus
 * (always faintly visible on touch screens); they loop forever. Swiping works on phones.
 */
export function GoalCarousel({ goals }: { goals: CarouselGoal[] }) {
  const [i, setI] = useState(0);
  const touchX = useRef<number | null>(null);
  const n = goals.length;
  const go = (d: number) => setI((cur) => (cur + d + n) % n);
  const g = goals[i % n];
  if (!g) return null;

  return (
    <div
      className="carousel"
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        const end = e.changedTouches[0]?.clientX;
        if (start === null || end === undefined || n < 2) return;
        if (end - start > 50) go(-1);
        else if (start - end > 50) go(1);
      }}
    >
      {n > 1 && (
        <button type="button" className="carousel-btn prev" onClick={() => go(-1)} aria-label="Previous goal">‹</button>
      )}
      <div className="carousel-body" aria-live="polite">
        <div className="row between">
          <strong>{g.name}</strong>
          <span className={g.pct >= 100 ? "tag done" : "tag"}>{g.pct >= 100 ? "Reached" : `${g.pct}%`}</span>
        </div>
        <progress max={100} value={g.pct} aria-label={`${g.name} progress`} />
        <div className="row between">
          <strong>{g.savedText}</strong>
          <span className="muted">of {g.targetText}</span>
        </div>
        {g.note && <p className="muted">{g.note}</p>}
        <Link className="btn soft small" href="/goals">Open goals</Link>
      </div>
      {n > 1 && (
        <button type="button" className="carousel-btn next" onClick={() => go(1)} aria-label="Next goal">›</button>
      )}
      {n > 1 && (
        <div className="dots" aria-hidden="true">
          {goals.map((x, idx) => (
            <span key={x.id} className={idx === i % n ? "on" : ""} />
          ))}
        </div>
      )}
    </div>
  );
}
