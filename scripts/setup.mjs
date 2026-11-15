#!/usr/bin/env node
// One-time local setup: checks Node, creates .env with a fresh random auth secret,
// and initialises git. Safe to re-run: it never overwrites an existing .env.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";

const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit" });
const out = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8" }).trim();

// 1. Node version
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 11)) {
  console.error(`Node >= 20.11 required, found ${process.versions.node}`);
  process.exit(1);
}

// 2. .env with a generated secret (never printed)
if (existsSync(".env")) {
  console.log(".env already exists, leaving it untouched.");
} else {
  const secret = randomBytes(32).toString("base64");
  const env = readFileSync(".env.example", "utf8").replace(
    /BETTER_AUTH_SECRET=.*/,
    `BETTER_AUTH_SECRET="${secret}"`,
  );
  writeFileSync(".env", env, { mode: 0o600 });
  console.log("Created .env (BETTER_AUTH_SECRET generated). Now paste your Neon URLs into it.");
}

// 3. git
if (!existsSync(".git")) {
  run("git", ["init", "-b", "main"]);
  run("git", ["add", "-A"]);
  // Safety net: refuse to commit if .env somehow got staged.
  const staged = out("git", ["diff", "--cached", "--name-only"]).split("\n");
  if (staged.some((f) => f === ".env" || (f.startsWith(".env.") && f !== ".env.example"))) {
    console.error("A real .env file is staged. Aborting before commit.");
    process.exit(1);
  }
  run("git", ["commit", "-m", "chore: initial secure expense tracker scaffold"]);
  console.log("Git repository initialised with the first commit.");
} else {
  console.log("Git repository already present, skipping.");
}

console.log("\nNext: follow SETUP.md from step 3 (Neon database).");
