"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { ORDER_STATUSES } from "@/lib/smart-sleeves";

export async function setSleeveOrderStatus(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) throw new Error("Unauthorized");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!Object.hasOwn(ORDER_STATUSES, status)) throw new Error("Invalid status");
  await prisma.sleeveOrder.update({ where: { id }, data: { status } });
  revalidatePath("/admin/sleeve-orders");
  revalidatePath("/dashboard/venue/smart-sleeve", "layout");
}
