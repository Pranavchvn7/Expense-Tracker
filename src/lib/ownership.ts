import "server-only";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";

/** BOLA guard: a client-supplied category id must belong to the authenticated user. */
export async function assertOwnCategory(userId: string, categoryId?: string) {
  if (!categoryId) return;
  const cat = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true },
  });
  if (!cat) throw notFound();
}
