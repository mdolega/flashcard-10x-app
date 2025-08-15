# Specyfikacja architektury modułu uwierzytelniania

Dokument opisuje plan implementacji rejestracji, logowania i zmiany hasła użytkowników w aplikacji Fiszki AI.

---

## 1. ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

### 1.1 Layouty

- **GlobalLayout** (src/layouts/GlobalLayout.astro)
  - Jeden layout obsługujący zarówno strony publiczne, jak i chronione.
  - Na podstawie stanu sesji i ścieżki renderuje:
    - uproszczony header (logo + centralny kontener formularza) dla `/auth`
    - pełny header z nawigacją i stopką dla widoków chronionych

### 1.2 Strony Astro

- `/auth` (src/pages/auth.astro)
  - Jedyny punkt wejścia do wszystkich widoków auth.
  - Przyjmuje parametr `mode` (`login` | `register` | `reset` | `update` | `change`).
  - Renderuje `GlobalLayout` + React `<AuthForm mode={mode} />`.
  - `mode="change"` dostępne tylko jeśli użytkownik jest zalogowany.

### 1.3 Komponenty React (src/components/auth)

- `<AuthForm />`
  - Prop `mode: "login" | "register" | "reset" | "update" | "change"`.
  - Renderuje odpowiednie pola i walidację dla danego trybu:
    - login/register: `email`, `password`
    - reset: `email`
    - update: `newPassword`, `confirmPassword`, token z query
    - change: `currentPassword`, `newPassword`, `confirmPassword`
  - Wysyła POST `/api/auth/{mode}` z odpowiednim payload.

### 1.4 Walidacja i komunikaty błędów

- Jedna wspólna logika walidacji (np. Zod schemas):
  - `email`: regex + wymagane
  - `password`: min 8 znaków
  - `confirmPassword`: równość z `newPassword`
- Mapowanie scenariuszy błędów:
  - 409 Conflict: email zajęty
  - 401 Unauthorized: niepoprawne dane logowania
  - 403 Forbidden: niepoprawne hasło
  - 400 Bad Request: walidacja lub wygasły token

## 2. LOGIKA BACKENDOWA

### 2.1 Struktura endpointów API (src/pages/api/auth)

- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/logout`
- POST `/api/auth/password-reset`           (inicjuje wysłanie emaila)
- POST `/api/auth/password-update`          (reset za pomocą tokenu)
- POST `/api/auth/change-password`          (autoryzacja JWT)

Każdy handler:
- Deserializuje JSON do obiektu typu DTO (TS interface lub `zod` schema)
- Wykonuje walidację pól (regex + długość)
- Wywołuje metody Supabase Auth (np. `supabase.auth.signUp`, `signInWithPassword`, `sendPasswordResetEmail`, `updateUser`)
- Mapuje błędy Supabase na HTTP:
  - 400 Bad Request (walidacja)
  - 401 Unauthorized
  - 403 Forbidden
  - 409 Conflict (email zajęty)
  - 500 Internal Server Error (nieoczekiwane)

### 2.2 Modele danych i typy

```ts
// src/types.ts lub src/types/auth.ts
interface RegisterDTO { email: string; password: string }
interface LoginDTO    { email: string; password: string }
interface ResetDTO    { email: string }
interface UpdateDTO   { token: string; newPassword: string }
interface ChangeDTO   { currentPassword: string; newPassword: string }

interface AuthResponse { user: User; session: Session }
interface ErrorResponse { status: number; message: string }
```

### 2.3 Obsługa wyjątków

- Użyć `try/catch` wokół wywołań Supabase
- W `catch` zwracać `return new Response(JSON.stringify({ message }), { status })`
- Logowanie błędów po stronie serwera (console.error lub zewnętrzny logger)

### 2.4 SSR i konfiguracja Astro

- W `astro.config.mjs` dodać integrację z Supabase:
  ```js
  import { defineConfig } from 'astro/config';
  import supabase from '@astrojs/supabase';

  export default defineConfig({
    integrations: [
      supabase(),
    ],
    // ...
  });
  ```
- Upewnić się, że `env` zawiera `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## 3. SYSTEM AUTENTYKACJI

### 3.0 Inicjalizacja klienta Supabase i middleware (wg @api-supabase-astro-init)
- Korzystamy z istniejącego pliku `/src/db/supabase.client.ts`, który inicjalizuje i eksportuje `supabaseClient: SupabaseClient<Database>` przy użyciu `@supabase/supabase-js`.
- `/src/middleware/index.ts`:
  ```ts
  import { defineMiddleware } from 'astro:middleware';
  import { supabaseClient } from '../db/supabase.client.ts';

  export const onRequest = defineMiddleware((context, next) => {
    context.locals.supabase = supabaseClient;
    return next();
  });
  ```
- `src/env.d.ts`:
  ```ts
  /// <reference types="astro/client" />
  import type { SupabaseClient } from '@supabase/supabase-js';
  import type { Database } from './db/database.types.ts';

  declare global {
    namespace App {
      interface Locals {
        supabase: SupabaseClient<Database>;
      }
    }
  }

  interface ImportMetaEnv {
    readonly SUPABASE_URL: string;
    readonly SUPABASE_KEY: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  ```

### 3.1 Wykorzystanie klienta Supabase w modułach auth
- Korzystać z `context.locals.supabase` lub `supabaseClient` do wywołań auth:
  - rejestracja: `supabaseClient.auth.signUp({ email, password })`
  - logowanie: `supabaseClient.auth.signInWithPassword({ email, password })`
  - wysyłanie linku resetu: `supabaseClient.auth.resetPasswordForEmail(email)`
  - reset hasła z tokenem: `supabaseClient.auth.updateUser({ password: newPassword })`
  - zmiana hasła (zalogowany user): `supabaseClient.auth.updateUser({ password: newPassword })`
  - wylogowanie: `supabaseClient.auth.signOut()`
- Wykorzystanie gotowych mechanizmów Supabase Auth minimalizuje kod niestandardowy i zapewnia sprawdzone bezpieczeństwo.

### 3.2 Middleware ochrony tras (src/middleware/index.ts)

- Lista tras publicznych: `/login`, `/register`, `/reset-password`, `/reset-password/:token`
- Lista tras chronionych: `/dashboard`, `/flashcards`, `/change-password` itd.
- Funkcja middleware:
  - Odczytuje sesję z ciasteczka JWT (`supabase.auth.getSessionFromCookie(request)`)
  - Jeśli brak sesji na trasie chronionej → redirect `/login`
  - Jeśli sesja exists na trasie publicznej → redirect `/dashboard`

### 3.3 Wylogowanie

- Endpoint POST `/api/auth/logout`:
  - `await supabase.auth.signOut();`
  - Czyści cookie (`set-cookie` z expires)
  - Zwraca 200 + `{ message: 'Wylogowano.' }`
- Front-end: `await fetch('/api/auth/logout', { method: 'POST' });` + redirect `/login`

### 3.4 Ciasteczka i sesja

- Ustawiać HttpOnly cookie z tokenem
- TTL sesji: np. 7 dni
- Automatyczne odświeżanie tokena przez Supabase JS

---

*Specyfikacja przygotowana zgodnie z wymaganiami PRD US-001–US-003 i obowiązującą architekturą aplikacji.* 

Cały interfejs użytkownika powinien korzystać ze wspólnych zmiennych stylów i komponentów z `@shared` oraz komponentów Shadcn/UI zgodnie z dokumentacją `@ui-shadcn-helper`, aby zachować spójny design system i zapewnić dostępność. 