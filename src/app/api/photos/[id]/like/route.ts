import { sql } from "@/lib/db";
import { requireViewer, noStore } from "@/lib/auth";
import type { MemberRow, PhotoRow } from "@/lib/album";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const viewer = await requireViewer(request);
  if (viewer instanceof Response) return viewer;
  const { id: photoId } = await params;

  const photos = await sql<Pick<PhotoRow, "id" | "album_id">>(
    `select id, album_id from photos where id = $1`,
    [photoId],
  );
  const photo = photos[0];
  if (!photo) {
    return Response.json({ error: "not_found" }, { status: 404, headers: noStore });
  }

  const members = await sql<MemberRow>(
    `select * from members where album_id = $1 and user_sub = $2`,
    [photo.album_id, viewer.sub],
  );
  if (!members[0]) {
    return Response.json({ error: "forbidden" }, { status: 403, headers: noStore });
  }

  const existing = await sql(
    `select 1 from likes where photo_id = $1 and user_sub = $2`,
    [photoId, viewer.sub],
  );

  if (existing[0]) {
    await sql(`delete from likes where photo_id = $1 and user_sub = $2`, [
      photoId,
      viewer.sub,
    ]);
  } else {
    await sql(`insert into likes (photo_id, user_sub) values ($1, $2)`, [
      photoId,
      viewer.sub,
    ]);
  }

  const counts = await sql<{ count: string }>(
    `select count(*)::text as count from likes where photo_id = $1`,
    [photoId],
  );

  return Response.json(
    {
      liked: !existing[0],
      likeCount: Number(counts[0]?.count ?? 0),
    },
    { headers: noStore },
  );
}
