import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { FlashcardService } from "../../../../lib/services/flashcard.service";
import { flashcardUpdateSchema } from "../../../../lib/schemas/flashcard.schema";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    const flashcardId = params.id;

    if (!flashcardId) {
      return new Response(JSON.stringify({ message: "Flashcard ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

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
    const validatedData = flashcardUpdateSchema.parse(body);

    // Check if at least one field is provided for update
    if (!validatedData.question && !validatedData.answer && !validatedData.difficulty) {
      return new Response(
        JSON.stringify({ message: "At least one field (question, answer, or difficulty) must be provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Update flashcard using service
    const flashcardService = new FlashcardService();
    const result = await flashcardService.updateFlashcard(user.id, flashcardId, validatedData);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error updating flashcard:", error);

    if (error instanceof ZodError) {
      return new Response(
        JSON.stringify({
          message: "Validation failed",
          errors: error.errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (error instanceof Error && error.message === "Flashcard not found") {
      return new Response(JSON.stringify({ message: "Flashcard not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    const flashcardId = params.id;

    if (!flashcardId) {
      return new Response(JSON.stringify({ message: "Flashcard ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

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

    // Delete flashcard using service
    const flashcardService = new FlashcardService();
    await flashcardService.deleteFlashcard(user.id, flashcardId);

    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    console.error("Error deleting flashcard:", error);

    if (error instanceof Error && error.message === "Flashcard not found") {
      return new Response(JSON.stringify({ message: "Flashcard not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
