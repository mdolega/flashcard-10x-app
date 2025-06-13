import type { Difficulty, FlashcardGenerateResponseDto, GenerateFlashcardDto } from "../../types";
import { supabaseClient } from "../../db/supabase.client";
import { AiLogService } from "./ai-generation-log.service";
import { OpenRouterService } from "./openrouter.service";
import type { ChatMessage, ResponseFormat } from "../../types";

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
      const flashcards: GenerateFlashcardDto[] = parsedResponse.flashcards.map((card: any, index: number) => {
        if (!card.question || !card.answer || !card.difficulty) {
          throw new Error(`Invalid flashcard at index ${index}: missing required fields`);
        }

        return {
          question: card.question.trim(),
          answer: card.answer.trim(),
          difficulty: card.difficulty as Difficulty,
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
