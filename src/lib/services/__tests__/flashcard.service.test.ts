import { describe, it, expect, beforeEach, vi } from "vitest";

// Mocks state controllers
type SupabaseError = { message?: string; code?: string } | null;
type SupabaseResult<T> = { data: T | null; error: SupabaseError } & { count?: number };

const supabaseState = {
  mode: "idle" as "insertSingle" | "fetchStatusSingle" | "updateSingle" | "deleteUpdate" | "insertMany" | "idle",
  insertSingleResult: { data: null, error: null } as SupabaseResult<Record<string, unknown>>,
  fetchStatusSingleResult: { data: { status: "ai-generated" }, error: null } as SupabaseResult<{ status: string }>,
  updateSingleResult: {
    data: { id: "id-1", status: "ai-edited", updated_at: "2025-01-01T00:00:00.000Z" },
    error: null,
  } as SupabaseResult<{ id: string; status: string; updated_at: string }>,
  deleteUpdateResult: { error: null } as { error: SupabaseError },
  insertManyResult: { error: null } as { error: SupabaseError },
};

const openRouterState = {
  generateResult: [
    {
      role: "assistant",
      content: JSON.stringify({
        flashcards: [
          { question: "Q1", answer: "A1", difficulty: "easy" },
          { question: "Q2", answer: "A2", difficulty: "medium" },
        ],
        metadata: { model: "test-model", cost: 0.01, tokens: 123 },
      }),
    },
  ] as { role: string; content: string }[],
};

const aiLogState = {
  createdId: "gen-1",
};

// Module mocks
vi.mock("../../../db/supabase.client", () => {
  // chainable thenable builder
  const builder: {
    _lastUpdatePayload: unknown;
    select: (cols?: string) => typeof builder;
    insert: (payload: unknown) => typeof builder;
    update: (payload: unknown) => typeof builder;
    order: () => typeof builder;
    range: () => typeof builder;
    eq: () => typeof builder;
    is: () => typeof builder;
    single: () => Promise<SupabaseResult<Record<string, unknown>>>;
    then: (
      onFulfilled: (v: { data: null; error: SupabaseError } | { error: SupabaseError }) => unknown
    ) => Promise<unknown>;
  } = {
    _lastUpdatePayload: undefined,
    select: vi.fn((cols?: string) => {
      if (typeof cols === "string" && cols.trim() === "status") {
        supabaseState.mode = "fetchStatusSingle";
      } else {
        supabaseState.mode = supabaseState.mode === "insertMany" ? "insertMany" : supabaseState.mode;
      }
      return builder;
    }),
    insert: vi.fn((payload: unknown) => {
      if (Array.isArray(payload)) {
        supabaseState.mode = "insertMany";
      } else {
        supabaseState.mode = "insertSingle";
      }
      return builder;
    }),
    update: vi.fn((payload: unknown) => {
      builder._lastUpdatePayload = payload;
      supabaseState.mode = "updateSingle";
      return builder;
    }),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    single: vi.fn(async () => {
      if (supabaseState.mode === "insertSingle") return supabaseState.insertSingleResult;
      if (supabaseState.mode === "fetchStatusSingle") return supabaseState.fetchStatusSingleResult;
      if (supabaseState.mode === "updateSingle") return supabaseState.updateSingleResult;
      return { data: null, error: null };
    }),
    then: (onFulfilled) => {
      // allow awaiting builder for delete/update without single()
      if (supabaseState.mode === "deleteUpdate")
        return Promise.resolve(supabaseState.deleteUpdateResult).then(onFulfilled);
      if (supabaseState.mode === "insertMany") return Promise.resolve(supabaseState.insertManyResult).then(onFulfilled);
      // default no-op
      return Promise.resolve({ data: null, error: null }).then(onFulfilled);
    },
  };

  const supabaseClient = {
    from: vi.fn(() => {
      return new Proxy(builder, {
        get(target, prop: string) {
          if (prop === "select") {
            // detect status-only select for fetch
            supabaseState.mode = prop === "select" ? supabaseState.mode : supabaseState.mode;
          }
          return (target as Record<string, unknown>)[prop as keyof typeof target];
        },
      });
    }),
  };

  return { supabaseClient };
});

vi.mock("../ai-generation-log.service", () => {
  return {
    AiLogService: class {
      createLog = vi.fn(async () => aiLogState.createdId);
      updateLog = vi.fn(async () => undefined);
    },
  };
});

vi.mock("../openrouter.service", () => {
  return {
    OpenRouterService: class {
      setDefaultSystemMessage = vi.fn();
      generateChatCompletion = vi.fn(async () => openRouterState.generateResult);
    },
  };
});

import { FlashcardService } from "../flashcard.service";

describe("FlashcardService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // reset defaults
    supabaseState.mode = "idle";
    supabaseState.insertSingleResult = {
      data: {
        id: "id-1",
        question: "Q",
        answer: "A",
        status: "manual",
        difficulty: "medium",
        created_at: "t",
        updated_at: "t",
      },
      error: null,
    };
    supabaseState.fetchStatusSingleResult = { data: { status: "ai-generated" }, error: null };
    supabaseState.updateSingleResult = {
      data: { id: "id-1", status: "ai-edited", updated_at: "2025-01-01T00:00:00.000Z" },
      error: null,
    };
    supabaseState.deleteUpdateResult = { error: null };
    supabaseState.insertManyResult = { error: null };
    openRouterState.generateResult = [
      {
        role: "assistant",
        content: JSON.stringify({
          flashcards: [
            { question: "Q1", answer: "A1", difficulty: "easy" },
            { question: "Q2", answer: "A2", difficulty: "medium" },
          ],
          metadata: { model: "test-model", cost: 0.01, tokens: 123 },
        }),
      },
    ];
  });

  it("createFlashcard: inserts and returns DTO", async () => {
    const service = new FlashcardService();
    const result = await service.createFlashcard("user-1", {
      question: "Q",
      answer: "A",
      difficulty: "medium",
    });

    expect(result).toMatchObject({
      id: "id-1",
      question: "Q",
      answer: "A",
      status: "manual",
      difficulty: "medium",
    });
  });

  it("createFlashcard: throws on db error", async () => {
    const service = new FlashcardService();
    supabaseState.insertSingleResult = { data: null, error: { message: "db fail" } };
    await expect(
      service.createFlashcard("user-1", { question: "Q", answer: "A", difficulty: "medium" })
    ).rejects.toThrow(/Failed to create flashcard/);
  });

  it("updateFlashcard: sets ai-edited when previous status was ai-generated", async () => {
    const service = new FlashcardService();
    // first fetch current status
    supabaseState.fetchStatusSingleResult = { data: { status: "ai-generated" }, error: null };
    // update call result
    supabaseState.updateSingleResult = {
      data: { id: "id-1", status: "ai-edited", updated_at: "2025-01-01T00:00:00.000Z" },
      error: null,
    };

    const result = await service.updateFlashcard("user-1", "id-1", { question: "Q2" });
    expect(result).toEqual({ id: "id-1", status: "ai-edited", updated_at: "2025-01-01T00:00:00.000Z" });
  });

  it("updateFlashcard: throws not found when select returns PGRST116", async () => {
    const service = new FlashcardService();
    supabaseState.fetchStatusSingleResult = { data: null, error: { code: "PGRST116", message: "not found" } };
    await expect(service.updateFlashcard("user-1", "missing", { answer: "A2" })).rejects.toThrow("Flashcard not found");
  });

  it("generateFromAI: creates log, inserts flashcards, updates log with success", async () => {
    const service = new FlashcardService();
    const result = await service.generateFromAI("text", 2, "user-1");
    expect(result.flashcards).toHaveLength(2);
    expect(result.generation_id).toBe("gen-1");
  });

  it("generateFromAI: updates log with error when AI fails and rethrows", async () => {
    const service = new FlashcardService();
    // cause DB insert of generated flashcards to fail; this triggers top-level catch and error log
    supabaseState.insertManyResult = { error: { message: "insert failed" } };
    await expect(service.generateFromAI("text", 1, "user-1")).rejects.toThrow(/Failed to insert flashcards/);
  });
});
