# Plan implementacji frontendu — powtórki (SRS)

## Zakres

- Strona: `/review` (chroniona), w `GlobalLayout.astro`.
- Dane: GET `/api/flashcards/review` (batch 10), POST `/api/flashcards/review/{id}/grade`.
- Komponenty: `ReviewCard`, `ReviewControls`, `ReviewProgress`.
- Hooki danych: `useReviewQueue` (TanStack Query).
- UX: flip karty, skróty klawiaturowe, skeleton, empty state, toasty błędów.

## Routing i strona

- `src/pages/review.astro`:
  - Wymusza `RequireAuth`.
  - Renderuje kontener React z kolejką powtórek (client:load lub client:visible).

## Hooki danych

- `src/components/hooks/useReviewQueue.ts`:
  - `fetchDueReview({ page=1, limit=10 })` → GET `/api/flashcards/review` zwraca `FlashcardReviewListResponseDto` z elementami `{ id, question, answer, next_review }`.
  - `gradeReview({ id, grade })` → POST `/api/flashcards/review/{id}/grade` zwraca `ReviewResultDto`.
  - `useQuery(['review', page, limit], () => fetchDueReview({ page, limit }))`.
  - `useMutation(gradeReview, { onSuccess: invalidate or optimistic advance })`.

## Komponenty

- `src/components/ReviewCard.tsx`:
  - Props: `{ question: string; answer: string; is_flipped: boolean; onFlip: () => void }`.
  - Styl: Tailwind + shadcn/ui; dostępność: aria-live przy zmianie treści.

- `src/components/ReviewControls.tsx`:
  - Przyciski: 6-stopniowa skala SM‑2: 0,1,2,3,4,5 (etykiety np. 0=Again, 3=Hard, 4=Good, 5=Easy; 1–2 jako Poor/Fail).
  - Mapowanie ocen: bezpośrednio 0→0, 1→1, 2→2, 3→3, 4→4, 5→5.
  - Skróty klawiaturowe: klawisze `0`–`5`.

- `src/components/ReviewProgress.tsx`:
  - Licznik: bieżąca pozycja / długość kolejki, info o najbliższej dacie gdy pusto.

## Logika UI i stan

- Lokalny stan: `currentIndex`, `isFlipped`.
- Po `grade`:
  - optymistycznie przejdź do kolejnej karty,
  - jeśli zabraknie lokalnych kart, `fetchNextPage`/refetch listy due.
- Empty state: pokazać najbliższy `next_review` (z zapytania lub dodatkowego zapytania minimalnego terminu), CTA do `/flashcards`.

## Typy i kontrakty

- `FlashcardReviewDto` zawiera `answer` (zgodne z backendem).
- `ReviewGradeCommand`: `{ grade: 0|1|2|3|4|5 }`.
- `ReviewResultDto`: `{ id, next_review, repetition, interval_days, easiness }`.

## Obsługa błędów i dostępność

- Toast na `onError` mutacji i zapytań.
- Zablokować przyciski w trakcie mutacji.
- Focus management po flipie i po ocenie.

## Testy (Vitest + RTL)

- `ReviewCard`: flip, renderowanie pytania/odpowiedzi.
- `ReviewControls`: mapowanie przycisków i skrótów 1/2/3/4 do prawidłowych ocen.
- `useReviewQueue`: optymistyczne przejście i refetch po wyczerpaniu batcha.

## Przyszłe rozszerzenia (po MVP)

- Tryb „learn ahead” (przegląd nie-due z lekką karą).
- Ustawienia limitów dziennych w `/settings`.


