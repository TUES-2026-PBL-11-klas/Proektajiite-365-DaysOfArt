"use client";

import { FormEvent, PointerEvent, useEffect, useRef, useState } from "react";

type DailyPrompt = {
  id: string;
  date: string;
  organization_id: string | null;
  prompt: {
    id: number;
    title: string;
    description: string;
    category: string | null;
    tag: string | null;
  };
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:5000";

const colors = [
  "#111827",
  "#52525b",
  "#ffffff",
  "#7f1d1d",
  "#ef4444",
  "#fb7185",
  "#f97316",
  "#f59e0b",
  "#facc15",
  "#84cc16",
  "#16a34a",
  "#14b8a6",
  "#06b6d4",
  "#2563eb",
  "#4f46e5",
  "#7c3aed",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f9a8d4",
  "#92400e",
  "#d97706",
  "#fde68a",
  "#f5f5dc",
];
const brushSizes = [4, 8, 14, 22];

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [dailyPrompt, setDailyPrompt] = useState<DailyPrompt | null>(null);
  const [status, setStatus] = useState("Loading today's prompt");
  const [color, setColor] = useState(colors[0]);
  const [brushSize, setBrushSize] = useState(8);
  const [userId, setUserId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [caption, setCaption] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    context.scale(ratio, ratio);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, rect.width, rect.height);
    context.lineCap = "round";
    context.lineJoin = "round";
  }, []);

  useEffect(() => {
    async function loadPrompt() {
      setStatus("Loading today's prompt");
      try {
        const query = organizationId
          ? `?organization_id=${encodeURIComponent(organizationId)}`
          : "";
        const response = await fetch(`${API_BASE_URL}/api/prompts/daily${query}`);
        if (!response.ok) {
          throw new Error("Prompt is not available");
        }

        const data = await response.json();
        setDailyPrompt(data.daily_prompt);
        setStatus("Ready");
      } catch {
        setDailyPrompt(null);
        setStatus("No prompt for this organization yet");
      }
    }

    loadPrompt();
  }, [organizationId]);

  function getPoint(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    const point = getPoint(event);
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function draw(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    const point = getPoint(event);
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function stopDrawing(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    drawingRef.current = false;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, rect.width, rect.height);
  }

  async function submitDrawing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || !dailyPrompt) {
      return;
    }

    setStatus("Publishing");
    try {
      const response = await fetch(`${API_BASE_URL}/api/submissions`, {
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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Submission failed");
      }

      setStatus("Published");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Submission failed");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f5ef] text-[#171717]">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-[#d8d3c7] pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7c3aed]">
              365 DaysOfArt
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-[#18181b]">
              Drawing Board
            </h1>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm font-medium text-[#3f3f46]">
              User
              <input
                className="mt-1 h-10 w-full border border-[#c8c2b6] bg-white px-3 text-sm outline-none focus:border-[#7c3aed]"
                placeholder="User UUID"
                type="text"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-[#3f3f46]">
              Organization
              <input
                className="mt-1 h-10 w-full border border-[#c8c2b6] bg-white px-3 text-sm outline-none focus:border-[#7c3aed]"
                placeholder="Organization UUID"
                type="text"
                value={organizationId}
                onChange={(event) => setOrganizationId(event.target.value)}
              />
            </label>
          </div>
        </header>

        <div className="grid flex-1 gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="flex flex-col gap-4 border-r border-[#d8d3c7] pr-0 lg:pr-5">
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71717a]">
                Today&apos;s Prompt
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#18181b]">
                {dailyPrompt?.prompt.title ?? "Prompt unavailable"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#52525b]">
                {dailyPrompt?.prompt.description ??
                  "Create a prompt in the backend or switch organization."}
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

            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71717a]">
                Color
              </p>
              <div className="mt-2 grid grid-cols-6 gap-2">
                {colors.map((swatch) => (
                  <button
                    aria-label={`Use ${swatch}`}
                    className={`h-9 border ${
                      color === swatch ? "border-[#18181b]" : "border-[#c8c2b6]"
                    }`}
                    key={swatch}
                    onClick={() => setColor(swatch)}
                    style={{ backgroundColor: swatch }}
                    type="button"
                  />
                ))}
              </div>
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71717a]">
                Brush
              </p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {brushSizes.map((size) => (
                  <button
                    aria-label={`${size}px brush`}
                    className={`flex h-10 items-center justify-center border bg-white ${
                      brushSize === size
                        ? "border-[#18181b]"
                        : "border-[#c8c2b6]"
                    }`}
                    key={size}
                    onClick={() => setBrushSize(size)}
                    type="button"
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

          <form className="flex min-w-0 flex-col gap-4" onSubmit={submitDrawing}>
            <canvas
              className="h-[56vh] min-h-[420px] w-full touch-none border border-[#c8c2b6] bg-white shadow-sm"
              onPointerCancel={stopDrawing}
              onPointerDown={startDrawing}
              onPointerLeave={stopDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              ref={canvasRef}
            />

            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
              <label className="text-sm font-medium text-[#3f3f46]">
                Caption
                <input
                  className="mt-1 h-11 w-full border border-[#c8c2b6] bg-white px-3 text-sm outline-none focus:border-[#7c3aed]"
                  maxLength={280}
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                />
              </label>
              <button
                className="h-11 border border-[#18181b] bg-white px-5 text-sm font-semibold text-[#18181b] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={clearCanvas}
                type="button"
              >
                Clear
              </button>
              <button
                className="h-11 bg-[#18181b] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!dailyPrompt || !userId || !organizationId}
                type="submit"
              >
                Publish
              </button>
            </div>
            <p className="min-h-6 text-sm font-medium text-[#52525b]">{status}</p>
          </form>
        </div>
      </section>
    </main>
  );
}
