import { sql } from "@/lib/db";
import { requireViewer, noStore } from "@/lib/auth";
import {
  ageInMonths,
  formatMonthLabel,
  type AlbumRow,
  type MemberRow,
  type PhotoRow,
} from "@/lib/album";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function requireMembership(albumId: string, userSub: string) {
  const rows = await sql<MemberRow>(
    `select * from members where album_id = $1 and user_sub = $2`,
    [albumId, userSub],
  );
  return rows[0] ?? null;
}

export async function GET(request: Request, { params }: Params) {
  const viewer = await requireViewer(request);
  if (viewer instanceof Response) return viewer;
  const { id } = await params;

  const member = await requireMembership(id, viewer.sub);
  if (!member) {
    return Response.json({ error: "forbidden" }, { status: 403, headers: noStore });
  }

  const albums = await sql<AlbumRow>(
    `select id, baby_name, birthday::text as birthday, invite_code, created_by, created_at::text as created_at
     from albums where id = $1`,
    [id],
  );
  const album = albums[0];
  if (!album) {
    return Response.json({ error: "not_found" }, { status: 404, headers: noStore });
  }

  const members = await sql<MemberRow>(
    `select * from members where album_id = $1 order by joined_at asc`,
    [id],
  );

  const photos = await sql<PhotoRow & { like_count: string; liked_by_me: boolean }>(
    `select p.id, p.album_id, p.uploader_sub, p.uploader_name, p.caption,
            p.taken_at::text as taken_at, p.image_data, p.created_at::text as created_at,
            (select count(*)::text from likes l where l.photo_id = p.id) as like_count,
            exists(select 1 from likes l where l.photo_id = p.id and l.user_sub = $2) as liked_by_me
     from photos p
     where p.album_id = $1
     order by p.taken_at desc, p.created_at desc`,
    [id, viewer.sub],
  );

  const birthday = String(album.birthday).slice(0, 10);
  const groupsMap = new Map<
    number,
    {
      months: number;
      label: string;
      photos: Array<{
        id: string;
        caption: string;
        takenAt: string;
        uploaderName: string;
        imageData: string;
        likeCount: number;
        likedByMe: boolean;
        createdAt: string;
      }>;
    }
  >();

  for (const p of photos) {
    const takenAt = String(p.taken_at).slice(0, 10);
    const months = ageInMonths(birthday, takenAt);
    if (!groupsMap.has(months)) {
      groupsMap.set(months, {
        months,
        label: formatMonthLabel(months),
        photos: [],
      });
    }
    groupsMap.get(months)!.photos.push({
      id: p.id,
      caption: p.caption,
      takenAt,
      uploaderName: p.uploader_name,
      imageData: p.image_data,
      likeCount: Number(p.like_count) || 0,
      likedByMe: Boolean(p.liked_by_me),
      createdAt: String(p.created_at),
    });
  }

  const groups = [...groupsMap.values()].sort((a, b) => b.months - a.months);

  return Response.json(
    {
      album: {
        id: album.id,
        babyName: album.baby_name,
        birthday,
        inviteCode: album.invite_code,
      },
      me: {
        displayName: member.display_name,
        role: member.role,
      },
      members: members.map((m) => ({
        id: m.id,
        displayName: m.display_name,
        role: m.role,
        isMe: m.user_sub === viewer.sub,
      })),
      groups,
      photoCount: photos.length,
    },
    { headers: noStore },
  );
}
