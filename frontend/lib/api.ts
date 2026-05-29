const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5001";
const TOKEN_KEY = "365art_token";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

// ── Person 3 compatibility exports ───────────────────────────────────────────
// These are used by app/feed, app/submissions/[id], and app/users/[id].
export const API_BASE = API_URL;

export type Submission = {
  id: string;
  user_id: string;
  organization_id: string;
  topic_id: string;
  image_data: string;
  image_url: string;
  date: string;
  submitted_at: string | null;
  created_at: string | null;
  caption: string | null;
  artist?: {
    id: string;
    username: string;
    display_name: string | null;
  } | null;
  organization?: {
    id: string;
    name: string;
  } | null;
  prompt?: {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    tag: string | null;
  } | null;
};

export type SubmissionPage = {
  submissions: Submission[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
};

export function submissionSrc(sub: Submission): string {
  return sub.image_data || sub.image_url;
}
// ─────────────────────────────────────────────────────────────────────────────

export async function apiFetch<T>(
  path: string,
  { method = "GET", body, auth = true }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // ignore non-JSON bodies
  }

  if (!res.ok) {
    const message =
      (data as { error?: string } | null)?.error ||
      (data as { msg?: string } | null)?.msg ||
      `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}
