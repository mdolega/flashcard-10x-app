import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";

export interface AuthResult {
  user: {
    id: string;
    email?: string;
    created_at: string;
  };
  accessToken: string;
}

/**
 * Extract and validate authentication from request cookies
 */
export async function getAuthFromRequest(
  request: Request,
  supabase: SupabaseClient<Database>
): Promise<AuthResult | null> {
  try {
    // Extract access token from cookies
    const cookieHeader = request.headers.get("Cookie");
    if (!cookieHeader) {
      return null;
    }

    const cookies = Object.fromEntries(
      cookieHeader.split("; ").map((cookie) => {
        const [key, value] = cookie.split("=");
        return [key, value];
      })
    );

    const accessToken = cookies["sb-access-token"];
    if (!accessToken) {
      return null;
    }

    // Check authentication using access token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return null;
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      accessToken,
    };
  } catch {
    return null;
  }
}

/**
 * Create unauthorized response
 */
export function createUnauthorizedResponse(message = "Unauthorized") {
  return new Response(JSON.stringify({ message }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
