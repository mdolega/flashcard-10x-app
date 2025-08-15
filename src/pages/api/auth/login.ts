import type { APIRoute } from "astro";
import { z } from "zod";
import type { LoginDTO } from "../../../types/auth.types";

// Validation schema
const loginSchema = z.object({
  email: z.string().email("Nieprawidłowy format email."),
  password: z.string().min(1, "Hasło jest wymagane."),
});

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse request body
    let body: LoginDTO;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ message: "Nieprawidłowy format danych JSON." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate input data
    const validation = loginSchema.safeParse(body);
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

    const { email, password } = validation.data;

    // Authenticate user with Supabase
    const { data, error } = await locals.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Supabase login error:", error);

      // Handle specific Supabase errors
      if (
        error.message.includes("Invalid login credentials") ||
        error.message.includes("Email not confirmed") ||
        error.message.includes("Invalid credentials")
      ) {
        return new Response(JSON.stringify({ message: "Nieprawidłowe dane logowania." }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (error.message.includes("Email rate limit exceeded")) {
        return new Response(JSON.stringify({ message: "Zbyt wiele prób logowania. Spróbuj ponownie później." }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Generic error
      return new Response(JSON.stringify({ message: "Wystąpił błąd podczas logowania." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!data.user || !data.session) {
      return new Response(JSON.stringify({ message: "Logowanie nie powiodło się." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Success response
    return new Response(
      JSON.stringify({
        message: "Logowanie przebiegło pomyślnie.",
        user: {
          id: data.user.id,
          email: data.user.email,
          created_at: data.user.created_at,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `sb-access-token=${data.session.access_token}; HttpOnly; Path=/; Max-Age=${data.session.expires_in}; SameSite=Strict; Secure`,
        },
      }
    );
  } catch (error) {
    console.error("Login endpoint error:", error);
    return new Response(JSON.stringify({ message: "Wystąpił nieoczekiwany błąd." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
