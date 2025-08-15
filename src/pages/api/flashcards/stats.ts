import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request }) => {
  try {
    // Extract JWT token from Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // For now, return mock statistics
    // In production, this would query the database with user_id from JWT token
    // const token = authHeader.substring(7);
    const stats = {
      totalFlashcards: 42,
      pendingReview: 8,
      studiedToday: 15,
      accuracy: 85,
    };

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
