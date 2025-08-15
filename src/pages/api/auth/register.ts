import type { APIRoute } from "astro";
import { z } from "zod";
import type { RegisterDTO } from "../../../types";

// Validation schema
const registerSchema = z.object({
  email: z.string().email("Nieprawidłowy format email."),
  password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków."),
});

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse request body
    let body: RegisterDTO;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ message: "Nieprawidłowy format danych JSON." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate input data
    const validation = registerSchema.safeParse(body);
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

    // Register user with Supabase
    const { data, error } = await locals.supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error("Supabase registration error:", error);

      // Handle specific Supabase errors
      if (error.message.includes("User already registered")) {
        return new Response(JSON.stringify({ message: "Email już w użyciu." }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (error.message.includes("Password should be at least")) {
        return new Response(JSON.stringify({ message: "Hasło musi mieć co najmniej 8 znaków." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (error.message.includes("Invalid email")) {
        return new Response(JSON.stringify({ message: "Nieprawidłowy format email." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Generic error
      return new Response(JSON.stringify({ message: "Wystąpił błąd podczas rejestracji." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!data.user || !data.session) {
      return new Response(JSON.stringify({ message: "Rejestracja nie powiodła się." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Success response
    return new Response(
      JSON.stringify({
        message: "Rejestracja przebiegła pomyślnie.",
        user: {
          id: data.user.id,
          email: data.user.email,
          created_at: data.user.created_at,
        },
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `sb-access-token=${data.session.access_token}; HttpOnly; Path=/; Max-Age=${data.session.expires_in}; SameSite=Strict; Secure`,
        },
      }
    );
  } catch (error) {
    console.error("Registration endpoint error:", error);
    return new Response(JSON.stringify({ message: "Wystąpił nieoczekiwany błąd." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
