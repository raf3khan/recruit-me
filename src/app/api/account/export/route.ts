import { cookies } from "next/headers";
import { SESSION_COOKIE, userForToken } from "@/lib/auth/session";
import { exportData } from "@/lib/app/service";
import { getDb } from "@/lib/db";

/** "Download my data": everything we hold about the signed-in user, as JSON. */
export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const db = await getDb();
  const user = await userForToken(db, token);
  if (!user) return new Response("Unauthorized", { status: 401 });
  const data = await exportData(db, user);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="wadhifa-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
