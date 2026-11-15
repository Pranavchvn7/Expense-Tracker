"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { HttpError, notFound, safely, type ActionResult } from "@/lib/errors";
import { categoryInput, formToObject, idInput } from "@/lib/validation";

const MAX_CATEGORIES = 50;

export async function createCategory(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`category:create:${userId}`, 20, 60);
    const { name } = categoryInput.parse(formToObject(fd));

    const count = await prisma.category.count({ where: { userId } });
    if (count >= MAX_CATEGORIES) throw new HttpError(400, "Category limit reached");

    try {
      await prisma.category.create({ data: { userId, name }, select: { id: true } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new HttpError(400, "Category already exists");
      }
      throw e;
    }
    revalidatePath("/expenses");
    revalidatePath("/settings");
    return undefined;
  });
}

export async function deleteCategory(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`category:delete:${userId}`, 20, 60);
    const { id } = idInput.parse(formToObject(fd));
    const res = await prisma.category.deleteMany({ where: { id, userId } });
    if (res.count !== 1) throw notFound();
    revalidatePath("/expenses");
    revalidatePath("/settings");
    return undefined;
  });
}
