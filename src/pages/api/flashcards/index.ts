import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { FlashcardService } from "../../../lib/services/flashcard.service";
import { flashcardQuerySchema, flashcardCreateSchema } from "../../../lib/schemas/flashcard.schema";
import { getAuthFromRequest, createUnauthorizedResponse } from "../../../lib/utils/auth";

export const prerender = false;

export const GET: APIRoute = async ({ request, url, locals }) => {
  try {
    // Check authentication
    const auth = await getAuthFromRequest(request, locals.supabase);
    if (!auth) {
      return createUnauthorizedResponse();
    }

    // Parse and validate query parameters
    const searchParams = new URLSearchParams(url.search);
    const queryParams: Record<string, string | null> = {};

    // Only include parameters that are actually provided
    const page = searchParams.get("page");
    if (page) queryParams.page = page;

    const limit = searchParams.get("limit");
    if (limit) queryParams.limit = limit;

    const status = searchParams.get("status");
    if (status) queryParams.status = status;

    const difficulty = searchParams.get("difficulty");
    if (difficulty) queryParams.difficulty = difficulty;

    const sort_by = searchParams.get("sort_by");
    if (sort_by) queryParams.sort_by = sort_by;

    const order = searchParams.get("order");
    if (order) queryParams.order = order;

    const validatedParams = flashcardQuerySchema.parse(queryParams);

    // Get flashcards using service
    const flashcardService = new FlashcardService();
    const response = await flashcardService.listFlashcards(auth.user.id, validatedParams);

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
    const auth = await getAuthFromRequest(request, locals.supabase);
    if (!auth) {
      return createUnauthorizedResponse();
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = flashcardCreateSchema.parse(body);

    // Create flashcard using service
    const flashcardService = new FlashcardService();
    const flashcard = await flashcardService.createFlashcard(auth.user.id, validatedData);

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
