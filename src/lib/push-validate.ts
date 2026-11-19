// Pure module (no imports): shape checks for a browser push subscription.
//
// The server will later POST to the endpoint a client gives us, so an unchecked endpoint would
// be an SSRF hole (a user could point it at an internal address). Only the push services that
// real browsers use are allowed, and only over https.

const ALLOWED_HOSTS = [
  "fcm.googleapis.com", // Chrome, Edge, Brave, Android
  "updates.push.services.mozilla.com", // Firefox
  "web.push.apple.com", // Safari and installed iPhone apps
];
const ALLOWED_SUFFIXES = [
  ".push.services.mozilla.com",
  ".push.apple.com",
  ".notify.windows.com", // legacy Edge/Windows
];

export function isAllowedPushEndpoint(raw: string): boolean {
  if (typeof raw !== "string" || raw.length > 1000) return false;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password || u.port) return false;
  const host = u.hostname.toLowerCase();
  if (/^[\d.]+$/.test(host) || host.includes(":")) return false; // no IP addresses
  return ALLOWED_HOSTS.includes(host) || ALLOWED_SUFFIXES.some((s) => host.endsWith(s));
}

const B64URL = /^[A-Za-z0-9_-]+={0,2}$/;

/** Keys are base64url strings: p256dh is a 65-byte point (~87 chars), auth is 16 bytes (~22 chars). */
export function isValidPushKeys(p256dh: unknown, auth: unknown): boolean {
  return (
    typeof p256dh === "string" &&
    typeof auth === "string" &&
    p256dh.length >= 80 &&
    p256dh.length <= 100 &&
    auth.length >= 20 &&
    auth.length <= 30 &&
    B64URL.test(p256dh) &&
    B64URL.test(auth)
  );
}
