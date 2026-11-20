// Turn validation problems into plain sentences that name the field and the exact rule, without
// ever repeating what the user typed. Pure (no imports); duck-typed on Zod's issue shape.

export type Issue = {
  code: string;
  path: (string | number)[];
  message: string;
  minimum?: number | bigint;
  maximum?: number | bigint;
  type?: string;
  received?: string;
  validation?: string;
};

export const FIELD_LABELS: Record<string, string> = {
  amount: "Amount",
  target: "Target amount",
  description: "Description",
  source: "Source",
  label: "Name",
  name: "Name",
  note: "Note",
  spentOn: "Date",
  receivedOn: "Date received",
  contributedOn: "Date",
  startDate: "First date",
  endDate: "End date",
  targetDate: "Target date",
  categoryId: "Category",
  paymentMethod: "Payment method",
  reconciled: "Reconciled",
  goalId: "Goal",
  debtId: "Debt",
  original: "Total loan amount",
  apr: "Interest rate",
  minPayment: "Monthly payment",
  paidOn: "Payment date",
  interest: "Interest part",
  kind: "Type",
  frequency: "Repeat",
  currency: "Currency",
  month: "Month",
  days: "Valid for (days)",
  confirm: "Confirmation",
  csv: "The file",
  dateFormat: "Date format",
  country: "Country",
  timezone: "Timezone",
  ref: "Device",
  id: "Item",
};

// Zod's built-in English messages are not user friendly; our own custom messages are.
const isDefaultMessage = (m: string) =>
  /^(Required|Invalid|String must|Number must|Expected |Array must|Invalid enum|Invalid input)/.test(m);

function rule(i: Issue): string {
  if (!isDefaultMessage(i.message)) return i.message;
  switch (i.code) {
    case "invalid_type":
      return i.received === "undefined" ? "is required" : "is not valid";
    case "too_small":
      return i.type === "string"
        ? Number(i.minimum) <= 1
          ? "is required"
          : `must be at least ${i.minimum} characters`
        : `must be at least ${i.minimum}`;
    case "too_big":
      return i.type === "string" ? `must be at most ${i.maximum} characters` : `must be at most ${i.maximum}`;
    case "invalid_string":
      return i.validation === "uuid" ? "is not a valid choice. Pick one from the list" : "has an invalid format";
    case "invalid_enum_value":
    case "invalid_literal":
    case "invalid_union":
      return "has an unsupported value. Pick one from the list";
    default:
      return "is not valid";
  }
}

/** "Amount must be a number like 249.50. Date is required." (at most 3 issues, one per field). */
export function describeIssues(issues: Issue[]): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const i of issues) {
    const key = String(i.path[0] ?? "");
    if (seen.has(key)) continue;
    seen.add(key);
    const label = FIELD_LABELS[key] ?? "One of the fields";
    const r = rule(i);
    parts.push(`${label} ${r}`.replace(/\s+/g, " ").trim() + (/[.!?]$/.test(r) ? "" : "."));
    if (parts.length === 3) break;
  }
  return parts.length ? parts.join(" ") : "Please check the form and try again.";
}
