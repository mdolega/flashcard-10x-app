import type { APIRoute } from "astro";
import { FlashcardService } from "../../../lib/services/flashcard.service";
import { getAuthFromRequest, createUnauthorizedResponse } from "../../../lib/utils/auth";

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication
    const auth = await getAuthFromRequest(request, locals.supabase);
    if (!auth) {
      return createUnauthorizedResponse();
    }

    // Get statistics from FlashcardService
    const flashcardService = new FlashcardService();
    const stats = await flashcardService.getStatistics(auth.user.id);

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching flashcard stats:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
