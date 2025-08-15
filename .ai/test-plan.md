# Plan Testów - Fiszki AI

## 1. Wprowadzenie

### Przegląd projektu
Fiszki AI to webowa aplikacja do generowania, tworzenia i zarządzania fiszkami edukacyjnymi przy wsparciu sztucznej inteligencji. Aplikacja umożliwia użytkownikom przekształcanie tekstu w fiszki przy użyciu AI, manualne tworzenie fiszek, oraz uczenie się zgodnie z algorytmem powtórek rozłożonych w czasie (SRS).

### Zakres testowania
Plan testów obejmuje wszystkie kluczowe funkcjonalności aplikacji:
- Autentykacja użytkowników
- Generowanie fiszek przez AI
- CRUD operacje na fiszkach
- System powtórek rozłożonych w czasie
- Integracje z zewnętrznymi usługami

## 2. Typy testowania

### 2.1 Testy jednostkowe (Unit Testing)

**Cele:**
- Weryfikacja poprawności pojedynczych funkcji i komponentów
- Zapewnienie wysokiej jakości kodu na poziomie modułów
- Szybka identyfikacja regresji podczas rozwoju

**Scenariusze testowe:**
- Walidacja schematów Zod dla wszystkich endpointów API
- Logika biznesowa w serwisach (FlashcardService, OpenRouterService)
- Transformacja danych w komponentach React
- Funkcje pomocnicze w bibliotece utils

**Przypadki testowe:**
1. **Walidacja danych wejściowych**
   - Test poprawnych danych dla generowania fiszek (500-10000 znaków, 1-20 fiszek)
   - Test niepoprawnych danych (za krótki/długi tekst, nieprawidłowa liczba fiszek)
   - Walidacja formatu email i siły hasła przy rejestracji

2. **Logika serwisu FlashcardService**
   - Test tworzenia fiszki z poprawnymi danymi
   - Test listowania fiszek z filtrowaniem i paginacją
   - Test aktualizacji statusu fiszki (accepted/rejected)

3. **Integracja OpenRouter API**
   - Test formatowania prompt dla AI
   - Test parsowania odpowiedzi z AI
   - Test obsługi błędów API (rate limiting, authentication)

4. **Funkcje pomocnicze**
   - Test formatowania dat
   - Test funkcji paginacji
   - Test walidacji Markdown

5. **Komponenty React**
   - Test renderowania formularza generowania z poprawnymi wartościami domyślnymi
   - Test stanu loading podczas generowania fiszek
   - Test wyświetlania błędów walidacji

**Oczekiwane rezultaty:**
- 100% pokrycie kodu dla funkcji biznesowych
- Wszystkie testy jednostkowe przechodzą pomyślnie
- Czas wykonania testów < 30 sekund

**Narzędzia/frameworki:**
- **Vitest** - najszybszy framework testowy dla Vite-based projektów (Astro 5), natywne wsparcie dla TypeScript 5, ESM i hot reload
- **@testing-library/react** - standard branżowy do testowania komponentów React 19, fokus na user behavior
- **@testing-library/jest-dom** - custom matchers dla DOM assertions (toBeInTheDocument, toHaveClass)
- **@vitejs/plugin-react** - wsparcie dla React 19 w środowisku Vitest
- **happy-dom** lub **jsdom** - lekka implementacja DOM dla środowiska Node.js (happy-dom jest szybsza)
- **MSW (Mock Service Worker)** - mockowanie API calls na poziomie network layer, działa z fetch API
- **@faker-js/faker** - generowanie realistycznych danych testowych
- **@supabase/supabase-js** mocks - mockowanie klienta Supabase dla izolowanych testów
- **vitest-mock-extended** - zaawansowane mockowanie z pełnym type safety dla TypeScript
- **@testing-library/user-event** - symulacja interakcji użytkownika (kliknięcia, wpisywanie)
- **c8** lub **v8** - code coverage z natywnym wsparciem dla V8 engine
- **@astrojs/test-utils** - oficjalne utilities do testowania komponentów Astro
- **zod-mock** - automatyczne generowanie mock data na podstawie schematów Zod

**Konfiguracja środowiska testowego:**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { getViteConfig } from 'astro/config'

export default defineConfig(
  getViteConfig({
    plugins: [react()],
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['./src/test/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: ['node_modules/', 'src/test/']
      }
    }
  })
)
```

**Przykładowe implementacje testów:**
```typescript
// src/lib/services/__tests__/flashcard.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FlashcardService } from '../flashcard.service'
import { createMockSupabaseClient } from '../../test/mocks/supabase'

describe('FlashcardService', () => {
  let service: FlashcardService
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    service = new FlashcardService(mockSupabase)
  })

  it('should create flashcard with valid data', async () => {
    const flashcardData = {
      question: 'Test pytanie',
      answer: 'Test odpowiedź',
      difficulty: 'medium' as const
    }
    
    const result = await service.createFlashcard('user-id', flashcardData)
    expect(result).toMatchObject(flashcardData)
  })
})

// src/components/__tests__/AuthForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthForm } from '../auth/AuthForm'
import { server } from '../../test/mocks/server'

describe('AuthForm', () => {
  const user = userEvent.setup()

  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('should validate email format', async () => {
    render(<AuthForm mode="login" />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /zaloguj/i })
    
    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)
    
    expect(screen.getByText(/nieprawidłowy format email/i)).toBeInTheDocument()
  })

  it('should submit login form with valid data', async () => {
    const mockOnSuccess = vi.fn()
    render(<AuthForm mode="login" onSuccess={mockOnSuccess} />)
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/hasło/i), 'password123')
    await user.click(screen.getByRole('button', { name: /zaloguj/i }))
    
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })
})
```

### 2.2 Testy integracyjne (Integration Testing)

**Cele:**
- Weryfikacja współpracy między modułami aplikacji
- Testowanie integracji z Supabase i OpenRouter API
- Sprawdzenie przepływu danych między warstwami aplikacji

**Scenariusze testowe:**
- Pełny przepływ autentykacji (rejestracja → login → autoryzacja)
- End-to-end generowanie fiszek (input → AI → zapis do bazy)
- Operacje CRUD na fiszkach z właściwą autoryzacją
- Integracja z zewnętrznymi API (OpenRouter, Supabase)

**Przypadki testowe:**
1. **Przepływ autentykacji**
   - Rejestracja nowego użytkownika → automatyczne logowanie
   - Login istniejącego użytkownika → przekierowanie do dashboard
   - Próba dostępu do chronionych zasobów bez autoryzacji

2. **Generowanie fiszek przez AI**
   - Wysłanie tekstu do API → wywołanie OpenRouter → zapis fiszek do bazy
   - Obsługa błędów AI (timeout, invalid response) → wyświetlenie błędu użytkownikowi
   - Logowanie wszystkich interakcji z AI w tabeli ai_generations_logs

3. **Operacje na fiszkach**
   - Tworzenie fiszki → aktualizacja listy → sprawdzenie w bazie danych
   - Edycja fiszki → zmiana statusu na "ai-edited" → aktualizacja timestampu
   - Usuwanie fiszki → soft delete (ustawienie deleted_at)

4. **Autoryzacja i bezpieczeństwo**
   - RLS (Row Level Security) w Supabase - użytkownik widzi tylko swoje fiszki
   - Walidacja JWT token w middleware Astro
   - Blokowanie dostępu do API dla niezalogowanych użytkowników

5. **Obsługa błędów**
   - Timeout OpenRouter API → retry mechanizm → graceful fallback
   - Błąd bazy danych → rollback transakcji → error message
   - Nieprawidłowe dane JSON → 400 Bad Request z opisem błędu

**Oczekiwane rezultaty:**
- Wszystkie integracje działają zgodnie ze specyfikacją
- Błędy są obsługiwane gracefully bez crash aplikacji
- Dane są konsystentne między systemami

**Narzędzia/frameworki:**
- **Playwright** - end-to-end testing z pełną integracją
- **Testcontainers** - uruchomienie lokalnej instancji PostgreSQL
- **Supabase Local Development** - pełne środowisko testowe
- **Nock** - mockowanie HTTP requests do zewnętrznych API

### 2.3 Testy funkcjonalne (Functional Testing)

**Cele:**
- Weryfikacja zgodności z wymaganiami biznesowymi
- Testowanie kompletnych scenariuszy użytkownika
- Sprawdzenie wszystkich funkcjonalności end-to-end

**Scenariusze testowe:**
- Kompletny user journey od rejestracji do nauki z fiszkami
- Wszystkie funkcjonalności CRUD dla fiszek
- Różne ścieżki generowania fiszek przez AI
- System powtórek i harmonogramowanie nauki

**Przypadki testowe:**
1. **Zarządzanie kontem użytkownika**
   - Rejestracja z walidacją email i hasła
   - Logowanie i wylogowywanie
   - Zmiana hasła z weryfikacją obecnego hasła
   - Usunięcie konta (soft delete)

2. **Tworzenie i zarządzanie fiszkami**
   - Manualne tworzenie fiszki z formatowaniem Markdown
   - Edycja istniejącej fiszki ze zmianą statusu
   - Filtrowanie fiszek według statusu i poziomu trudności
   - Paginacja listy fiszek

3. **Generowanie fiszek przez AI**
   - Generowanie 1-20 fiszek z tekstu 500-10000 znaków
   - Akceptowanie/odrzucanie wygenerowanych fiszek
   - Edycja wygenerowanych fiszek przed zapisaniem
   - Wybór różnych poziomów trudności

4. **System powtórek rozłożonych w czasie**
   - Harmonogramowanie pierwszej powtórki
   - Aktualizacja harmonogramu na podstawie trudności odpowiedzi
   - Wyświetlanie fiszek do powtórki na dany dzień
   - Statystyki nauki i postępów

5. **Interfejs użytkownika**
   - Responsywność na różnych urządzeniach
   - Dostępność (aria-labels, keyboard navigation)
   - Ładowanie i stany błędów
   - Walidacja formularzy w czasie rzeczywistym

**Oczekiwane rezultaty:**
- Wszystkie wymagania biznesowe są spełnione
- Aplikacja jest intuicyjna i łatwa w użyciu
- Wszystkie przepływy użytkownika działają poprawnie

**Narzędzia/frameworki:**
- **Playwright** - automatyzacja testów funkcjonalnych
- **Cucumber** - BDD scenarios w języku naturalnym

Plan testów zapewnia wysoką jakość aplikacji Fiszki AI przy zachowaniu racjonalnego balansu między rzetelnością testowania a efektywnością czasową i kosztową. Implementacja tego planu pozwoli na pewne wdrożenie aplikacji do produkcji z minimalizacją ryzyka błędów i problemów użytkowników końcowych.
