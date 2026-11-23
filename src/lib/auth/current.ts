import "server-only";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import type { User } from "@/lib/db/schema";
import type { Lang } from "@/lib/i18n";
import { SESSION_COOKIE, userForToken } from "./session";

/** The signed-in user, or null. Reads the session cookie, so call it inside a Suspense boundary. */
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await connection(); // session expiry compares against the current time
  return userForToken(await getDb(), token);
}

/** The signed-in user who has finished onboarding; otherwise redirects to the right step. */
export async function requireUser(lang: Lang, { onboarded = true } = {}): Promise<User> {
  const user = await currentUser();
  if (!user) redirect(`/${lang}/signup`);
  if (onboarded && !user.onboardedAt) redirect(`/${lang}/onboard`);
  return user;
}
