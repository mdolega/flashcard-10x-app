import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  try {
    // Sign out user with Supabase
    const { error } = await locals.supabase.auth.signOut();

    if (error) {
      console.error("Supabase logout error:", error);
      return new Response(JSON.stringify({ message: "Wystąpił błąd podczas wylogowania." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Success response with cookie clearing
    return new Response(JSON.stringify({ message: "Wylogowanie przebiegło pomyślnie." }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": "sb-access-token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict; Secure",
      },
    });
  } catch (error) {
    console.error("Logout endpoint error:", error);
    return new Response(JSON.stringify({ message: "Wystąpił nieoczekiwany błąd." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
