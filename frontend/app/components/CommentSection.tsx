"use client";

import { useEffect, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:5000";

type Comment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
};

type Props = {
  submissionId: string;
  userId: string;
};

export default function CommentSection({ submissionId, userId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingComments, setLoadingComments] = useState(true);

  useEffect(() => {
    async function fetchComments() {
      setLoadingComments(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/submissions/${submissionId}/comments`
        );
        if (!response.ok) throw new Error("Failed to load comments");
        const data = await response.json();
        setComments(data.comments);
      } catch {
        // silently fail — comments are optional UI
      } finally {
        setLoadingComments(false);
      }
    }

    fetchComments();
  }, [submissionId]);

  async function postComment() {
    if (!content.trim()) return;
    if (!userId) {
      setError("Enter your User UUID first");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          submission_id: submissionId,
          content: content.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to post comment");
      }

      const data = await response.json();
      setComments((prev) => [...prev, data.comment]);
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71717a]">
        Comments
      </p>

      {loadingComments ? (
        <p className="text-sm text-[#71717a]">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-[#71717a]">No comments yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {comments.map((c) => (
            <li
              key={c.id}
              className="border border-[#d8d3c7] bg-white px-3 py-2"
            >
              <p className="text-xs font-medium text-[#7c3aed]">
                {c.user_id.slice(0, 8)}…
              </p>
              <p className="mt-0.5 text-sm text-[#18181b]">{c.content}</p>
              <p className="mt-1 text-xs text-[#a1a1aa]">
                {new Date(c.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          className="h-9 flex-1 border border-[#c8c2b6] bg-white px-3 text-sm outline-none focus:border-[#7c3aed]"
          placeholder={userId ? "Write a comment…" : "Enter User UUID first"}
          disabled={!userId}
          maxLength={500}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && postComment()}
        />
        <button
          onClick={postComment}
          disabled={loading || !userId || !content.trim()}
          className="h-9 bg-[#18181b] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Post
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}