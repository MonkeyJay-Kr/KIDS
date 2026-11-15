export function newId(): string {
  return crypto.randomUUID();
}

export function makeInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) code += alphabet[b % alphabet.length];
  return `CHAL-${code}`;
}

/** Age in months on a given date (YYYY-MM-DD). */
export function ageInMonths(birthday: string, onDate: string): number {
  const b = parseYmd(birthday);
  const d = parseYmd(onDate);
  let months = (d.y - b.y) * 12 + (d.m - b.m);
  if (d.day < b.day) months -= 1;
  return Math.max(0, months);
}

export function formatMonthLabel(months: number): string {
  if (months === 0) return "신생아 · 0개월";
  if (months < 12) return `${months}개월`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years}살`;
  return `${years}살 ${rem}개월`;
}

export function todayYmd(timeZone = "Asia/Seoul"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parseYmd(value: string): { y: number; m: number; day: number } {
  const [y, m, day] = value.slice(0, 10).split("-").map(Number);
  return { y, m, day };
}

export type AlbumRow = {
  id: string;
  baby_name: string;
  birthday: string;
  invite_code: string;
  created_by: string;
  created_at: string;
};

export type MemberRow = {
  id: string;
  album_id: string;
  user_sub: string;
  display_name: string;
  role: "owner" | "family";
  joined_at: string;
};

export type PhotoRow = {
  id: string;
  album_id: string;
  uploader_sub: string;
  uploader_name: string;
  caption: string;
  taken_at: string;
  image_data: string;
  created_at: string;
};
