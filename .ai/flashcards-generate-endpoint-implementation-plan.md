# API Endpoint Implementation Plan: POST /flashcards/generate

## 1. Przegląd punktu końcowego
Endpoint służy do generowania zestawu fiszek na podstawie dostarczonego tekstu za pomocą usługi AI. Wynikiem jest zapisanie logu generacji w tabeli `ai_generations_logs`, utworzenie nowych rekordów w tabeli `flashcards` z `status = 'ai-generated'` oraz zwrócenie wygenerowanych fiszek i identyfikatora generacji.

## 2. Szczegóły żądania
- Metoda HTTP: POST
- Ścieżka: `/flashcards/generate`
- Nagłówki:
  - Authorization: `Bearer <token>`
  - Content-Type: `application/json`
- Brak parametrów ścieżki lub query
- Body (JSON):
  ```json
  {
    "text": "string",        // wymagane, długość 500–10000 znaków
    "count": number           // wymagane, zakres 1–20
  }
  ```
- Walidacja wejścia:
  - `text`: typ string, min 500, max 10000
  - `count`: typ number, min 1, max 20
  - Użyć `zod` dla schematu

## 3. Szczegóły odpowiedzi
- 201 Created
  ```json
  {
    "flashcards": [
      { "question": "string", "answer": "string", "difficulty": "easy|medium|hard" }
    ],
    "generation_id": "uuid"
  }
  ```
- 400 Bad Request – nieprawidłowe dane wejściowe
- 401 Unauthorized – brak lub nieprawidłowy token
- 503 Service Unavailable – błąd usługi AI (możliwy nagłówek `Retry-After`)
- 500 Internal Server Error – niespodziewany błąd serwera

## 4. Przepływ danych
1. **Autoryzacja**: wydobycie `user_id` z `context.locals.supabase.auth.getUser()`
2. **Walidacja**: parsowanie i weryfikacja body z użyciem `zod`
3. **Log AI**: w serwisie `aiLogService`:
   - zbudować obiekt logu: `{ user_id, prompt: text, model, cost?, tokens?, status: 'pending' }`
   - wstępnie wstawić rekord z `status='pending'`
4. **Generacja AI**:
   - wywołać klienta AI (np. OpenRouter) z parametrami `text`, `count`
   - otrzymać odpowiedź: lista QA + metadane (model, cost, tokens)
5. **Aktualizacja logu**:
   - uaktualnić rekord w `ai_generations_logs` z pełną odpowiedzią, `status='success'` i polami `response`, `model`, `cost`, `tokens`
6. **Tworzenie fiszek**:
   - przygotować tablicę insertów:
     ```ts
     { user_id, ai_generation_id: generationId, question, answer, difficulty, status: 'ai-generated' }
     ```
   - wykonać `supabase.from('flashcards').insert([...])` (bulk insert)
7. **Zwrócenie odpowiedzi**: zmapować na `GenerateFlashcardDto[]` i zwrócić z `generation_id`

## 5. Względy bezpieczeństwa
- Wymaganie tokena Bearer JWT i sprawdzenie RLS w Supabase (polityki na `user_id`)
- Ograniczenie rozmiaru i długości `text` aby zapobiec DoS
- Walidacja `count` żeby uniknąć nadmiernych zapytań do AI
- Obsługa limitów rate limiting (np. w middleware)

## 6. Obsługa błędów
- **400**: błąd walidacji `zod`, odpowiedź z listą błędów
- **401**: brak/nieprawidłowy token
- **503**: błąd połączenia lub odpowiedź AI; należy zaktualizować log z `status='error'` i `status_code=503`
- **500**: nieoczekiwany wyjątek; logować szczegóły błędu i zwrócić ogólny komunikat

## 7. Wydajność
- Bulk insert fiszek zamiast pojedynczych operacji
- Asynchroniczne wywołanie AI i operacje DB
- Index na `flashcards(user_id)` i `ai_generations_logs(user_id)`
- Timer/timeout dla wywołań do AI na 60s

## 8. Kroki implementacji
1. Utworzyć zod schema i dodać/zmodyfikować typ `FlashcardGenerateCommand` w `src/types.ts` (dodać `count`).
2. Stworzyć/uszczegółowić serwis `aiLogService` w `src/lib/services/ai-generation-log.service.ts` do tworzenia i aktualizacji logów.
3. Stworzyć serwis `flashcardService.generateFromAI(text, count, userId)` w `src/lib/services/flashcard.service.ts`.
4. Utworzyć plik endpointu: `src/pages/api/flashcards/generate.ts`:
   - Import schematów, serwisów, supabase z `context.locals`
   - Parsować body, uwierzytelniać użytkownika
   - Wywołać `flashcardService.generateFromAI(...)`
   - Zwrócić JSON z `201`
5. Zaktualizować dokumentację API (Swagger/OpenAPI lub plik `.ai/api-plan.md`).