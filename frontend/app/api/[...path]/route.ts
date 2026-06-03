// Runtime proxy: forwards /api/* from the browser to the backend service.
// BACKEND_URL is read per-request from the environment — no rebuild needed
// when the backend address changes (k8s configmap or docker-compose env).
import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:5000";

async function proxy(
  req: NextRequest,
  params: Promise<{ path: string[] }>,
): Promise<NextResponse> {
  const { path } = await params;
  const target = `${BACKEND}/api/${path.join("/")}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  headers.delete("host");

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
    // @ts-expect-error — duplex is required for streaming body in Node 18+
    duplex: "half",
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export const GET    = (req: NextRequest, ctx: RouteContext) => proxy(req, ctx.params);
export const POST   = (req: NextRequest, ctx: RouteContext) => proxy(req, ctx.params);
export const PUT    = (req: NextRequest, ctx: RouteContext) => proxy(req, ctx.params);
export const PATCH  = (req: NextRequest, ctx: RouteContext) => proxy(req, ctx.params);
export const DELETE = (req: NextRequest, ctx: RouteContext) => proxy(req, ctx.params);
