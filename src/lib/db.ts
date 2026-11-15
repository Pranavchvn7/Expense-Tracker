import "server-only";
import { PrismaClient } from "@prisma/client";

// Globally cached client: avoids exhausting Neon connections on serverless
// hot reloads / warm function instances.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
