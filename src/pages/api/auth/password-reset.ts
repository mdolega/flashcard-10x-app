import type { APIRoute } from "astro";
import { z } from "zod";

const ResetPasswordSchema = z.object({
  email: z.string().email("Nieprawidłowy format email"),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();

    // Validate input
    const result = ResetPasswordSchema.safeParse(body);
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

    const { email } = result.data;
    const supabase = locals.supabase;

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${new URL(request.url).origin}/auth?mode=update`,
    });

    if (error) {
      console.error("Password reset error:", error);

      // Generic error message for security
      return new Response(
        JSON.stringify({
          message: "Jeśli podany adres email istnieje, zostanie wysłany link do resetowania hasła.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Link do resetowania hasła został wysłany na podany email.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Password reset error:", error);
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
