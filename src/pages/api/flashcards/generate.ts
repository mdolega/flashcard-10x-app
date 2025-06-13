import type { APIRoute } from "astro";
import { FlashcardService } from "../../../lib/services/flashcard.service";
import { flashcardGenerateSchema } from "../../../lib/schemas/flashcard.schema";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = flashcardGenerateSchema.parse(body);

    // Use default user ID for development
    const userId = import.meta.env.DEFAULT_USER_ID;

    // Generate flashcards
    const flashcardService = new FlashcardService();
    const result = await flashcardService.generateFromAI(validatedData.text, validatedData.count, userId);

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof Error) {
      return new Response(
        JSON.stringify({
          error: error.message,
        }),
        {
          status: error.name === "ZodError" ? 400 : 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Handle unknown errors
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
