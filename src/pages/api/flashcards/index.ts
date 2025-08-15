import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { FlashcardService } from "../../../lib/services/flashcard.service";
import { flashcardQuerySchema, flashcardCreateSchema } from "../../../lib/schemas/flashcard.schema";

export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
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

    // Parse and validate query parameters
    const searchParams = new URLSearchParams(url.search);
    const queryParams = {
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      status: searchParams.get("status"),
      difficulty: searchParams.get("difficulty"),
      sort_by: searchParams.get("sort_by"),
      order: searchParams.get("order"),
    };

    const validatedParams = flashcardQuerySchema.parse(queryParams);

    // Get flashcards using service
    const flashcardService = new FlashcardService();
    const response = await flashcardService.listFlashcards(user.id, validatedParams);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching flashcards:", error);

    if (error instanceof ZodError) {
      return new Response(
        JSON.stringify({
          message: "Invalid query parameters",
          errors: error.errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

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
    const validatedData = flashcardCreateSchema.parse(body);

    // Create flashcard using service
    const flashcardService = new FlashcardService();
    const flashcard = await flashcardService.createFlashcard(user.id, validatedData);

    return new Response(JSON.stringify(flashcard), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating flashcard:", error);

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

    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
