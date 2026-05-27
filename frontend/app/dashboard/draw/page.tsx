"use client";

import { FormEvent, PointerEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth-context";
import { API_BASE } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const colors = [
  "#111827", "#52525b", "#ffffff",
  "#7f1d1d", "#ef4444", "#fb7185",
  "#f97316", "#f59e0b", "#facc15",
  "#84cc16", "#16a34a", "#14b8a6",
  "#06b6d4", "#2563eb", "#4f46e5",
  "#7c3aed", "#a855f7", "#d946ef",
  "#ec4899", "#f9a8d4", "#92400e",
  "#d97706", "#fde68a", "#f5f5dc",
];

const brushSizes = [4, 8, 14, 22];

type DailyPrompt = {
  id: string;
  date: string;
  organization_id: string | null;
  prompt: {
    id: string;
    title: string;
    description: string;
    category: string | null;
    tag: string | null;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Canvas drawing board
// ─────────────────────────────────────────────────────────────────────────────

function DrawBoard() {
  const { user } = useAuth();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const [dailyPrompt, setDailyPrompt] = useState<DailyPrompt | null>(null);
  const [status, setStatus] = useState("Зареждане на темата…");
  const [color, setColor] = useState(colors[0]);
  const [brushSize, setBrushSize] = useState(8);
  // Pre-filled from auth; user can still override.
  const [userId, setUserId] = useState(user?.id ?? "");
  const [organizationId, setOrganizationId] = useState("");
  const [caption, setCaption] = useState("");

  // Keep userId in sync if auth loads after mount.
  useEffect(() => {
    if (user?.id) setUserId(user.id);
  }, [user]);

  // Initialise the canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  // Load today's prompt whenever the organisation changes.
  useEffect(() => {
    setStatus("Зареждане на темата…");
    const query = organizationId
      ? `?organization_id=${encodeURIComponent(organizationId)}`
      : "";
    fetch(`${API_BASE}/api/prompts/daily${query}`)
      .then((r) => {
        if (!r.ok) throw new Error("Темата не е налична");
        return r.json();
      })
      .then((d) => {
        setDailyPrompt(d.daily_prompt);
        setStatus("Готово");
      })
      .catch(() => {
        setDailyPrompt(null);
        setStatus("Няма тема за тази организация");
      });
  }, [organizationId]);

  // ── Drawing handlers ──────────────────────────────────────────────────────

  function getPoint(e: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDrawing(e: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawingRef.current = true;
    canvas.setPointerCapture(e.pointerId);
    const p = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function draw(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = getPoint(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function stopDrawing(e: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(e.pointerId))
      canvas.releasePointerCapture(e.pointerId);
    drawingRef.current = false;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || !dailyPrompt) return;
    setStatus("Публикуване…");
    try {
      const res = await fetch(`${API_BASE}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          organization_id: organizationId,
          prompt_id: dailyPrompt.prompt.id,
          image_data: canvas.toDataURL("image/png"),
          caption,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Грешка при публикуване");
      }
      setStatus("Публикувано!");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Грешка при публикуване");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f5ef] text-[#171717]">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <header className="flex flex-col gap-3 border-b border-[#d8d3c7] pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7c3aed]">
              365 DaysOfArt
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-[#18181b]">
              Дъска за рисуване
            </h1>
          </div>

          <div className="flex items-end gap-3">
            {/* Org filter only (user ID pre-filled from auth) */}
            <label className="text-sm font-medium text-[#3f3f46]">
              Организация
              <input
                className="mt-1 h-10 w-full border border-[#c8c2b6] bg-white px-3 text-sm outline-none focus:border-[#7c3aed]"
                placeholder="UUID на организацията"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
              />
            </label>
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center border border-[#c8c2b6] bg-white px-4 text-sm font-medium text-[#18181b] hover:border-[#18181b] whitespace-nowrap"
            >
              ← Табло
            </Link>
          </div>
        </header>

        {/* ── Body ── */}
        <div className="grid flex-1 gap-5 lg:grid-cols-[280px_1fr]">

          {/* Sidebar */}
          <aside className="flex flex-col gap-4 border-r border-[#d8d3c7] pr-0 lg:pr-5">

            {/* Prompt */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71717a]">
                Тема за днес
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#18181b]">
                {dailyPrompt?.prompt.title ?? "Темата не е налична"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#52525b]">
                {dailyPrompt?.prompt.description ??
                  "Създай тема в бекенда или смени организацията."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-[#3f3f46]">
                {dailyPrompt?.prompt.category && (
                  <span className="border border-[#c8c2b6] bg-white px-2 py-1">
                    {dailyPrompt.prompt.category}
                  </span>
                )}
                {dailyPrompt?.prompt.tag && (
                  <span className="border border-[#c8c2b6] bg-white px-2 py-1">
                    {dailyPrompt.prompt.tag}
                  </span>
                )}
              </div>
            </section>

            {/* Color palette */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71717a]">
                Цвят
              </p>
              <div className="mt-2 grid grid-cols-6 gap-2">
                {colors.map((swatch) => (
                  <button
                    key={swatch}
                    aria-label={`Цвят ${swatch}`}
                    type="button"
                    onClick={() => setColor(swatch)}
                    style={{ backgroundColor: swatch }}
                    className={`h-9 border ${
                      color === swatch ? "border-[#18181b]" : "border-[#c8c2b6]"
                    }`}
                  />
                ))}
              </div>
            </section>

            {/* Brush size */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71717a]">
                Четка
              </p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {brushSizes.map((size) => (
                  <button
                    key={size}
                    aria-label={`${size}px четка`}
                    type="button"
                    onClick={() => setBrushSize(size)}
                    className={`flex h-10 items-center justify-center border bg-white ${
                      brushSize === size ? "border-[#18181b]" : "border-[#c8c2b6]"
                    }`}
                  >
                    <span
                      className="block rounded-full bg-[#18181b]"
                      style={{ height: size, width: size }}
                    />
                  </button>
                ))}
              </div>
            </section>
          </aside>

          {/* Canvas + form */}
          <form className="flex min-w-0 flex-col gap-4" onSubmit={submit}>
            <canvas
              ref={canvasRef}
              className="h-[56vh] min-h-[420px] w-full touch-none border border-[#c8c2b6] bg-white shadow-sm"
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
              onPointerCancel={stopDrawing}
            />

            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
              <label className="text-sm font-medium text-[#3f3f46]">
                Надпис
                <input
                  className="mt-1 h-11 w-full border border-[#c8c2b6] bg-white px-3 text-sm outline-none focus:border-[#7c3aed]"
                  maxLength={280}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </label>
              <button
                type="button"
                onClick={clearCanvas}
                className="h-11 border border-[#18181b] bg-white px-5 text-sm font-semibold text-[#18181b] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Изчисти
              </button>
              <button
                type="submit"
                disabled={!dailyPrompt || !userId || !organizationId}
                className="h-11 bg-[#18181b] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Публикувай
              </button>
            </div>

            <p className="min-h-6 text-sm font-medium text-[#52525b]">{status}</p>
          </form>
        </div>
      </section>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page export — wrapped in AuthGuard
// ─────────────────────────────────────────────────────────────────────────────

export default function DrawPage() {
  return (
    <AuthGuard>
      <DrawBoard />
    </AuthGuard>
  );
}
