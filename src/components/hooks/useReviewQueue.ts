import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FlashcardReviewDto, FlashcardReviewListResponseDto, ReviewGrade, ReviewResultDto } from "@/types";

interface UseReviewQueueOptions {
  page?: number;
  limit?: number;
}

interface UseReviewQueueState {
  items: FlashcardReviewDto[];
  is_loading: boolean;
  is_error: boolean;
  error_message?: string;
  current_index: number;
  is_flipped: boolean;
}

interface UseReviewQueueApi {
  queue: FlashcardReviewDto[];
  current: FlashcardReviewDto | null;
  current_index: number;
  total: number;
  is_loading: boolean;
  is_error: boolean;
  error_message?: string;
  is_flipped: boolean;
  refetch: () => Promise<void>;
  flip: () => void;
  gradeCurrent: (grade: ReviewGrade) => Promise<ReviewResultDto | null>;
}

async function fetchDueReview({
  page = 1,
  limit = 10,
}: UseReviewQueueOptions): Promise<FlashcardReviewListResponseDto> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await fetch(`/api/flashcards/review?${params.toString()}`, {
    method: "GET",
    credentials: "same-origin",
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to load review queue");
  }
  return res.json();
}

async function postGrade({ id, grade }: { id: string; grade: ReviewGrade }): Promise<ReviewResultDto> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  const res = await fetch(`/api/flashcards/review/${id}/grade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grade }),
    credentials: "same-origin",
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to grade review");
  }
  return res.json();
}

export function useReviewQueue(options: UseReviewQueueOptions = {}): UseReviewQueueApi {
  const { page = 1, limit = 10 } = options;
  const [state, setState] = useState<UseReviewQueueState>({
    items: [],
    is_loading: true,
    is_error: false,
    error_message: undefined,
    current_index: 0,
    is_flipped: false,
  });
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, is_loading: true, is_error: false, error_message: undefined }));
    try {
      const data = await fetchDueReview({ page, limit });
      if (!isMountedRef.current) return;
      setState((s) => ({
        ...s,
        items: data.data,
        is_loading: false,
        is_error: false,
        error_message: undefined,
        current_index: 0,
        is_flipped: false,
      }));
    } catch (err) {
      if (!isMountedRef.current) return;
      const message = err instanceof Error ? err.message : "Unknown error";
      setState((s) => ({ ...s, is_loading: false, is_error: true, error_message: message }));
    }
  }, [limit, page]);

  useEffect(() => {
    load();
  }, [load]);

  const queue = state.items;
  const current = useMemo(() => {
    if (queue.length === 0) return null;
    if (state.current_index < 0 || state.current_index >= queue.length) return null;
    return queue[state.current_index] ?? null;
  }, [queue, state.current_index]);

  const flip = useCallback(() => {
    setState((s) => ({ ...s, is_flipped: !s.is_flipped }));
  }, []);

  const gradeCurrent = useCallback(
    async (grade: ReviewGrade) => {
      const card = current;
      if (!card) return null;

      // Optimistic update: advance to next card and unflip
      setState((s) => {
        const filtered = s.items.filter((c) => c.id !== card.id);
        const newIndex = Math.min(s.current_index, Math.max(0, filtered.length - 1));
        return {
          ...s,
          items: filtered,
          current_index: newIndex,
          is_flipped: false,
        };
      });

      try {
        const result = await postGrade({ id: card.id, grade });
        return result;
      } catch (err) {
        // Re-fetch on error to resync state
        await load();
        throw err;
      }
    },
    [current, load]
  );

  return {
    queue,
    current,
    current_index: state.current_index,
    total: queue.length,
    is_loading: state.is_loading,
    is_error: state.is_error,
    error_message: state.error_message,
    is_flipped: state.is_flipped,
    refetch: load,
    flip,
    gradeCurrent,
  };
}

export type { UseReviewQueueApi };
