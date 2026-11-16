import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

// No secrets here; baseURL defaults to the current origin.
export const authClient = createAuthClient({ plugins: [twoFactorClient()] });
