import { sql } from "@/lib/db";
import { requireViewer, noStore } from "@/lib/auth";
import { newId, type MemberRow, type PhotoRow } from "@/lib/album";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function assertMember(photoId: string, userSub: string) {
  const photos = await sql<Pick<PhotoRow, "id" | "album_id">>(
    `select id, album_id from photos where id = $1`,
    [photoId],
  );
  const photo = photos[0];
  if (!photo) return { error: Response.json({ error: "not_found" }, { status: 404, headers: noStore }) };
  const members = await sql<MemberRow>(
    `select * from members where album_id = $1 and user_sub = $2`,
    [photo.album_id, userSub],
  );
  if (!members[0]) {
    return { error: Response.json({ error: "forbidden" }, { status: 403, headers: noStore }) };
  }
  return { member: members[0], photo };
}

export async function GET(request: Request, { params }: Params) {
  const viewer = await requireViewer(request);
  if (viewer instanceof Response) return viewer;
  const { id: photoId } = await params;
  const gate = await assertMember(photoId, viewer.sub);
  if ("error" in gate && gate.error) return gate.error;

  const comments = await sql<{
    id: string;
    author_name: string;
    body: string;
    created_at: string;
    user_sub: string;
  }>(
    `select id, author_name, body, created_at::text as created_at, user_sub
     from comments where photo_id = $1 order by created_at asc`,
    [photoId],
  );

  return Response.json(
    {
      comments: comments.map((c) => ({
        id: c.id,
        authorName: c.author_name,
        body: c.body,
        createdAt: c.created_at,
        isMe: c.user_sub === viewer.sub,
      })),
    },
    { headers: noStore },
  );
}

export async function POST(request: Request, { params }: Params) {
  const viewer = await requireViewer(request);
  if (viewer instanceof Response) return viewer;
  const { id: photoId } = await params;
  const gate = await assertMember(photoId, viewer.sub);
  if ("error" in gate && gate.error) return gate.error;

  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400, headers: noStore });
  }

  const text = (body.body ?? "").trim().slice(0, 500);
  if (!text) {
    return Response.json({ error: "empty" }, { status: 400, headers: noStore });
  }

  const id = newId();
  await sql(
    `insert into comments (id, photo_id, user_sub, author_name, body)
     values ($1, $2, $3, $4, $5)`,
    [id, photoId, viewer.sub, gate.member!.display_name, text],
  );

  return Response.json(
    {
      id,
      authorName: gate.member!.display_name,
      body: text,
      isMe: true,
    },
    { status: 201, headers: noStore },
  );
}
