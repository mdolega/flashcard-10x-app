# Plan implementacji backendu — powtórki (SRS)

## Zakres

- Endpointy API (Astro):
  - GET `/api/flashcards/review` — lista fiszek „due” do powtórki.
  - POST `/api/flashcards/review/[id]/grade` — ocena fiszki (0–5) i wyliczenie kolejnej powtórki wg SM‑2.
- Serwisy:
  - `src/lib/services/srs.service.ts` — czysta logika SM‑2.
  - Rozszerzenia `src/lib/services/flashcard.service.ts` — listowanie due i ocenianie.
- Zmiany w bazie (Supabase): pola SRS.
- Typy w `src/types.ts`.
- Testy jednostkowe i integracyjne.

## Zmiany w bazie danych (Supabase)

Nowa migracja SQL w `supabase/migrations/` dodająca kolumny SRS do `public.flashcards`:

```sql
alter table public.flashcards
  add column if not exists next_review_at timestamptz not null default now(),
  add column if not exists last_review_at timestamptz,
  add column if not exists repetition integer not null default 0,
  add column if not exists interval_days integer not null default 0,
  add column if not exists easiness numeric(3,2) not null default 2.50,
  add column if not exists lapses integer not null default 0;

create index if not exists flashcards_due_idx
  on public.flashcards(user_id, next_review_at)
  where deleted_at is null;
```

Uwagi:
- Nie zmieniamy RLS — obecne polityki na `user_id` są wystarczające.
- Kwalifikacja do powtórek w MVP: wszystkie fiszki nieusunięte (`deleted_at is null`).

## Typy (`src/types.ts`)

- Rozszerzyć `FlashcardReviewDto` o `answer: string` (ułatwia flip bez dodatkowego fetcha):
  - było: `{ id, question, next_review }`
  - będzie: `{ id, question, answer, next_review }`
- Dodać:
  - `export interface ReviewGradeCommand { grade: 0|1|2|3|4|5 }`
  - `export interface ReviewResultDto { id: string; next_review: string; repetition: number; interval_days: number; easiness: number }`

## Serwis SRS — `src/lib/services/srs.service.ts`

- Czyste funkcje (deterministyczne):
  - `calculate_sm2_next(params: { prev_easiness: number; prev_repetition: number; prev_interval_days: number; grade: 0|1|2|3|4|5 }): { easiness: number; repetition: number; interval_days: number }`
    - Reguły SM‑2:
      - Jeśli `grade < 3`: `repetition = 0`, `interval_days = 1` (lub 0 → 1), `easiness = max(1.3, E + 0.1 - (5 - g) * (0.08 + (5 - g) * 0.02))`.
      - Jeśli `grade ≥ 3`: `repetition += 1`; `interval_days = 1` dla `repetition = 1`, `6` dla `repetition = 2`, inaczej `floor(prev_interval_days * easiness)`.
  - `compute_next_review_at(interval_days: number, now = new Date()): Date` — dodaje dni do `now`.

## Rozszerzenia serwisu — `src/lib/services/flashcard.service.ts`

 - `async listDueForReview(userId: string, query: QueryParams): Promise<FlashcardReviewListResponseDto>`
  - Filtry: `user_id = userId`, `deleted_at is null`, `next_review_at <= now()`.
  - Sort domyślny: `next_review_at asc`. Paginacja: `page=1`, `limit=10` (wg ustaleń).
  - Zwracane pola: `id, question, answer, next_review_at as next_review`.

- `async gradeReview(userId: string, id: string, grade: 0|1|2|3|4|5): Promise<ReviewResultDto>`
  - Pobierz kartę z polami SRS i sprawdź własność użytkownika.
  - Wylicz następny stan przez `srs.service`.
  - Aktualizuj: `easiness`, `repetition`, `interval_days`, `last_review_at = now()`, `next_review_at`.
  - Zwróć `ReviewResultDto`.

## Endpoints (Astro)

Pliki:
- `src/pages/api/flashcards/review/index.ts` (GET)
- `src/pages/api/flashcards/review/[id]/grade.ts` (POST)

### GET /api/flashcards/review

- Query: `page?=1`, `limit?=10`, `sort_by?=next_review_at`, `order?=asc`.
- Filtry: `is_accepted=true`, `deleted_at is null`, `next_review_at <= now()`.
- Odpowiedź: `FlashcardReviewListResponseDto` z pozycjami `{ id, question, answer, next_review }`.
- Błędy: `401` (brak sesji), `400` (złe parametry).

### POST /api/flashcards/review/[id]/grade

- Body: `{ grade: 0|1|2|3|4|5 }`.
- Efekt: aktualizacja pól SRS dla fiszki użytkownika.
- Odpowiedź: `ReviewResultDto`.
- Błędy: `401` (brak sesji), `404` (brak fiszki lub nie należy do użytkownika), `400` (zła ocena).

## Walidacja

- Proponowany Zod w warstwie API (spójnie z istniejącym użyciem schematów):
  - `grade` jako `z.number().int().min(0).max(5)`.
  - Paginacja: `page`, `limit` jako `z.coerce.number().int().min(1)`; `limit` górny np. `50`.

## Domyślny stan SRS dla nowych fiszek

- `easiness = 2.5`, `repetition = 0`, `interval_days = 0`, `next_review_at = now()` — potwierdzone.

## Kwalifikacja do SRS

- Wszystkie nieusunięte fiszki (MVP): `deleted_at is null`.

## Testy

- Jednostkowe (`src/lib/services/__tests__/srs.service.test.ts`):
  - Wszystkie oceny 0–5, w tym granice `easiness ≥ 1.3` i rosnące interwały.
  - Reset powtórzeń przy ocenie < 3.
- Integracyjne (API):
  - GET filtruje tylko due i zaakceptowane; poprawna paginacja/sort.
  - POST aktualizuje pola SRS i zwraca prawidłowe wartości.

## Błędy i bezpieczeństwo

- 401: brak ważnej sesji.
- 404: fiszka nie istnieje lub nie należy do użytkownika.
- 400: niepoprawny `grade` lub parametry zapytania.
- RLS Supabase egzekwuje własność rekordów.

## Przyszłe rozszerzenia (po MVP)

- Dzienny limit nowych/przerabianych kart (konfiguracja w `/settings`).
- Logika przerw/kapnięć („lapses”) w metrykach i odrębna wizualizacja.
- Ewentualne przeniesienie historii powtórek do osobnej tabeli (`reviews`) jeśli potrzebna będzie analityka.


