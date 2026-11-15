import { sql } from "@/lib/db";
import { requireViewer, noStore } from "@/lib/auth";
import { newId, type MemberRow } from "@/lib/album";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const MAX_IMAGE_CHARS = 900_000;

export async function POST(request: Request, { params }: Params) {
  const viewer = await requireViewer(request);
  if (viewer instanceof Response) return viewer;
  const { id: albumId } = await params;

  const members = await sql<MemberRow>(
    `select * from members where album_id = $1 and user_sub = $2`,
    [albumId, viewer.sub],
  );
  const member = members[0];
  if (!member) {
    return Response.json({ error: "forbidden" }, { status: 403, headers: noStore });
  }

  let body: { imageData?: string; caption?: string; takenAt?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400, headers: noStore });
  }

  const imageData = body.imageData ?? "";
  const caption = (body.caption ?? "").trim().slice(0, 200);
  const takenAt = (body.takenAt ?? "").trim();

  if (!imageData.startsWith("data:image/")) {
    return Response.json({ error: "invalid_image" }, { status: 400, headers: noStore });
  }
  if (imageData.length > MAX_IMAGE_CHARS) {
    return Response.json({ error: "image_too_large" }, { status: 413, headers: noStore });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(takenAt)) {
    return Response.json({ error: "invalid_taken_at" }, { status: 400, headers: noStore });
  }

  const photoId = newId();
  await sql(
    `insert into photos (id, album_id, uploader_sub, uploader_name, caption, taken_at, image_data)
     values ($1, $2, $3, $4, $5, $6::date, $7)`,
    [
      photoId,
      albumId,
      viewer.sub,
      member.display_name,
      caption,
      takenAt,
      imageData,
    ],
  );

  return Response.json({ id: photoId }, { status: 201, headers: noStore });
}
