import "server-only";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { sessionRef } from "@/lib/session-ref";

export async function getSecurityInfo() {
  const { userId } = await requireSession();
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { twoFactorEnabled: true },
  });
  return { twoFactorEnabled: user?.twoFactorEnabled === true };
}

/** The caller's own live sessions. Returns an opaque ref, never the id or token. */
export async function listSessions() {
  const { userId, sessionId } = await requireSession();
  const rows = await prisma.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true },
  });
  return rows.map((r) => ({
    ref: sessionRef(r.id),
    current: r.id === sessionId,
    device: (r.userAgent ?? "Unknown device").slice(0, 120),
    ipAddress: r.ipAddress ?? "unknown",
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
  }));
}
