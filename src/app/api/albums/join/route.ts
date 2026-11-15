import { sql } from "@/lib/db";
import { requireViewer, noStore } from "@/lib/auth";
import { newId, type AlbumRow, type MemberRow } from "@/lib/album";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const viewer = await requireViewer(request);
  if (viewer instanceof Response) return viewer;

  let body: { inviteCode?: string; displayName?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400, headers: noStore });
  }

  const inviteCode = (body.inviteCode ?? "").trim().toUpperCase();
  const displayName = body.displayName?.trim() || viewer.name;
  if (!inviteCode) {
    return Response.json({ error: "missing_code" }, { status: 400, headers: noStore });
  }

  const albums = await sql<AlbumRow>(
    `select id, baby_name, birthday::text as birthday, invite_code, created_by, created_at::text as created_at
     from albums where invite_code = $1`,
    [inviteCode],
  );
  const album = albums[0];
  if (!album) {
    return Response.json({ error: "code_not_found" }, { status: 404, headers: noStore });
  }

  const existing = await sql<MemberRow>(
    `select * from members where album_id = $1 and user_sub = $2`,
    [album.id, viewer.sub],
  );
  if (existing[0]) {
    return Response.json(
      {
        id: album.id,
        babyName: album.baby_name,
        birthday: String(album.birthday).slice(0, 10),
        alreadyMember: true,
      },
      { headers: noStore },
    );
  }

  await sql(
    `insert into members (id, album_id, user_sub, display_name, role)
     values ($1, $2, $3, $4, 'family')`,
    [newId(), album.id, viewer.sub, displayName],
  );

  return Response.json(
    {
      id: album.id,
      babyName: album.baby_name,
      birthday: String(album.birthday).slice(0, 10),
      alreadyMember: false,
    },
    { status: 201, headers: noStore },
  );
}
