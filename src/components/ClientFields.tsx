type Defaults = {
  name?: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  address?: string | null;
  source?: string | null;
  notes?: string | null;
};

const SOURCES = ["Instagram", "Referral", "Walk-in", "Website", "WhatsApp", "Other"];

/** The client form fields, shared by "Add a client" and "Edit client". Server component, no state. */
export function ClientFields({ d = {} }: { d?: Defaults }) {
  return (
    <>
      <div className="row">
        <label>Name
          <input name="name" maxLength={80} defaultValue={d.name ?? ""} required autoComplete="off" />
        </label>
        <label>Phone (optional)
          <input name="phone" type="tel" inputMode="tel" maxLength={25} defaultValue={d.phone ?? ""} placeholder="+91 98765 43210" autoComplete="off" />
        </label>
      </div>
      <div className="row">
        <label>Email (optional)
          <input name="email" type="email" maxLength={254} defaultValue={d.email ?? ""} autoComplete="off" />
        </label>
        <label>City (optional)
          <input name="city" maxLength={80} defaultValue={d.city ?? ""} autoComplete="off" />
        </label>
      </div>
      <div className="row">
        <label>Address (optional)
          <input name="address" maxLength={200} defaultValue={d.address ?? ""} autoComplete="off" />
        </label>
        <label>How did they find you? (optional)
          <input name="source" maxLength={60} list="client-sources" defaultValue={d.source ?? ""} autoComplete="off" />
          <datalist id="client-sources">
            {SOURCES.map((s) => <option key={s} value={s} />)}
          </datalist>
        </label>
      </div>
      <label>Private notes (optional)
        <textarea name="notes" maxLength={1000} rows={3} defaultValue={d.notes ?? ""} placeholder="Preferences, family contact, anything you want to remember" />
      </label>
    </>
  );
}
