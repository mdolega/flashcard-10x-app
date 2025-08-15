import type { APIRoute } from "astro";
import { z } from "zod";

const UpdatePasswordSchema = z.object({
  token: z.string().min(1, "Token jest wymagany"),
  newPassword: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków"),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();

    // Validate input
    const result = UpdatePasswordSchema.safeParse(body);
    if (!result.success) {
      return new Response(
        JSON.stringify({
          message: result.error.errors[0]?.message || "Nieprawidłowe dane",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { newPassword } = result.data;
    const supabase = locals.supabase;

    // Update password using the token
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error("Password update error:", error);

      let message = "Wystąpił błąd podczas zmiany hasła.";
      if (error.message.includes("token")) {
        message = "Link do resetowania hasła jest nieprawidłowy lub wygasł.";
      }

      return new Response(JSON.stringify({ message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!data.user) {
      return new Response(
        JSON.stringify({
          message: "Nie udało się zaktualizować hasła.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Hasło zostało pomyślnie zmienione.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Password update error:", error);
    return new Response(
      JSON.stringify({
        message: "Wystąpił błąd serwera. Spróbuj ponownie.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const prerender = false;
