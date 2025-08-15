import { defineMiddleware } from "astro:middleware";
import type { APIContext, MiddlewareNext } from "astro";
import { supabaseClient } from "../db/supabase.client";

// Define public and protected routes
// Note: PUBLIC_ROUTES defined for documentation but AUTH_ROUTES and PROTECTED_ROUTES are used for logic

const AUTH_ROUTES = ["/login", "/register", "/reset-password"];

const PROTECTED_ROUTES = ["/dashboard", "/flashcards", "/generate", "/change-password"];

// Function to check if route matches pattern
const isRouteMatch = (pathname: string, routes: string[]): boolean => {
  return routes.some((route) => {
    if (route === pathname) return true;
    // Handle dynamic routes like /reset-password/[token]
    if (route.includes("[") && pathname.startsWith(route.split("[")[0])) return true;
    return false;
  });
};

// Function to get user session from cookies
const getUserSession = async (request: Request) => {
  try {
    // Get session from Supabase using request headers
    const cookieHeader = request.headers.get("Cookie");

    if (!cookieHeader) return null;

    // Extract access token from cookies
    const cookies = Object.fromEntries(
      cookieHeader.split("; ").map((cookie) => {
        const [key, value] = cookie.split("=");
        return [key, value];
      })
    );

    const accessToken = cookies["sb-access-token"];
    if (!accessToken) return null;

    // Verify session with Supabase
    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser(accessToken);

    if (error || !user) return null;

    return { user, accessToken };
  } catch (error) {
    console.error("Session verification error:", error);
    return null;
  }
};

export const onRequest = defineMiddleware(async (context: APIContext, next: MiddlewareNext) => {
  // Add Supabase client to context
  context.locals.supabase = supabaseClient;

  const { pathname } = context.url;

  // Skip middleware for API routes (they handle auth internally)
  if (pathname.startsWith("/api/")) {
    return next();
  }

  // Skip middleware for static assets
  if (pathname.includes(".") && !pathname.endsWith(".astro")) {
    return next();
  }

  try {
    // Get user session
    const session = await getUserSession(context.request);
    const isLoggedIn = !!session;

    // Add user info to context if logged in
    if (isLoggedIn) {
      context.locals.user = session.user;
      context.locals.accessToken = session.accessToken;
    }

    // Handle protected routes
    if (isRouteMatch(pathname, PROTECTED_ROUTES)) {
      if (!isLoggedIn) {
        // Redirect to login if not authenticated
        return context.redirect("/login", 302);
      }
    }

    // Handle auth routes (redirect if already logged in)
    if (isRouteMatch(pathname, AUTH_ROUTES)) {
      if (isLoggedIn) {
        // Redirect to dashboard if already authenticated
        return context.redirect("/dashboard", 302);
      }
    }

    // Continue to next middleware or route
    return next();
  } catch (error) {
    console.error("Middleware error:", error);

    // On error, allow public routes but redirect protected ones to login
    if (isRouteMatch(pathname, PROTECTED_ROUTES)) {
      return context.redirect("/login", 302);
    }

    return next();
  }
});
