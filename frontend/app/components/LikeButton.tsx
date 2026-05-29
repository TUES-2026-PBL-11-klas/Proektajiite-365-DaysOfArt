"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

type Props = {
  submissionId: string;
  userId: string;
  isOwner?: boolean;
};

export default function LikeButton({
  submissionId,
  userId,
  isOwner = false,
}: Props) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [canInteract, setCanInteract] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const query = userId ? `?user_id=${encodeURIComponent(userId)}` : "";

    fetch(`${API_BASE}/api/submissions/${submissionId}/like-status${query}`)
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (
          data: {
            liked: boolean;
            like_count: number;
            can_interact: boolean;
          } | null,
        ) => {
          if (cancelled || !data) return;
          setLiked(data.liked);
          setLikeCount(data.like_count);
          setCanInteract(data.can_interact);
        },
      )
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [submissionId, userId]);

  async function toggleLike() {
    if (!userId) {
      setError("Sign in to like drawings.");
      return;
    }
    if (isOwner) {
      setError("You cannot like your own drawing.");
      return;
    }

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
      setLikeCount((prev) => prev + (liked ? -1 : 1));
      setCanInteract(true);
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
        disabled={loading || !canInteract}
        className={`flex items-center gap-1 border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          liked
            ? "border-[#7c3aed] bg-[#7c3aed] text-white"
            : "border-[#c8c2b6] bg-white text-[#3f3f46] hover:border-[#7c3aed] hover:text-[#7c3aed]"
        }`}
      >
        {liked ? "♥ Liked" : "♡ Like"}
        <span className="text-xs opacity-80">({likeCount})</span>
      </button>
      {!canInteract && (
        <p className="text-xs text-[#71717a]">
          {!userId
            ? "Sign in to like drawings."
            : "You cannot like your own drawing."}
        </p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
