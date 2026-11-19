"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { createGoal } from "@/actions/goals";
import { carRule, homeDeposit } from "@/lib/goal-templates";
import { amountToMinor, formatMoney } from "@/lib/money";

// Calculators run in the browser (pure maths, nothing is sent until "Create goal" is pressed),
// so the page does not reload and the suggestions panel stays open. The server re-validates
// the submitted name and target with Zod like any other goal.
const AMOUNT = /^\d{1,9}(\.\d{1,2})?$/;
const RATE = /^\d{1,2}(\.\d{1,2})?$/;
const major = (n: number) => (n / 100).toFixed(2);

export function CarRuleCard({ currency }: { currency: string }) {
  const [price, setPrice] = useState("");
  const [rate, setRate] = useState("9");
  const validPrice = AMOUNT.test(price) && Number(price) > 0;
  const validRate = RATE.test(rate);
  const r = validPrice && validRate ? carRule(amountToMinor(price), Math.min(Number(rate), 40)) : null;

  return (
    <div className="card suggestion">
      <h3>Buying a car: the 20/4/10 rule</h3>
      <p className="muted">At least 20% down, a loan of 4 years at most, and car costs of no more than 10% of your gross monthly income.</p>
      <div className="row">
        <label>Car price
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.trim())} placeholder="0.00" maxLength={12} />
        </label>
        <label>Loan interest % a year
          <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value.trim())} maxLength={5} />
        </label>
      </div>
      {price !== "" && !validPrice && <p className="error">Enter the price as a number such as 850000 or 850000.50.</p>}
      {validPrice && !validRate && <p className="error">Enter the interest rate as a number such as 9 or 8.5.</p>}
      {r && (
        <>
          <dl className="facts">
            <div><dt>Down payment (20%)</dt><dd>{formatMoney(r.downPayment, currency)}</dd></div>
            <div><dt>Loan</dt><dd>{formatMoney(r.loan, currency)}</dd></div>
            <div><dt>Monthly payment (4 years)</dt><dd>{formatMoney(r.monthlyPayment, currency)}</dd></div>
            <div><dt>Income needed (payment is 10%)</dt><dd>{formatMoney(r.minMonthlyIncome, currency)}</dd></div>
          </dl>
          <p className="muted">Insurance and fuel count towards the 10% too, so the real income you need is higher.</p>
          <ActionForm action={createGoal} submitLabel="Create down payment goal" className="row" resetOnSuccess focusPrefix="goal-" focusHref="/goals">
            <input type="hidden" name="name" value="Car down payment (20%)" />
            <input type="hidden" name="target" value={major(r.downPayment)} />
          </ActionForm>
        </>
      )}
    </div>
  );
}

export function HomeDepositCard({ currency }: { currency: string }) {
  const [price, setPrice] = useState("");
  const valid = AMOUNT.test(price) && Number(price) > 0;
  const deposit = valid ? homeDeposit(amountToMinor(price)) : null;

  return (
    <div className="card suggestion">
      <h3>Home deposit</h3>
      <p className="muted">A 20% deposit is a common target and can avoid extra mortgage insurance.</p>
      <div className="row">
        <label>Home price
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.trim())} placeholder="0.00" maxLength={12} />
        </label>
      </div>
      {price !== "" && !valid && <p className="error">Enter the price as a number such as 5000000.</p>}
      {deposit !== null && (
        <>
          <p>Deposit: <strong>{formatMoney(deposit, currency)}</strong></p>
          <ActionForm action={createGoal} submitLabel="Create deposit goal" className="row" resetOnSuccess focusPrefix="goal-" focusHref="/goals">
            <input type="hidden" name="name" value="Home deposit (20%)" />
            <input type="hidden" name="target" value={major(deposit)} />
          </ActionForm>
        </>
      )}
    </div>
  );
}
