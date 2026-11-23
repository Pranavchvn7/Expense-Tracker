import path from "node:path";

/** Where the logged-in browser state (cookies) is saved once and reused by every test. */
export const STORAGE_STATE = path.resolve(__dirname, "../../.auth/user.json");
