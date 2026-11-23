"use client";

import { useState } from "react";
import { SoftForm } from "@/components/SoftForm";

type Cat = { id: string; name: string };

/**
 * Report filters as a plain GET form: only the fields for the chosen period are rendered, so only
 * those are submitted. Nothing sensitive travels in the URL (dates and category ids only).
 */
export function ReportFilters({
  period,
  month,
  year,
  from,
  to,
  maxMonth,
  maxDate,
  categories,
  selected,
  includeNone,
}: {
  period: "month" | "year" | "custom";
  month: string;
  year: string;
  from: string;
  to: string;
  maxMonth: string;
  maxDate: string;
  categories: Cat[];
  selected: string[];
  includeNone: boolean;
}) {
  const [p, setP] = useState(period);
  const count = selected.length + (includeNone ? 1 : 0);
  return (
    <SoftForm className="card stack" action="/reports" busyId="report-body" label="Report filters">
      <div className="row">
        <label>Period
          <select data-testid="report-period" name="period" value={p} onChange={(e) => setP(e.target.value as typeof p)}>
            <option value="month">Month</option>
            <option value="year">Year</option>
            <option value="custom">Custom range</option>
          </select>
        </label>
        {p === "month" && (
          <label>Month<input type="month" name="month" defaultValue={month} max={maxMonth} min="2000-01" required /></label>
        )}
        {p === "year" && (
          <label>Year<input type="number" name="year" defaultValue={year} min={2000} max={Number(maxMonth.slice(0, 4))} required /></label>
        )}
        {p === "custom" && (
          <>
            <label>From<input type="date" name="from" defaultValue={from} max={maxDate} min="2000-01-01" required /></label>
            <label>To<input type="date" name="to" defaultValue={to} max={maxDate} min="2000-01-01" required /></label>
          </>
        )}
      </div>
      <details className="cat-filter" open={count > 0}>
        <summary>Categories {count > 0 ? `(${count} selected)` : "(all)"}</summary>
        <div className="cat-list">
          {categories.map((c) => (
            <label key={c.id} className="check">
              <input type="checkbox" name="cat" value={c.id} defaultChecked={selected.includes(c.id)} />
              {c.name}
            </label>
          ))}
          <label className="check">
            <input type="checkbox" name="cat" value="none" defaultChecked={includeNone} />
            Uncategorised
          </label>
        </div>
        <p className="muted">Leave all unticked to include every category. Income is not shown while categories are filtered.</p>
      </details>
      <div className="actions">
        <button className="btn" type="submit" data-testid="report-submit">Show report</button>
      </div>
    </SoftForm>
  );
}
