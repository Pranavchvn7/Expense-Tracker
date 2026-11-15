import { createAuthClient } from "better-auth/react";

// No secrets here; baseURL defaults to the current origin.
export const authClient = createAuthClient();
