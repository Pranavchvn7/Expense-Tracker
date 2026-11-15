#!/usr/bin/env node
// OWNER-ONLY emergency password reset for when email reset is not set up.
// Runs on YOUR machine against the database in your environment; it is not part of the web app.
//
//   Local database:       node --env-file=.env scripts/reset-password.mjs someone@example.com
//   Production database:  set DATABASE_URL and DIRECT_URL (Neon strings) for this one command,
//                         then:  node scripts/reset-password.mjs someone@example.com
//
// The new password is typed at a hidden prompt, so it never lands in shell history.
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email.includes("@")) {
  console.error("Usage: node scripts/reset-password.mjs <email>");
  process.exit(1);
}
if (!process.stdin.isTTY) {
  console.error("Run this in an interactive terminal.");
  process.exit(1);
}

function askHidden(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    let buf = "";
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (chunk) => {
      for (const c of chunk) {
        if (c === "\u0003") process.exit(1); // Ctrl+C
        if (c === "\r" || c === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          return resolve(buf);
        }
        buf = c === "\u007f" || c === "\b" ? buf.slice(0, -1) : buf + c;
      }
    };
    stdin.on("data", onData);
  });
}

const password = await askHidden("New password (12-128 characters): ");
const repeat = await askHidden("Repeat new password: ");
if (password !== repeat) {
  console.error("Passwords do not match.");
  process.exit(1);
}
if (password.length < 12 || password.length > 128) {
  console.error("Password must be 12-128 characters.");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    console.error("No account with that email in this database.");
    process.exit(1);
  }
  const hash = await hashPassword(password);
  const res = await prisma.account.updateMany({
    where: { userId: user.id, providerId: "credential" },
    data: { password: hash },
  });
  if (res.count !== 1) {
    console.error("Could not update the password for that account.");
    process.exit(1);
  }
  await prisma.session.deleteMany({ where: { userId: user.id } }); // sign out everywhere
  console.log("Password updated and all sessions signed out.");
} finally {
  await prisma.$disconnect();
}
