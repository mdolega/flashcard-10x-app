# Architektura UI dla Fiszki AI

## 1. Przegląd struktury UI

Aplikacja składa się z jednego globalnego layoutu (`GlobalLayout`), który zawiera:
- TopNavbar (desktop) i BottomNav (mobile) z zakładkami: Dashboard, Generowanie, Fiszki, Powtórki, Ustawienia, Wyloguj
- Sekcję główną, w której renderowane są widoki zależnie od ścieżki i stanu uwierzytelnienia (RequireAuth)
- Providerów: `AuthContext`, `TanStack Query`, `ToastProvider`, `ErrorBoundary`

## 2. Lista widoków

- **Auth (Login / Rejestracja)**
  - Ścieżka: `/auth`
  - Cel: umożliwienie rejestracji i logowania
  - Kluczowe informacje: pola email, hasło; walidacja;
  - Komponenty: `AuthForm` z zakładkami, inline error, przycisk submit
  - UX/Dostępność/Bezpieczeństwo: walidacja pola, aria-invalid, ochrona tras publicznych

- **Generowanie fiszek**
  - Ścieżka: `/generate`
  - Cel: formularz inputu tekstu i liczby fiszek, wywołanie AI
  - Kluczowe informacje: textarea (500–10000 znaków), licznik znaków, liczba fiszek (1–20)
  - Komponenty: `GenerateForm`, skeleton loader, retry button, toast error
  - UX/Dostępność/Bezpieczeństwo: aria-describedby, limitacja znaków, obsługa ładowania i błędów

- **Lista fiszek**
  - Ścieżka: `/flashcards`
  - Cel: wyświetlenie i zarządzanie fiszkami użytkownika
  - Kluczowe informacje: pytanie, status, poziom trudności, data utworzenia
  - Komponenty: `FlashcardsTable` (TanStack Query, paginacja, skeleton), akcje: edit, delete, accept/reject
  - UX/Dostępność/Bezpieczeństwo: focusable rows, aria-labels dla przycisków, confirmation modal dla usunięcia

- **Modal edycji fiszki**
  - Cel: edycja pytania, odpowiedzi, poziomu trudności
  - Kluczowe informacje: pola z walidacją, przycisk zapisz
  - Komponenty: `EditFlashcardModal` (React Hook Form, inline error, toast success)
  - UX/Dostępność/Bezpieczeństwo: trap focus, keyboard access, aria-modal

- **Powtórki**
  - Ścieżka: `/review`
  - Cel: prezentacja fiszek do powtórki zgodnie z SRS
  - Komponenty: `ReviewCard` (flip animation, skeleton), paginacja logiczna
  - UX/Dostępność/Bezpieczeństwo: aria-live dla zmiany treści, przyciski focusable

- **Ustawienia**
  - Ścieżka: `/settings`
  - Cel: zmiana hasła i usunięcie konta
  - Kluczowe informacje: pola current/new password, button delete account z potwierdzeniem
  - Komponenty: `SettingsForm` (inline error, modal confirm delete, toast)
  - UX/Dostępność/Bezpieczeństwo: hide password, confirm dialog, obsługa błędów HTTP

## 3. Mapa podróży użytkownika

1. Nowy użytkownik → `/auth` → rejestracja → JWT w `localStorage` → redirect → `/dashboard`
2. Dashboard → klik „Generuj fiszki” → `/generate`
3. Wklejenie tekstu/liczba → POST `/flashcards/generate` → toast success → redirect → `/flashcards`
4. Lista fiszek → edycja/modal lub akceptacja/odrzucenie → aktualizacja tabeli
5. Użytkownik klika „Powtórki” → `/review` → przegląda karty, ocenia → kończy przegląd
6. Użytkownik klika „Ustawienia” → `/settings` → zmienia hasło lub usuwa konto → logout → `/auth`

## 4. Układ i struktura nawigacji

- GlobalLayout:
  - Providers: `AuthContext`, `QueryClientProvider`, `ToastProvider`, `ErrorBoundary`
  - NavDesktop: TopNavbar z linkami i Logout
  - NavMobile: BottomNav z ikonami i etykietami
  - Outlet dla widoków
- Routing:
  - Public route `/auth`
  - Chronione trasy dla wszystkich innych widoków (RequireAuth)

## 5. Kluczowe komponenty

- **GlobalLayout**: zarządza layoutem, nav, providerami
- **AuthForm**: formularz login/register z walidacją
- **DashboardCard**: karta statystyk
- **GenerateForm**: textarea + licznik + count input
- **FlashcardsTable**: tabela z TanStack Query + paginacja
- **EditFlashcardModal**: modal edycji z formularzem
- **ReviewCard**: pojedyncza karta z flip animation
- **SettingsForm**: formularz zmiany hasła + delete account
- **RequireAuth**: HOC chroniący trasy
- **ToastProvider** + **useToast**: system powiadomień
- **ErrorBoundary**: globalne przechwytywanie błędów 