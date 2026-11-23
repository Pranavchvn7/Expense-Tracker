import "server-only";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

export type ClientStatus = "active" | "archived" | "all";
export type ClientSort = "name" | "added";

const CLIENT_SELECT = {
  id: true,
  name: true,
  phone: true,
  email: true,
  city: true,
  address: true,
  source: true,
  notes: true,
  archived: true,
  createdAt: true,
} as const;

export async function listClients(opts: {
  q?: string;
  status: ClientStatus;
  sort: ClientSort;
  dir: "asc" | "desc";
  page: number;
  perPage: number;
}) {
  const { userId } = await requireSession();
  const phoneDigits = opts.q ? opts.q.replace(/[\s\-().+]/g, "") : "";
  const where = {
    userId,
    ...(opts.status === "all" ? {} : { archived: opts.status === "archived" }),
    ...(opts.q
      ? {
          OR: [
            { name: { contains: opts.q, mode: "insensitive" as const } },
            ...(/^\d{3,}$/.test(phoneDigits) ? [{ phone: { contains: phoneDigits } }] : []),
            { email: { contains: opts.q, mode: "insensitive" as const } },
            { city: { contains: opts.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const orderBy =
    opts.sort === "added"
      ? [{ createdAt: opts.dir }, { id: "asc" as const }]
      : [{ name: opts.dir }, { id: "asc" as const }];
  const rows = await prisma.client.findMany({
    where,
    orderBy,
    skip: (opts.page - 1) * opts.perPage,
    take: opts.perPage + 1,
    select: CLIENT_SELECT,
  });
  return { rows: rows.slice(0, opts.perPage), hasNext: rows.length > opts.perPage };
}

export async function getClient(id: string) {
  const { userId } = await requireSession();
  return prisma.client.findFirst({ where: { id, userId }, select: CLIENT_SELECT });
}

export async function clientCounts() {
  const { userId } = await requireSession();
  const [active, archived] = await Promise.all([
    prisma.client.count({ where: { userId, archived: false } }),
    prisma.client.count({ where: { userId, archived: true } }),
  ]);
  return { active, archived };
}
