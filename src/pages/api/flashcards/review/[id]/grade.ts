import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { FlashcardService } from "../../../../../lib/services/flashcard.service";
import { reviewGradeSchema } from "../../../../../lib/schemas/flashcard.schema";

export const prerender = false;

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const id = params.id;
    if (!id) {
      return new Response(JSON.stringify({ message: "Missing id" }), {
        status: 400,
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

    const body = await request.json();
    const { grade } = reviewGradeSchema.parse(body);

    const service = new FlashcardService();
    const result = await service.gradeReview(user.id, id, grade as 0 | 1 | 2 | 3 | 4 | 5);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return new Response(JSON.stringify({ message: "Validation failed", errors: error.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error instanceof Error && error.message === "Flashcard not found") {
      return new Response(JSON.stringify({ message: "Not found" }), {
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
