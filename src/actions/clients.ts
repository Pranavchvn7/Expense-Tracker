"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { HttpError, notFound, safely, type ActionResult, limitReached } from "@/lib/errors";
import { clientArchiveInput, clientInput, clientUpdate, formToObject, idInput } from "@/lib/validation";

const MAX_CLIENTS = 5_000;

function refresh(id?: string) {
  revalidatePath("/clients");
  if (id) revalidatePath(`/clients/${id}`);
}

export async function createClient(fd: FormData): Promise<ActionResult<{ id: string }>> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`client:create:${userId}`, 30, 60);
    const input = clientInput.parse(formToObject(fd));
    if ((await prisma.client.count({ where: { userId } })) >= MAX_CLIENTS) throw limitReached("clients", MAX_CLIENTS);
    const created = await prisma.client.create({
      data: {
        userId,
        name: input.name,
        phone: input.phone ?? null,
        email: input.email ?? null,
        city: input.city ?? null,
        address: input.address ?? null,
        source: input.source ?? null,
        notes: input.notes ?? null,
      },
      select: { id: true },
    });
    refresh();
    return { id: created.id };
  });
}

export async function updateClient(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`client:update:${userId}`, 60, 60);
    const input = clientUpdate.parse(formToObject(fd));
    // userId in WHERE: another person's client cannot be changed by guessing its id.
    const res = await prisma.client.updateMany({
      where: { id: input.id, userId },
      data: {
        name: input.name,
        phone: input.phone ?? null,
        email: input.email ?? null,
        city: input.city ?? null,
        address: input.address ?? null,
        source: input.source ?? null,
        notes: input.notes ?? null,
      },
    });
    if (res.count !== 1) throw notFound();
    refresh(input.id);
    return undefined;
  });
}

/** Archive hides a client from the default list without losing anything. */
export async function setClientArchived(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`client:archive:${userId}`, 60, 60);
    const input = clientArchiveInput.parse(formToObject(fd));
    const res = await prisma.client.updateMany({
      where: { id: input.id, userId },
      data: { archived: input.archived === "1" },
    });
    if (res.count !== 1) throw notFound();
    refresh(input.id);
    return undefined;
  });
}

/** Deletes a client. A client with jobs is refused (archive instead) so job history is never orphaned. */
export async function deleteClient(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`client:delete:${userId}`, 30, 60);
    const { id } = idInput.parse(formToObject(fd));
    if ((await prisma.job.count({ where: { clientId: id, userId } })) > 0) {
      throw new HttpError(400, "This client has jobs. Archive the client instead, or delete its jobs first.");
    }
    const res = await prisma.client.deleteMany({ where: { id, userId } });
    if (res.count !== 1) throw notFound();
    refresh(id);
    return undefined;
  });
}
