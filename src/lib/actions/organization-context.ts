"use server";

import { cookies } from "next/headers";
import { ORG_COOKIE } from "@/lib/auth/context";
import { revalidatePath } from "next/cache";

export async function setCurrentOrganization(organizationId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ORG_COOKIE, organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
  return { success: true };
}
