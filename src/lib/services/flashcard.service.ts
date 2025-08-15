import type {
  FlashcardDto,
  FlashcardsListResponseDto,
  FlashcardGenerateResponseDto,
  GenerateFlashcardDto,
  Difficulty,
  ResponseFormat,
  ChatMessage,
  FlashcardCreateCommand,
  FlashcardUpdateCommand,
  FlashcardQueryParamsDto,
  FlashcardStatus,
} from "../../types";
import { supabaseClient } from "../../db/supabase.client";
import { AiLogService } from "./ai-generation-log.service";
import { OpenRouterService } from "./openrouter.service";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class FlashcardService {
  private readonly supabase: typeof supabaseClient;
  private readonly aiLogService: AiLogService;
  private readonly openRouterService: OpenRouterService;

  constructor() {
    this.supabase = supabaseClient;
    this.aiLogService = new AiLogService();

    // Initialize OpenRouter service with environment variables
    this.openRouterService = new OpenRouterService({
      apiKey: import.meta.env.OPENROUTER_API_KEY || "",
      baseUrl: import.meta.env.OPENROUTER_BASE_URL,
      defaultModel: import.meta.env.OPENROUTER_DEFAULT_MODEL || "gpt-4o-mini",
      defaultParams: {
        temperature: 0.7,
        max_tokens: 2000,
      },
    });

    // Set system message for flashcard generation
    this.openRouterService.setDefaultSystemMessage(
      "You are an expert flashcard generator. Generate high-quality flashcards from the provided text. " +
        "Create clear, concise questions with accurate answers. Vary the difficulty levels appropriately. " +
        "Focus on key concepts, facts, and important details that would be valuable for learning."
    );
  }

  /**
   * List flashcards for a user with pagination and filtering
   */
  async listFlashcards(userId: string, queryParams: FlashcardQueryParamsDto): Promise<FlashcardsListResponseDto> {
    const { page = 1, limit = 20, status, difficulty, sort_by = "created_at", order = "desc" } = queryParams;

    // Build the query
    let query = this.supabase
      .from("flashcards")
      .select("id, question, answer, status, difficulty, created_at, updated_at", { count: "exact" })
      .eq("user_id", userId)
      .is("deleted_at", null); // Only non-deleted flashcards

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }
    if (difficulty) {
      query = query.eq("difficulty", difficulty);
    }

    // Apply sorting
    query = query.order(sort_by, { ascending: order === "asc" });

    // Apply pagination
    const startIndex = (page - 1) * limit;
    query = query.range(startIndex, startIndex + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch flashcards: ${error.message}`);
    }

    const flashcards: FlashcardDto[] = (data || []).map((row) => ({
      id: row.id,
      question: row.question,
      answer: row.answer,
      status: row.status,
      difficulty: row.difficulty,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return {
      data: flashcards,
      pagination: {
        page,
        limit,
        total: count || 0,
      },
    };
  }

  /**
   * Create a new flashcard manually (status: manual)
   */
  async createFlashcard(userId: string, data: FlashcardCreateCommand): Promise<FlashcardDto> {
    const flashcardData = {
      user_id: userId,
      question: data.question,
      answer: data.answer,
      difficulty: data.difficulty || "medium",
      status: "manual" as const,
      ai_generation_id: null,
    };

    const { data: insertedData, error } = await this.supabase
      .from("flashcards")
      .insert(flashcardData)
      .select("id, question, answer, status, difficulty, created_at, updated_at")
      .single();

    if (error) {
      throw new Error(`Failed to create flashcard: ${error.message}`);
    }

    if (!insertedData) {
      throw new Error("No data returned after creating flashcard");
    }

    return {
      id: insertedData.id,
      question: insertedData.question,
      answer: insertedData.answer,
      status: insertedData.status,
      difficulty: insertedData.difficulty,
      created_at: insertedData.created_at,
      updated_at: insertedData.updated_at,
    };
  }

  /**
   * Update an existing flashcard
   * If originally AI-generated, status changes to ai-edited
   */
  async updateFlashcard(
    userId: string,
    flashcardId: string,
    data: FlashcardUpdateCommand
  ): Promise<{ id: string; status: FlashcardStatus; updated_at: string }> {
    // First, get the current flashcard to check its status
    const { data: currentFlashcard, error: fetchError } = await this.supabase
      .from("flashcards")
      .select("status")
      .eq("id", flashcardId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        throw new Error("Flashcard not found");
      }
      throw new Error(`Failed to fetch flashcard: ${fetchError.message}`);
    }

    if (!currentFlashcard) {
      throw new Error("Flashcard not found");
    }

    // Determine new status
    let newStatus: FlashcardStatus = currentFlashcard.status as FlashcardStatus;
    if (currentFlashcard.status === "ai-generated") {
      newStatus = "ai-edited";
    }

    // Prepare update data with proper typing
    const updateData: Partial<{
      question: string;
      answer: string;
      difficulty: Difficulty;
      status: FlashcardStatus;
      updated_at: string;
    }> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Add provided fields if they exist
    if (data.question !== undefined) {
      updateData.question = data.question;
    }
    if (data.answer !== undefined) {
      updateData.answer = data.answer;
    }
    if (data.difficulty !== undefined) {
      updateData.difficulty = data.difficulty as Difficulty;
    }

    const { data: updatedData, error: updateError } = await this.supabase
      .from("flashcards")
      .update(updateData)
      .eq("id", flashcardId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select("id, status, updated_at")
      .single();

    if (updateError) {
      throw new Error(`Failed to update flashcard: ${updateError.message}`);
    }

    if (!updatedData) {
      throw new Error("No data returned after updating flashcard");
    }

    return {
      id: updatedData.id,
      status: updatedData.status as FlashcardStatus,
      updated_at: updatedData.updated_at,
    };
  }

  /**
   * Soft delete a flashcard by setting deleted_at
   */
  async deleteFlashcard(userId: string, flashcardId: string): Promise<void> {
    const { error } = await this.supabase
      .from("flashcards")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", flashcardId)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) {
      // Check if it's a not found error
      if (error.code === "PGRST116") {
        throw new Error("Flashcard not found");
      }
      throw new Error(`Failed to delete flashcard: ${error.message}`);
    }
  }

  async generateFromAI(text: string, count: number, userId: string): Promise<FlashcardGenerateResponseDto> {
    // Create initial AI log
    const generationId = await this.aiLogService.createLog({
      userId,
      prompt: text,
    });

    try {
      // Call AI service (to be implemented)
      const aiResponse = await this.callAiService(text, count);

      // Update AI log with success
      await this.aiLogService.updateLog({
        id: generationId,
        response: aiResponse,
        model: aiResponse.model,
        cost: aiResponse.cost,
        tokens: aiResponse.tokens,
        status: "success",
      });

      // Create flashcards
      const flashcardsToInsert = aiResponse.flashcards.map((card) => ({
        user_id: userId,
        ai_generation_id: generationId,
        question: card.question,
        answer: card.answer,
        difficulty: card.difficulty,
        status: "ai-generated" as const,
      }));

      const { error: insertError } = await this.supabase.from("flashcards").insert(flashcardsToInsert);

      if (insertError) {
        throw new Error(`Failed to insert flashcards: ${insertError.message}`);
      }

      return {
        flashcards: aiResponse.flashcards,
        generation_id: generationId,
      };
    } catch (error) {
      // Update AI log with error
      await this.aiLogService.updateLog({
        id: generationId,
        status: "error",
        statusCode: error instanceof Error ? 503 : 500,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  }

  /**
   * List flashcards due for review for a user
   */
  async listDueForReview(
    userId: string,
    queryParams: { page?: number; limit?: number; sort_by?: "next_review_at"; order?: "asc" | "desc" }
  ): Promise<import("../../types").FlashcardReviewListResponseDto> {
    const { page = 1, limit = 10, sort_by = "next_review_at", order = "asc" } = queryParams || {};

    const startIndex = (page - 1) * limit;

    // Primary path: use SRS column next_review_at if available
    try {
      const { data, error, count } = await this.supabase
        .from("flashcards")
        .select("id, question, answer, next_review_at", { count: "exact" })
        .eq("user_id", userId)
        .is("deleted_at", null)
        .lte("next_review_at", new Date().toISOString())
        .order(sort_by, { ascending: order === "asc" })
        .range(startIndex, startIndex + limit - 1);

      if (error) {
        // If schema is missing next_review_at, fall back gracefully
        const code = (error as any).code as string | undefined;
        const message = (error as any).message as string | undefined;
        const columnMissing = code === "42703" || (message && message.includes("next_review_at"));
        if (!columnMissing) {
          throw error;
        }
        throw new Error("MISSING_SRS_COLUMNS");
      }

      const items = (data || []).map((row) => ({
        id: (row as any).id,
        question: (row as any).question,
        answer: (row as any).answer,
        next_review: (row as any).next_review_at as unknown as string,
      }));

      return {
        data: items,
        pagination: { page, limit, total: count || 0 },
      };
    } catch (e) {
      // Fallback: when SRS columns are not present yet, return recent cards using created_at as placeholder
      if (e instanceof Error && e.message === "MISSING_SRS_COLUMNS") {
        const { data, error, count } = await this.supabase
          .from("flashcards")
          .select("id, question, answer, created_at", { count: "exact" })
          .eq("user_id", userId)
          .is("deleted_at", null)
          .order("created_at", { ascending: true })
          .range(startIndex, startIndex + limit - 1);

        if (error) {
          throw new Error(`Failed to fetch flashcards (fallback): ${error.message}`);
        }

        const items = (data || []).map((row) => ({
          id: (row as any).id,
          question: (row as any).question,
          answer: (row as any).answer,
          next_review: (row as any).created_at as unknown as string,
        }));

        return {
          data: items,
          pagination: { page, limit, total: count || 0 },
        };
      }
      throw new Error(`Failed to fetch due flashcards: ${(e as Error).message}`);
    }
  }

  /**
   * Grade a reviewed flashcard using SM-2 and update SRS fields
   */
  async gradeReview(
    userId: string,
    flashcardId: string,
    grade: 0 | 1 | 2 | 3 | 4 | 5
  ): Promise<import("../../types").ReviewResultDto> {
    const { calculate_sm2_next, compute_next_review_at } = await import("./srs.service");

    // Step 1: Try to fetch SRS fields; handle missing columns gracefully
    let card: {
      id: string;
      user_id: string;
      easiness?: number | null;
      repetition?: number | null;
      interval_days?: number | null;
    } | null = null;
    let fetchError: any | null = null;
    try {
      const result = await this.supabase
        .from("flashcards")
        .select("id, user_id, easiness, repetition, interval_days")
        .eq("id", flashcardId)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .single();
      card = result.data as any;
      fetchError = result.error;
    } catch (e) {
      fetchError = e;
    }

    // If missing column error, verify card existence with minimal select
    const isMissingColumn = (err: any) => {
      const code: string | undefined = err?.code;
      const message: string | undefined = err?.message;
      return code === "42703" || (message && /next_review_at|easiness|repetition|interval_days/.test(message));
    };

    if (fetchError) {
      if (isMissingColumn(fetchError)) {
        const { data: minimal, error: minimalErr } = await this.supabase
          .from("flashcards")
          .select("id, user_id")
          .eq("id", flashcardId)
          .eq("user_id", userId)
          .is("deleted_at", null)
          .single();
        if (minimalErr || !minimal) {
          throw new Error("Flashcard not found");
        }
        card = minimal as any;
      } else {
        throw new Error("Flashcard not found");
      }
    }

    if (!card) {
      throw new Error("Flashcard not found");
    }

    // Step 2: Compute next SRS state using defaults when missing
    const next = calculate_sm2_next({
      prev_easiness: Number((card as any).easiness ?? 2.5),
      prev_repetition: Number((card as any).repetition ?? 0),
      prev_interval_days: Number((card as any).interval_days ?? 0),
      grade,
    });

    const nextReviewAt = compute_next_review_at(next.interval_days).toISOString();

    // Step 3: Attempt to persist; if SRS columns missing, return computed result without update
    const { data: updated, error: updateError } = await this.supabase
      .from("flashcards")
      .update({
        easiness: next.easiness,
        repetition: next.repetition,
        interval_days: next.interval_days,
        last_review_at: new Date().toISOString(),
        next_review_at: nextReviewAt,
      })
      .eq("id", flashcardId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select("id, easiness, repetition, interval_days, next_review_at")
      .single();

    if (updateError) {
      if (isMissingColumn(updateError)) {
        // Graceful fallback when SRS columns not present yet
        return {
          id: card.id,
          next_review: nextReviewAt,
          repetition: next.repetition,
          interval_days: next.interval_days,
          easiness: next.easiness,
        };
      }
      throw new Error(`Failed to update flashcard review: ${updateError?.message ?? "unknown error"}`);
    }

    if (!updated) {
      // Should not happen normally; return computed result
      return {
        id: card.id,
        next_review: nextReviewAt,
        repetition: next.repetition,
        interval_days: next.interval_days,
        easiness: next.easiness,
      };
    }

    return {
      id: updated.id,
      next_review: updated.next_review_at as unknown as string,
      repetition: updated.repetition as number,
      interval_days: updated.interval_days as number,
      easiness: Number(updated.easiness as number),
    };
  }

  private async callAiService(
    text: string,
    count: number
  ): Promise<{
    flashcards: GenerateFlashcardDto[];
    model: string;
    cost: number;
    tokens: number;
  }> {
    try {
      // Define the JSON schema for structured response
      const responseFormat: ResponseFormat = {
        type: "json_schema",
        json_schema: {
          name: "FlashcardGenerationResponse",
          strict: true,
          schema: {
            type: "object",
            properties: {
              flashcards: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    answer: { type: "string" },
                    difficulty: {
                      type: "string",
                      enum: ["easy", "medium", "hard"],
                    },
                  },
                  required: ["question", "answer", "difficulty"],
                  additionalProperties: false,
                },
              },
              metadata: {
                type: "object",
                properties: {
                  model: { type: "string" },
                  cost: { type: "number" },
                  tokens: { type: "number" },
                },
                required: ["model", "cost", "tokens"],
                additionalProperties: false,
              },
            },
            required: ["flashcards", "metadata"],
            additionalProperties: false,
          },
        },
      };

      // Create the user message with clear instructions
      const userMessage: ChatMessage = {
        role: "user",
        content: `Generate exactly ${count} flashcards from the following text. 
        
Text to process:
${text}

Instructions:
1. Create ${count} flashcards covering the most important concepts from the text
2. Ensure questions are clear and specific
3. Provide complete, accurate answers
4. Assign appropriate difficulty levels: easy (basic facts), medium (concepts requiring understanding), hard (complex analysis or synthesis)
5. Vary the question types (definition, explanation, application, comparison, etc.)

Respond with a JSON object containing the flashcards array and metadata.`,
      };

      // Call OpenRouter API
      const response = await this.openRouterService.generateChatCompletion({
        messages: [userMessage],
        responseFormat,
      });

      // Parse the response
      if (!response || response.length === 0) {
        throw new Error("No response received from AI service");
      }

      const assistantMessage = response[0];
      let parsedResponse;

      try {
        parsedResponse = JSON.parse(assistantMessage.content);
      } catch (parseError) {
        throw new Error(`Failed to parse AI response: ${parseError}`);
      }

      // Validate the response structure
      if (!parsedResponse.flashcards || !Array.isArray(parsedResponse.flashcards)) {
        throw new Error("Invalid response format: missing flashcards array");
      }

      if (!parsedResponse.metadata) {
        throw new Error("Invalid response format: missing metadata");
      }

      // Transform flashcards to match our interface
      const flashcards: GenerateFlashcardDto[] = parsedResponse.flashcards.map((card: unknown, index: number) => {
        const flashcard = card as { question?: string; answer?: string; difficulty?: string };

        if (!flashcard.question || !flashcard.answer || !flashcard.difficulty) {
          throw new Error(`Invalid flashcard at index ${index}: missing required fields`);
        }

        return {
          question: flashcard.question.trim(),
          answer: flashcard.answer.trim(),
          difficulty: flashcard.difficulty as Difficulty,
        };
      });

      // Ensure we have the expected number of flashcards
      if (flashcards.length !== count) {
        console.warn(`Expected ${count} flashcards, but received ${flashcards.length}`);
      }

      return {
        flashcards: flashcards.slice(0, count), // Limit to requested count
        model: parsedResponse.metadata.model,
        cost: parsedResponse.metadata.cost,
        tokens: parsedResponse.metadata.tokens,
      };
    } catch (error) {
      console.error("OpenRouter API call failed:", error);

      // If OpenRouter fails, fall back to mock for development
      if (import.meta.env.DEV) {
        console.warn("Falling back to mock AI service for development");
        return this.mockAiService(text, count);
      }

      throw error;
    }
  }

  // Keep mock as fallback for development
  private async mockAiService(
    text: string,
    count: number
  ): Promise<{
    flashcards: GenerateFlashcardDto[];
    model: string;
    cost: number;
    tokens: number;
  }> {
    // Simulate API delay (1-2 seconds)
    await sleep(1000 + Math.random() * 1000);

    // Randomly throw error (10% chance)
    if (Math.random() < 0.1) {
      throw new Error("Mock AI service error");
    }

    // Generate mock flashcards
    const flashcards: GenerateFlashcardDto[] = Array.from({ length: count }, (_, i) => ({
      question: `Mock Question ${i + 1} about: ${text.slice(0, 50)}...`,
      answer: `Mock Answer ${i + 1} with some random text...`,
      difficulty: ["easy", "medium", "hard"][Math.floor(Math.random() * 3)] as Difficulty,
    }));

    return {
      flashcards,
      model: "mock-gpt-3.5",
      cost: Number((Math.random() * 0.1).toFixed(4)),
      tokens: Math.floor(Math.random() * 1000) + 500,
    };
  }
}
