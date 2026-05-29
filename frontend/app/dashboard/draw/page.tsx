"use client";

import {
  ChangeEvent,
  FormEvent,
  PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, API_BASE } from "@/lib/api";
import type { Organization } from "@/lib/types";

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
  const searchParams = useSearchParams();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const drawingRef = useRef(false);

  const [dailyPrompt, setDailyPrompt] = useState<DailyPrompt | null>(null);
  const [status, setStatus] = useState("");
  const [color, setColor] = useState(colors[0]);
  const [brushSize, setBrushSize] = useState(8);
  const [userId, setUserId] = useState(user?.id ?? "");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [caption, setCaption] = useState("");

  // Keep userId in sync if auth loads after mount.
  useEffect(() => {
    if (user?.id) setUserId(user.id);
  }, [user]);

  // Load the user's member organizations and resolve the initial selection.
  useEffect(() => {
    const queryOrgId = searchParams.get("organization_id") ?? "";
    const savedOrgId =
      typeof window !== "undefined"
        ? window.localStorage.getItem("365art_selected_org_id") ?? ""
        : "";

    apiFetch<{ organizations: Organization[] }>("/api/organizations/mine")
      .then((data) => {
        const orgs = data.organizations ?? [];
        setOrganizations(orgs);
        const nextOrgId =
          (queryOrgId && orgs.some((org) => org.id === queryOrgId)
            ? queryOrgId
            : "") ||
          (savedOrgId && orgs.some((org) => org.id === savedOrgId)
            ? savedOrgId
            : "") ||
          orgs[0]?.id ||
          "";
        setOrganizationId(nextOrgId);
        if (nextOrgId && typeof window !== "undefined") {
          window.localStorage.setItem("365art_selected_org_id", nextOrgId);
        }
      })
      .catch(() => {
        setOrganizationId(queryOrgId || savedOrgId);
      });
  }, [searchParams]);

  function selectOrganization(nextOrgId: string) {
    setOrganizationId(nextOrgId);
    setStatus("");
    if (typeof window !== "undefined") {
      if (nextOrgId) window.localStorage.setItem("365art_selected_org_id", nextOrgId);
      else window.localStorage.removeItem("365art_selected_org_id");
    }
  }

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
    setStatus("Loading prompt…");
    const query = organizationId
      ? `?organization_id=${encodeURIComponent(organizationId)}`
      : "";
    fetch(`${API_BASE}/api/prompts/daily${query}`)
      .then((r) => {
        if (!r.ok) throw new Error("Prompt is unavailable");
        return r.json();
      })
      .then((d) => {
        setDailyPrompt(d.daily_prompt);
        setStatus("");
      })
      .catch(() => {
        setDailyPrompt(null);
        setStatus("There is no prompt for this organization");
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function importImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatus("Please choose an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const rect = canvas.getBoundingClientRect();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, rect.width, rect.height);

        const scale = Math.min(rect.width / image.width, rect.height / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        const x = (rect.width - width) / 2;
        const y = (rect.height - height) / 2;
        ctx.drawImage(image, x, y, width, height);
        setStatus("Image loaded.");
      };
      image.src = String(reader.result);
    };
    reader.onerror = () => setStatus("The image could not be loaded.");
    reader.readAsDataURL(file);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const canvas = canvasRef.current;
    const currentUserId = user?.id || userId;

    if (!canvas) {
      setStatus("The drawing board is not loaded.");
      return;
    }
    if (!dailyPrompt) {
      setStatus("No daily prompt is loaded.");
      return;
    }
    if (!currentUserId) {
      setStatus("The user is not loaded. Sign in again.");
      return;
    }
    if (!organizationId) {
      setStatus("Select an organization from the dashboard before publishing.");
      return;
    }
    setStatus("Publishing…");
    try {
      const res = await fetch(`${API_BASE}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId,
          organization_id: organizationId,
          prompt_id: dailyPrompt.prompt.id,
          image_data: canvas.toDataURL("image/png"),
          caption,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Publishing failed");
      }
      setStatus("Published!");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Publishing failed");
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
              Drawing Board
            </h1>
          </div>

          <div className="flex items-end gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center border border-[#c8c2b6] bg-white px-4 text-sm font-medium text-[#18181b] hover:border-[#18181b] whitespace-nowrap"
            >
              ← Dashboard
            </Link>
          </div>
        </header>

        {/* ── Body ── */}
        <div className="grid flex-1 gap-5 lg:grid-cols-[280px_1fr]">

          {/* Sidebar */}
          <aside className="flex flex-col gap-4 border-r border-[#d8d3c7] pr-0 lg:pr-5">

            {/* Organization selector */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71717a]">
                Organization
              </p>
              {organizations.length === 0 ? (
                <p className="mt-2 text-sm text-[#b91c1c]">
                  You are not a member of any organization.{" "}
                  <a href="/organizations" className="underline hover:text-[#7c3aed]">
                    Join one
                  </a>{" "}
                  to draw.
                </p>
              ) : (
                <select
                  className="mt-2 h-10 w-full border border-[#c8c2b6] bg-white px-3 text-sm outline-none focus:border-[#7c3aed]"
                  value={organizationId}
                  onChange={(e) => selectOrganization(e.target.value)}
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              )}
            </section>

            {/* Prompt */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71717a]">
                Today&apos;s prompt
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#18181b]">
                {dailyPrompt?.prompt.title ?? "Prompt is unavailable"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#52525b]">
                {dailyPrompt?.prompt.description ??
                  "Create a prompt in the backend or switch organizations."}
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
                Color
              </p>
              <div className="mt-2 grid grid-cols-6 gap-2">
                {colors.map((swatch) => (
                  <button
                    key={swatch}
                    aria-label={`Color ${swatch}`}
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
                Brush
              </p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {brushSizes.map((size) => (
                  <button
                    key={size}
                    aria-label={`${size}px brush`}
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

            {/* Image upload */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71717a]">
                Image
              </p>
              <label className="mt-2 flex h-10 cursor-pointer items-center justify-center border border-[#c8c2b6] bg-white px-3 text-sm font-medium text-[#18181b] hover:border-[#7c3aed] hover:text-[#7c3aed]">
                Attach an image for the prompt
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={importImage}
                />
              </label>
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
                Caption
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
                Clear
              </button>
              <button
                type="submit"
                disabled={status === "Publishing…"}
                className="h-11 bg-[#18181b] px-5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70"
              >
                {status === "Publishing…" ? "Publishing…" : "Publish"}
              </button>
            </div>

            {status && (
              <p className="min-h-6 text-sm font-medium text-[#52525b]">
                {status}
              </p>
            )}
            {(!dailyPrompt || !userId || !organizationId) && (
              <p className="text-xs text-[#b91c1c]">
                {!userId
                  ? "The user is not loaded. Sign in again."
                  : organizations.length === 0
                    ? "You are not a member of any organization."
                    : !organizationId
                      ? "Select an organization to draw."
                      : "No daily prompt is loaded for this organization."}
              </p>
            )}
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
