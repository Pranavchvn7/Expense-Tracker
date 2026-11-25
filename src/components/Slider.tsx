"use client";

import { useRef, type ReactNode } from "react";

// Horizontal slider. Each child is one slide. The previous and next buttons sit on the edges with no
// visible chrome, so they are invisible until focused; they scroll by most of the visible width.
// Touch and trackpad scrolling work as usual.
export function Slider({ label, children }: { label: string; children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const go = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };
  return (
    <div className="slider" data-testid="slider">
      <button type="button" className="slider-btn prev" onClick={() => go(-1)} aria-label={`Previous ${label}`} />
      <div className="slider-track" ref={track} tabIndex={0} aria-label={`${label} list`}>
        {children}
      </div>
      <button type="button" className="slider-btn next" onClick={() => go(1)} aria-label={`Next ${label}`} />
    </div>
  );
}
