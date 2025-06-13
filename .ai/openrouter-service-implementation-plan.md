# OpenRouter Service Implementation Plan

## 1. Opis usługi
OpenRouterService to moduł odpowiedzialny za komunikację z API OpenRouter w celu generowania odpowiedzi czatowych opartych na modelach LLM. Główne zadania:
1. Autoryzacja i konfiguracja połączenia z OpenRouter.
2. Budowa i wysyłanie żądań czatowych (system, użytkownik) z uwzględnieniem nazwy modelu i parametrów.
3. Wymuszanie ustrukturyzowanych odpowiedzi zgodnie z `response_format` (schemat JSON).
4. Obsługa i mapowanie odpowiedzi na typy wewnętrzne.
5. Zarządzanie błędami (rate-limit, timeout, błędy serwera).
6. Logowanie żądań i odpowiedzi w celach monitoringu i debugowania.

## 2. Opis konstruktora
```ts
interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;           // domyślnie https://openrouter.ai/v1
  defaultModel?: string;      // np. 'gpt-4o-mini'
  defaultParams?: ModelParams;
}

class OpenRouterService {
  constructor(private config: OpenRouterConfig) {
    // 1. Walidacja obecności apiKey
    // 2. Inicjalizacja Axios z baseUrl i nagłówkiem Authorization
    // 3. Dodanie interceptora do obsługi HTTP errorów
  }
}
```
Opis parametrów:
- `apiKey`: klucz API używany w nagłówku `Authorization: Bearer {apiKey}`.
- `baseUrl`: adres endpointu OpenRouter.
- `defaultModel`: domyślna nazwa modelu.
- `defaultParams`: domyślne parametry modelu (temperatura, max_tokens).

## 3. Publiczne metody i pola
1. `generateChatCompletion(params: GenerateChatParams): Promise<ChatMessage[]>`
   - Przyjmuje listę komunikatów (`system`, `user`), nazwę modelu i opcjonalne parametry.
   - Zwraca tablicę ustrukturyzowanych komunikatów odpowiedzi.
2. `setDefaultSystemMessage(message: string): void`
   - Ustawia globalny komunikat systemowy dla kolejnych wywołań.
3. `defaultModel: string`
   - Publiczne pole przechowujące bieżący model.
4. `defaultParams: ModelParams`
   - Publiczne pole przechowujące domyślne parametry.

## 4. Prywatne metody i pola
1. `_httpClient: AxiosInstance`
   - Skonfigurowany klient HTTP z interceptorami.
2. `_buildRequestPayload(messages, model, params, responseFormat): RequestPayload`
   - Tworzy obiekt żądania zgodny z dokumentacją OpenRouter.
3. `_validateAndMap(response): ChatMessage[]`
   - Weryfikuje odpowiedź za pomocą Zod i mapuje na wewnętrzne typy.
4. `_handleError(error): never`
   - Rozpoznaje typ błędu i rzuca dedykowanymi wyjątkami.

## 5. Obsługa błędów
1. `ConfigurationError` – brak `apiKey` albo nieprawidłowa konfiguracja.
2. `AuthenticationError` (401) – nieprawidłowy klucz API.
3. `RateLimitError` (429) – przekroczony limit, zawiera nagłówek `Retry-After`.
4. `ServerError` (5xx) – błąd po stronie OpenRouter.
5. `NetworkError` – timeout albo brak połączenia.
6. `SchemaValidationError` – niezgodność odpowiedzi z JSON Schema.

Dla każdego błędu:
- Uaktualnij logi z kodem błędu i timestampem.
- Dla 429 wprowadź mechanizm retry z opóźnieniem `Retry-After`.
- Dla 5xx retry do 2 razy, potem wyrzuć wyjątek.

## 6. Kwestie bezpieczeństwa
- Przechowywać `apiKey` w zmiennych środowiskowych (`.env`), nigdy w repo.
- Ograniczyć długość i rozmiar komunikatów wejściowych (np. max 5000 zn.).
- Wprowadzić rate limiting po stronie klienta i serwera.
- Nie logować pełnych treści komunikatów użytkownika – redagować wrażliwe dane.
- Wymuszać HTTPS dla wszystkich wywołań.

## 7. Plan wdrożenia krok po kroku
1. **Zależności**: zainstaluj `axios`, `zod`, `axios-retry`.
   ```bash
   yarn add axios zod axios-retry
   ```
2. **Typy i modele** (`src/types.ts`):
   - `ChatMessage`, `ModelParams`, `GenerateChatParams`, `ChatResponseSchema`, `OpenRouterConfig`.
3. **Implementacja serwisu** (`src/lib/services/openrouter.service.ts`):
   - Zaimplementuj konstruktor i prywatne pola (_httpClient, config).
   - Dodaj metodę `_buildRequestPayload` z obsługą:
     1. role: 'system'
     2. role: 'user'
     3. `response_format: { type: 'json_schema', json_schema: { name: 'ChatResponseSchema', strict: true, schema: { messages: [{ role: 'assistant', content: 'string' }] } } }`
     4. `model`: domyślny lub przekazany
     5. `parameters`: np. `{ temperature: 0.7, max_tokens: 150 }`
   - Zaimplementuj `generateChatCompletion`, wywołanie `_httpClient.post('/chat/completions', payload)`.
   - Dodaj `_validateAndMap` z Zod:
     ```ts
     const ChatResponseSchema = z.object({
       messages: z.array(
         z.object({ role: z.literal('assistant'), content: z.string() })
       )
     });
     ```
   - Dodaj `_handleError` i retry logic z `axios-retry`.
4. **Testy jednostkowe** (`__tests__/openrouter.service.spec.ts`):
   - Mock Axios, przetestuj sukces, 401, 429, 5xx, invalid JSON.
5. **Integracja w endpoint** (`src/pages/api/chat/generate.ts`):
   - Załaduj `OpenRouterService` z `context.locals` lub ręcznie.
   - Parsuj body requestu (Zod), autoryzacja JWT.
   - Wywołaj `generateChatCompletion` i zwróć 200 z treścią.
6. **Konfiguracja środowiska**:
   - Dodaj `OPENROUTER_API_KEY` i `OPENROUTER_BASE_URL` do `.env` i w CI/CD.
7. **Dokumentacja**:
   - Zaktualizuj Swagger/OpenAPI z nowym endpointem i schematami.
8. **Weryfikacja i wydanie**:
   - Przeprowadź E2E testy, testy obciążeniowe.
   - Opublikuj wersję, monitoruj logi i limity.

---

### Przykłady parametrów wywołania
1. Komunikat systemowy:
   ```json
   { "role": "system", "content": "You are a helpful assistant specialized in providing concise explanations." }
   ```
2. Komunikat użytkownika:
   ```json
   { "role": "user", "content": "Explain quantum entanglement in simple terms." }
   ```
3. `response_format`:
   ```json
   {
     "type": "json_schema",
     "json_schema": {
       "name": "ChatResponseSchema",
       "strict": true,
       "schema": {
         "type": "object",
         "properties": {
           "messages": {
             "type": "array",
             "items": { "type": "object", "properties": { "role": { "const": "assistant" }, "content": { "type": "string" } }, "required": ["role","content"] }
           }
         },
         "required": ["messages"]
       }
     }
   }
   ```
4. Nazwa modelu:
   ```ts
   const model = 'gpt-4o-mini';
   ```
5. Parametry modelu:
   ```ts
   const params = { temperature: 0.7, max_tokens: 150 };
   ``` 