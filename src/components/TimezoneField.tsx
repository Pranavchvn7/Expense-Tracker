"use client";

import { useState } from "react";

/** Timezone picker with a "use this device's timezone" shortcut. The server re-validates the value. */
export function TimezoneField({ zones, defaultValue }: { zones: string[]; defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  function detect() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && zones.includes(tz)) setValue(tz);
    } catch {
      /* unsupported: leave as is */
    }
  }
  return (
    <label>Timezone
      <span className="inline-field">
        <select name="timezone" value={value} onChange={(e) => setValue(e.target.value)}>
          <option value="">Not set (UTC)</option>
          {zones.map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
        </select>
        <button type="button" className="btn ghost small" onClick={detect}>Use this device</button>
      </span>
    </label>
  );
}
