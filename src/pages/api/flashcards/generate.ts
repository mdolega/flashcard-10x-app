import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { FlashcardService } from "../../../lib/services/flashcard.service";
import { flashcardGenerateSchema } from "../../../lib/schemas/flashcard.schema";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await locals.supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = flashcardGenerateSchema.parse(body);

    // Generate flashcards
    const flashcardService = new FlashcardService();
    const result = await flashcardService.generateFromAI(validatedData.text, validatedData.count, user.id);

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error generating flashcards:", error);

    if (error instanceof ZodError) {
      return new Response(
        JSON.stringify({
          message: "Validation failed",
          errors: error.errors,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Internal server error",
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
