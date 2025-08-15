import type { APIRoute } from "astro";
import { z } from "zod";
import type { ChangePasswordDTO } from "../../../types/auth.types";

// Validation schema
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Obecne hasło jest wymagane."),
  newPassword: z.string().min(8, "Nowe hasło musi mieć co najmniej 8 znaków."),
});

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse request body
    let body: ChangePasswordDTO;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ message: "Nieprawidłowy format danych JSON." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate input data
    const validation = changePasswordSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.map((err) => err.message);
      return new Response(
        JSON.stringify({
          message: "Nieprawidłowe dane wejściowe.",
          errors: errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { currentPassword, newPassword } = validation.data;

    // Get current user session
    const {
      data: { user },
      error: userError,
    } = await locals.supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ message: "Użytkownik nie jest zalogowany." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify current password by attempting to sign in
    if (!user.email) {
      return new Response(JSON.stringify({ message: "Użytkownik nie ma przypisanego emaila." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { error: verifyError } = await locals.supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      console.error("Current password verification error:", verifyError);
      return new Response(JSON.stringify({ message: "Nieprawidłowe obecne hasło." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update password
    const { error: updateError } = await locals.supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error("Supabase password update error:", updateError);

      // Handle specific Supabase errors
      if (updateError.message.includes("Password should be at least")) {
        return new Response(JSON.stringify({ message: "Nowe hasło musi mieć co najmniej 8 znaków." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (updateError.message.includes("New password should be different")) {
        return new Response(JSON.stringify({ message: "Nowe hasło musi być różne od obecnego." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Generic error
      return new Response(JSON.stringify({ message: "Wystąpił błąd podczas zmiany hasła." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Success response
    return new Response(JSON.stringify({ message: "Hasło zostało pomyślnie zmienione." }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Change password endpoint error:", error);
    return new Response(JSON.stringify({ message: "Wystąpił nieoczekiwany błąd." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
