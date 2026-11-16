#!/usr/bin/env node
// OWNER-ONLY recovery for someone who lost both their authenticator and backup codes.
// Runs on YOUR machine against the database in your environment; it is not part of the web app.
//
//   Staging/local DB:     node --env-file=.env scripts/disable-2fa.mjs someone@example.com
//   Production DB:        set DATABASE_URL and DIRECT_URL (Neon strings) for this one command only.
//
// Only do this after you are sure the request really comes from that person (in person is best).
import { createInterface } from "node:readline/promises";
import { PrismaClient } from "@prisma/client";

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email.includes("@")) {
  console.error("Usage: node scripts/disable-2fa.mjs <email>");
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question(`Turn OFF 2FA and sign out ${email} everywhere? Type YES to continue: `);
rl.close();
if (answer.trim() !== "YES") {
  console.log("Cancelled.");
  process.exit(0);
}

const prisma = new PrismaClient();
try {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    console.error("No account with that email in this database.");
    process.exit(1);
  }
  await prisma.$transaction([
    prisma.twoFactor.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false }, select: { id: true } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
  console.log("2FA turned off and all sessions signed out. They can sign in with their password and set 2FA up again.");
} finally {
  await prisma.$disconnect();
}
