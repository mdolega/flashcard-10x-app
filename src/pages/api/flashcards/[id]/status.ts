import type { APIRoute } from "astro";

export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const flashcardId = params.id;

    // Extract JWT token from Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body = await request.json();
    const { status } = body;

    if (!status || !["accepted", "rejected"].includes(status)) {
      return new Response(JSON.stringify({ message: 'Invalid status. Must be "accepted" or "rejected"' }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // For now, just return success
    // In production, this would update the database
    console.log(`Updating flashcard ${flashcardId} status to ${status}`);

    return new Response(
      JSON.stringify({
        message: "Status updated successfully",
        id: flashcardId,
        status,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating flashcard status:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
