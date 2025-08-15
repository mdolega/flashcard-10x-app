import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { FlashcardService } from "../../../../lib/services/flashcard.service";
import { reviewQuerySchema } from "../../../../lib/schemas/flashcard.schema";

export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    // Basic runtime config guard: allow UI to work without DB during setup
    if (!import.meta.env.SUPABASE_URL || !import.meta.env.SUPABASE_KEY) {
      console.warn("/api/flashcards/review: Missing SUPABASE_URL/KEY – returning empty list");
      return new Response(JSON.stringify({ data: [], pagination: { page: 1, limit: 10, total: 0 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

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

    const searchParams = new URLSearchParams(url.search);
    const page = searchParams.get("page") ?? undefined;
    const limit = searchParams.get("limit") ?? undefined;
    const sort_by = searchParams.get("sort_by") ?? undefined;
    const order = searchParams.get("order") ?? undefined;
    const queryParams = { page, limit, sort_by, order };

    const validated = reviewQuerySchema.parse(queryParams);

    const service = new FlashcardService();
    const result = await service.listDueForReview(user.id, validated);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in /api/flashcards/review GET:", error);
    if (error instanceof ZodError) {
      return new Response(JSON.stringify({ message: "Invalid query parameters", errors: error.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Always return empty list for now to unblock UI while SRS migrations/config may be pending
    console.warn("Returning empty review list due to error", (error as Error)?.message);
    return new Response(JSON.stringify({ data: [], pagination: { page: 1, limit: 10, total: 0 } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
