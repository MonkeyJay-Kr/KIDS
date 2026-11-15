"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  startTransition,
} from "react";
import Link from "next/link";
import { compressImage, todayLocalYmd } from "@/lib/compress";

type Photo = {
  id: string;
  caption: string;
  takenAt: string;
  uploaderName: string;
  imageData: string;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
};

type Group = { months: number; label: string; photos: Photo[] };

type AlbumData = {
  album: {
    id: string;
    babyName: string;
    birthday: string;
    inviteCode: string;
  };
  me: { displayName: string; role: string };
  members: Array<{
    id: string;
    displayName: string;
    role: string;
    isMe: boolean;
  }>;
  groups: Group[];
  photoCount: number;
};

type Comment = {
  id: string;
  authorName: string;
  body: string;
  createdAt?: string;
  isMe: boolean;
};

export function AlbumClient({ albumId }: { albumId: string }) {
  const [data, setData] = useState<AlbumData | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [takenAt, setTakenAt] = useState(todayLocalYmd());
  const [showFamily, setShowFamily] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/albums/${albumId}`);
    if (!res.ok) throw new Error("load_failed");
    setData((await res.json()) as AlbumData);
  }, [albumId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch {
        if (!cancelled) setError("앨범을 열 수 없어요. 초대받아 참여했는지 확인해 주세요.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function onUpload(file: File) {
    setUploading(true);
    setError("");
    try {
      const imageData = await compressImage(file);
      const res = await fetch(`/api/albums/${albumId}/photos`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageData, caption, takenAt }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "upload_failed");
      }
      setCaption("");
      await load();
    } catch {
      setError("사진 업로드에 실패했어요. 용량이 큰 사진은 자동으로 줄여 올려요.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function toggleLike(photo: Photo) {
    const res = await fetch(`/api/photos/${photo.id}/like`, { method: "POST" });
    if (!res.ok) return;
    const result = await res.json();
    startTransition(() => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          groups: prev.groups.map((g) => ({
            ...g,
            photos: g.photos.map((p) =>
              p.id === photo.id
                ? { ...p, likedByMe: result.liked, likeCount: result.likeCount }
                : p,
            ),
          })),
        };
      });
      setActivePhoto((p) =>
        p && p.id === photo.id
          ? { ...p, likedByMe: result.liked, likeCount: result.likeCount }
          : p,
      );
    });
  }

  async function openPhoto(photo: Photo) {
    setActivePhoto(photo);
    setCommentBody("");
    const res = await fetch(`/api/photos/${photo.id}/comments`);
    if (res.ok) {
      const json = await res.json();
      setComments(json.comments);
    } else {
      setComments([]);
    }
  }

  async function sendComment(e: FormEvent) {
    e.preventDefault();
    if (!activePhoto || !commentBody.trim()) return;
    const res = await fetch(`/api/photos/${activePhoto.id}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: commentBody }),
    });
    if (!res.ok) return;
    const created = await res.json();
    setComments((c) => [...c, created]);
    setCommentBody("");
  }

  async function copyInvite() {
    if (!data) return;
    const text = `찰칵이 가족 앨범 초대\n아이: ${data.album.babyName}\n코드: ${data.album.inviteCode}\n앱에서 "초대 코드로 참여"에 입력해 주세요.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("초대 코드를 복사하지 못했어요.");
    }
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="text-[var(--muted)]">{error}</p>
        <Link href="/" className="mt-4 inline-block text-[var(--accent)]">
          홈으로
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center text-[var(--muted)]">
        앨범 불러오는 중…
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 pb-28 pt-5">
      <header className="rise mb-5 flex items-start justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-[var(--muted)]">
            ← 찰칵이
          </Link>
          <h1
            className="mt-1 text-3xl leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {data.album.babyName}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {data.photoCount}장 · 가족 {data.members.length}명 · {data.me.displayName}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowFamily(true)}
          className="rounded-2xl bg-white/80 px-3 py-2 text-sm font-bold text-[var(--accent-deep)] shadow-[var(--shadow)]"
        >
          가족 초대
        </button>
      </header>

      {error ? (
        <p className="mb-3 text-sm text-[#c44b3a]" role="alert">
          {error}
        </p>
      ) : null}

      <section className="rise mb-6 rounded-[1.5rem] bg-white/70 p-4 shadow-[var(--shadow)]">
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <h2 className="font-bold">사진 올리기</h2>
            <p className="text-sm text-[var(--muted)]">가족이 바로 함께 볼 수 있어요</p>
          </div>
          <label className="shutter cursor-pointer rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-bold text-white">
            {uploading ? "올리는 중…" : "선택"}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUpload(file);
              }}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            <span className="text-[var(--muted)]">찍은 날</span>
            <input
              type="date"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-2 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">한마디</span>
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="첫 미소"
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-2 py-2"
            />
          </label>
        </div>
      </section>

      {data.groups.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] px-6 py-14 text-center text-[var(--muted)]">
          아직 사진이 없어요.
          <br />
          첫 장을 올리면 개월별로 쌓여요.
        </div>
      ) : (
        data.groups.map((group, gi) => (
          <section
            key={group.months}
            className="rise mb-8"
            style={{ animationDelay: `${gi * 60}ms` }}
          >
            <h2 className="mb-3 text-lg font-bold">{group.label}</h2>
            <div className="grid grid-cols-2 gap-2">
              {group.photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => void openPhoto(photo)}
                  className="group overflow-hidden rounded-2xl bg-white text-left shadow-[var(--shadow)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.imageData}
                    alt={photo.caption || `${data.album.babyName} 사진`}
                    className="aspect-square w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="px-2.5 py-2">
                    <p className="truncate text-sm font-medium">
                      {photo.caption || photo.uploaderName}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      ♥ {photo.likeCount} · {photo.uploaderName}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))
      )}

      {showFamily ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/35 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowFamily(false)}
        >
          <div
            className="w-full max-w-md rounded-[1.75rem] bg-[var(--bg-1)] p-5 shadow-[var(--shadow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold">가족 초대</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              코드를 보내면 다른 가족도 사진을 올리고 함께 볼 수 있어요.
            </p>
            <div className="mt-4 rounded-2xl bg-white px-4 py-4 text-center">
              <p className="text-xs text-[var(--muted)]">초대 코드</p>
              <p
                className="mt-1 text-2xl tracking-[0.2em]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {data.album.inviteCode}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void copyInvite()}
              className="mt-3 w-full rounded-2xl bg-[var(--accent)] py-3 font-bold text-white"
            >
              {copied ? "복사됐어요!" : "초대 문구 복사"}
            </button>
            <ul className="mt-5 space-y-2">
              {data.members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm"
                >
                  <span>
                    {m.displayName}
                    {m.isMe ? " (나)" : ""}
                  </span>
                  <span className="text-[var(--muted)]">
                    {m.role === "owner" ? "만든 사람" : "가족"}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-4 w-full py-2 text-sm text-[var(--muted)]"
              onClick={() => setShowFamily(false)}
            >
              닫기
            </button>
          </div>
        </div>
      ) : null}

      {activePhoto ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[1.75rem] bg-[var(--bg-1)] sm:rounded-[1.75rem]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activePhoto.imageData}
              alt={activePhoto.caption || "사진"}
              className="max-h-[55vh] w-full object-contain bg-black"
            />
            <div className="p-4">
              <p className="font-bold">
                {activePhoto.caption || `${data.album.babyName}의 순간`}
              </p>
              <p className="text-sm text-[var(--muted)]">
                {activePhoto.takenAt} · {activePhoto.uploaderName}
              </p>
              <button
                type="button"
                onClick={() => void toggleLike(activePhoto)}
                className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-bold shadow-sm"
              >
                {activePhoto.likedByMe ? "♥ 좋아요 취소" : "♡ 좋아요"} ·{" "}
                {activePhoto.likeCount}
              </button>

              <div className="mt-4 space-y-2">
                {comments.map((c) => (
                  <div key={c.id} className="rounded-xl bg-white/80 px-3 py-2 text-sm">
                    <span className="font-bold">{c.authorName}</span>{" "}
                    <span>{c.body}</span>
                  </div>
                ))}
              </div>

              <form className="mt-3 flex gap-2" onSubmit={sendComment}>
                <input
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="댓글 남기기"
                  className="flex-1 rounded-xl border border-[var(--line)] bg-white px-3 py-2"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-[var(--accent-deep)] px-3 py-2 text-sm font-bold text-white"
                >
                  등록
                </button>
              </form>
              <button
                type="button"
                className="mt-3 w-full py-2 text-sm text-[var(--muted)]"
                onClick={() => setActivePhoto(null)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
