import { sql } from "@/lib/db";
import { requireViewer, noStore } from "@/lib/auth";
import type { AlbumRow, MemberRow } from "@/lib/album";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const viewer = await requireViewer(request);
  if (viewer instanceof Response) return viewer;

  const memberships = await sql<
    MemberRow & Pick<AlbumRow, "baby_name" | "birthday" | "invite_code">
  >(
    `select m.*, a.baby_name, a.birthday::text as birthday, a.invite_code
     from members m
     join albums a on a.id = m.album_id
     where m.user_sub = $1
     order by m.joined_at desc`,
    [viewer.sub],
  );

  return Response.json(
    {
      viewer: {
        name: viewer.name,
        email: viewer.email,
        simulated: viewer.simulated,
      },
      albums: memberships.map((m) => ({
        id: m.album_id,
        babyName: m.baby_name,
        birthday: String(m.birthday).slice(0, 10),
        inviteCode: m.invite_code,
        role: m.role,
        displayName: m.display_name,
      })),
    },
    { headers: noStore },
  );
}
