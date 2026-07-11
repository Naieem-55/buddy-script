"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Liker } from "@/lib/types";

// Adds the "who liked" surface the static design lacks (requirement).
export default function LikersModal({
  title,
  endpoint,
  onClose,
}: {
  title: string;
  endpoint: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["likers", endpoint],
    queryFn: () => api.get<{ likers: Liker[] }>(endpoint),
  });

  return (
    <div className="bs-modal-overlay" onClick={onClose}>
      <div className="bs-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bs-modal-head">
          <span>{title}</span>
          <button onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="bs-modal-body">
          {isLoading && <div className="bs-muted">Loading…</div>}
          {!isLoading && (data?.likers.length ?? 0) === 0 && (
            <div className="bs-muted">No likes yet.</div>
          )}
          {data?.likers.map((u) => (
            <div className="bs-liker" key={u.id}>
              <img src={u.avatarUrl} alt="" />
              <span>{u.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
