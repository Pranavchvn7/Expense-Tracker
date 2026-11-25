"use client";

import { useState, type ReactNode } from "react";

export type PaidWithItem = {
  method: string | null;
  label: string;
  count: number;
  valueText: string;
  share: number; // percent of the month's spending, 0-100
};

// One simple line icon per payment method. Unknown or unset methods use the "other" dots.
const svg = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {children}
  </svg>
);
const ICONS: Record<string, ReactNode> = {
  CASH: svg(<><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 9.5v0M18 14.5v0" /></>),
  CREDIT_CARD: svg(<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></>),
  DEBIT_CARD: svg(<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4M14 15h3" /></>),
  UPI: svg(<><rect x="6" y="2" width="12" height="20" rx="2.5" /><path d="M11 18h2" /></>),
  BANK_TRANSFER: svg(<><path d="M3 9.5 12 4l9 5.5" /><path d="M5 10v7M10 10v7M14 10v7M19 10v7M3 20h18" /></>),
  WALLET: svg(<><path d="M3 7.5h15a3 3 0 0 1 3 3V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M16 13.5h3" /></>),
};
const OTHER_ICON = svg(<><circle cx="6" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" /></>);

/**
 * Paid with, one payment method at a time. The share ring, icon and amount animate each time
 * the slide changes (the stage re-mounts with a new key). Arrows and dots move between methods.
 */
export function PaidWithCarousel({ items }: { items: PaidWithItem[] }) {
  const [i, setI] = useState(0);
  const n = items.length;
  const cur = items[i];
  if (!cur) return null;
  const go = (d: number) => setI((c) => (c + d + n) % n);

  return (
    <div className="paid-with" data-testid="paid-with">
      <div className="paid-with-stage" key={i} aria-live="polite">
        <div className="pw-visual">
          <svg className="pw-ring" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
            <circle className="pw-track" cx="18" cy="18" r="15.5" pathLength={100} />
            <circle className="pw-fill" cx="18" cy="18" r="15.5" pathLength={100} strokeDasharray={`${cur.share} 100`} />
          </svg>
          <span className="pw-icon">{(cur.method && ICONS[cur.method]) || OTHER_ICON}</span>
        </div>
        <div className="pw-text">
          <strong>{cur.label}</strong>
          <span className="pw-amount">{cur.valueText}</span>
          <span className="muted sub">
            {cur.share}% of spending · {cur.count} expense{cur.count === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      {n > 1 && (
        <div className="pw-nav">
          <button type="button" className="pw-arrow" onClick={() => go(-1)} aria-label="Previous payment method">‹</button>
          <div className="pw-dots">
            {items.map((x, idx) => (
              <button
                key={`${x.method ?? "none"}-${idx}`}
                type="button"
                className={idx === i ? "on" : undefined}
                onClick={() => setI(idx)}
                aria-label={`Show ${x.label}`}
                aria-current={idx === i ? "true" : undefined}
              />
            ))}
          </div>
          <button type="button" className="pw-arrow" onClick={() => go(1)} aria-label="Next payment method">›</button>
        </div>
      )}
    </div>
  );
}
