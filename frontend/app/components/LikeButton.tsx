"use client";

import { useState } from "react";
import { API_BASE } from "@/lib/api";

type Props = {
  submissionId: string;
  userId: string;
  initialLiked?: boolean;
};

export default function LikeButton({
  submissionId,
  userId,
  initialLiked = false,
}: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!userId) {
    return (
      <button
        disabled
        className="flex items-center gap-1 border border-[#c8c2b6] bg-white px-3 py-1.5 text-sm font-medium text-[#a1a1aa] cursor-not-allowed"
        title="Enter your User UUID to like"
      >
        ♡ Like
      </button>
    );
  }

  async function toggleLike() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/likes`, {
        method: liked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, submission_id: submissionId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Action failed");
      }

      setLiked((prev) => !prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={toggleLike}
        disabled={loading}
        className={`flex items-center gap-1 border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          liked
            ? "border-[#7c3aed] bg-[#7c3aed] text-white"
            : "border-[#c8c2b6] bg-white text-[#3f3f46] hover:border-[#7c3aed] hover:text-[#7c3aed]"
        }`}
      >
        {liked ? "♥ Liked" : "♡ Like"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
