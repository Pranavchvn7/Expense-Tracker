"use client";

import { useState } from "react";
import { addMonths, whatIf } from "@/lib/debt-math";
import { formatMoney } from "@/lib/money";

const AMOUNT = /^\d{1,9}(\.\d{1,2})?$/;

/** "What if I pay a bit more each month?" Runs in the browser with the same pure maths as the server. */
export function PayoffWhatIf({
  balanceMinor,
  aprBp,
  minPaymentMinor,
  currency,
  todayIso,
}: {
  balanceMinor: number;
  aprBp: number;
  minPaymentMinor: number;
  currency: string;
  todayIso: string;
}) {
  const [extra, setExtra] = useState("");
  const valid = AMOUNT.test(extra) && Number(extra) > 0;
  const w = valid ? whatIf(balanceMinor, aprBp, minPaymentMinor, Math.round(Number(extra) * 100)) : null;
  const when = (months: number | null) =>
    months === null ? "never at this payment" : addMonths(new Date(`${todayIso}T00:00:00Z`), months).toISOString().slice(0, 7);

  return (
    <div className="whatif">
      <label>Extra per month (what if?)
        <input inputMode="decimal" value={extra} onChange={(e) => setExtra(e.target.value.trim())} placeholder="0.00" maxLength={12} />
      </label>
      {extra !== "" && !valid && <p className="error">Enter an amount such as 2000 or 2000.50.</p>}
      {w && w.faster.months !== null && w.base.months !== null && (
        <p>
          Paying <strong>{formatMoney(minPaymentMinor + Math.round(Number(extra) * 100), currency)}</strong> a month clears this in{" "}
          <strong>{w.faster.months} month{w.faster.months === 1 ? "" : "s"}</strong> ({when(w.faster.months)}), {w.monthsSaved} sooner, and saves about{" "}
          <strong>{formatMoney(w.interestSavedMinor ?? 0, currency)}</strong> in interest.
        </p>
      )}
      {w && w.base.months === null && w.faster.months !== null && (
        <p>
          At your current payment this never clears, because the interest is as large as the payment. With the extra it clears in{" "}
          <strong>{w.faster.months} month{w.faster.months === 1 ? "" : "s"}</strong> ({when(w.faster.months)}).
        </p>
      )}
      {w && w.faster.months === null && (
        <p className="muted">Even with that extra the payment does not cover the interest. Try a larger amount.</p>
      )}
    </div>
  );
}
