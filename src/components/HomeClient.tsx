"use client";

import { FormEvent, useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";

type AlbumSummary = {
  id: string;
  babyName: string;
  birthday: string;
  inviteCode: string;
  role: string;
  displayName: string;
};

type MeResponse = {
  viewer: { name: string; email: string; simulated: boolean };
  albums: AlbumSummary[];
};

export function HomeClient() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"create" | "join">("create");
  const [babyName, setBabyName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) throw new Error("me_failed");
        const data = (await res.json()) as MeResponse;
        if (!cancelled) {
          setMe(data);
          setDisplayName(data.viewer.name);
        }
      } catch {
        if (!cancelled) setError("앨범을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ babyName, birthday, displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "create_failed");
      startTransition(() => router.push(`/album/${data.id}`));
    } catch {
      setError("앨범을 만들지 못했어요. 이름과 생일을 확인해 주세요.");
      setBusy(false);
    }
  }

  async function onJoin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/albums/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inviteCode, displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "join_failed");
      startTransition(() => router.push(`/album/${data.id}`));
    } catch {
      setError("초대 코드를 확인해 주세요. 대소문자는 상관없어요.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg px-5 pb-16 pt-8">
      <header className="rise relative overflow-hidden rounded-[2rem] px-1 pb-8 pt-4">
        <div className="floaty pointer-events-none absolute -right-6 top-2 h-28 w-28 rounded-full bg-[#ffd4c8]/70 blur-2xl" />
        <div className="pointer-events-none absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-[#9fd9cc]/80 blur-2xl" />
        <p
          className="relative text-[2.75rem] leading-none tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          찰칵이
        </p>
        <h1 className="relative mt-4 text-[1.35rem] font-bold leading-snug text-[var(--ink)]">
          우리 아이 지금을,
          <br />
          가족이 함께 봐요
        </h1>
        <p className="relative mt-3 max-w-[20rem] text-[0.95rem] leading-relaxed text-[var(--muted)]">
          사진 한 번 올리면 초대된 가족이 같이 보고, 개월별로 자동 정리돼요.
        </p>
        <p className="relative mt-3 text-xs text-[var(--muted)]">
          초대 코드만 있으면 가족 누구나 참여할 수 있어요. Cursor 로그인은
          필요 없습니다.
        </p>
      </header>

      {me && me.albums.length > 0 ? (
        <section className="rise mb-8" style={{ animationDelay: "80ms" }}>
          <h2 className="mb-3 text-sm font-bold tracking-wide text-[var(--muted)]">
            내 가족 앨범
          </h2>
          <ul className="space-y-2">
            {me.albums.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-2xl bg-white/80 px-4 py-3 text-left shadow-[var(--shadow)] backdrop-blur transition hover:bg-white"
                  onClick={() => router.push(`/album/${a.id}`)}
                >
                  <span>
                    <span className="block font-bold">{a.babyName}</span>
                    <span className="text-sm text-[var(--muted)]">
                      {a.role === "owner" ? "만든 사람" : "가족"} · {a.displayName}
                    </span>
                  </span>
                  <span className="text-[var(--accent)]">열기</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        className="rise rounded-[1.75rem] bg-white/75 p-5 shadow-[var(--shadow)] backdrop-blur"
        style={{ animationDelay: "140ms" }}
      >
        <div className="mb-5 flex gap-2">
          <button
            type="button"
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
              mode === "create"
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg-0)] text-[var(--muted)]"
            }`}
            onClick={() => setMode("create")}
          >
            앨범 만들기
          </button>
          <button
            type="button"
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
              mode === "join"
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg-0)] text-[var(--muted)]"
            }`}
            onClick={() => setMode("join")}
          >
            초대 코드로 참여
          </button>
        </div>

        {mode === "create" ? (
          <form className="space-y-3" onSubmit={onCreate}>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--muted)]">
                아이 이름
              </span>
              <input
                required
                value={babyName}
                onChange={(e) => setBabyName(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-3 outline-none ring-[var(--accent)] focus:ring-2"
                placeholder="예) 지후"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--muted)]">
                생일
              </span>
              <input
                required
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-3 outline-none ring-[var(--accent)] focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--muted)]">
                내 호칭 (가족에게 보일 이름)
              </span>
              <input
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-3 outline-none ring-[var(--accent)] focus:ring-2"
                placeholder="예) 엄마, 아빠, 할머니"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="shutter mt-2 w-full rounded-2xl bg-[var(--accent-deep)] py-3.5 font-bold text-white disabled:opacity-60"
            >
              {busy ? "만드는 중…" : "가족 앨범 시작하기"}
            </button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={onJoin}>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--muted)]">
                초대 코드
              </span>
              <input
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-3 tracking-wider outline-none ring-[var(--accent)] focus:ring-2"
                placeholder="CHAL-XXXXXX"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[var(--muted)]">
                내 호칭
              </span>
              <input
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-3 outline-none ring-[var(--accent)] focus:ring-2"
                placeholder="예) 외할머니"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="shutter mt-2 w-full rounded-2xl bg-[var(--accent-deep)] py-3.5 font-bold text-white disabled:opacity-60"
            >
              {busy ? "참여 중…" : "가족 앨범 들어가기"}
            </button>
          </form>
        )}

        {error ? (
          <p className="mt-3 text-sm text-[#c44b3a]" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}
