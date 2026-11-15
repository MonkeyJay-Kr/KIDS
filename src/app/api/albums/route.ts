import { sql } from "@/lib/db";
import { requireViewer, noStore } from "@/lib/auth";
import { makeInviteCode, newId } from "@/lib/album";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const viewer = await requireViewer(request);
  if (viewer instanceof Response) return viewer;

  let body: { babyName?: string; birthday?: string; displayName?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400, headers: noStore });
  }

  const babyName = body.babyName?.trim() ?? "";
  const birthday = body.birthday?.trim() ?? "";
  const displayName = body.displayName?.trim() || viewer.name;

  if (!babyName || babyName.length > 40) {
    return Response.json({ error: "invalid_baby_name" }, { status: 400, headers: noStore });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
    return Response.json({ error: "invalid_birthday" }, { status: 400, headers: noStore });
  }

  const albumId = newId();
  const memberId = newId();
  let inviteCode = makeInviteCode();

  for (let i = 0; i < 5; i++) {
    try {
      await sql(
        `insert into albums (id, baby_name, birthday, invite_code, created_by)
         values ($1, $2, $3::date, $4, $5)`,
        [albumId, babyName, birthday, inviteCode, viewer.sub],
      );
      break;
    } catch {
      inviteCode = makeInviteCode();
      if (i === 4) {
        return Response.json({ error: "create_failed" }, { status: 500, headers: noStore });
      }
    }
  }

  await sql(
    `insert into members (id, album_id, user_sub, display_name, role)
     values ($1, $2, $3, $4, 'owner')`,
    [memberId, albumId, viewer.sub, displayName],
  );

  return Response.json(
    { id: albumId, inviteCode, babyName, birthday },
    { status: 201, headers: noStore },
  );
}
