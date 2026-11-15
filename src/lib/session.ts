import { cookies } from "next/headers";

const COOKIE = "chalcak_sid";

export async function ensureSessionId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing && existing.length >= 16) return existing;
  const sid = crypto.randomUUID();
  jar.set(COOKIE, sid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
  return sid;
}
