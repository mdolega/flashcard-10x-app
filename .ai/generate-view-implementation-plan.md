# Plan implementacji widoku Generowania fiszek (Generate View)

## 1. Przegląd
Widok umożliwia użytkownikowi wklejenie tekstu źródłowego (500–10000 znaków) oraz wybór liczby fiszek (1–20), a następnie wywołanie API generującego fiszki przez AI. Wynikiem jest lista wygenerowanych fiszek z pytaniem, odpowiedzią i poziomem trudności.

## 2. Routing widoku
Ścieżka: `/generate`
Struktura plików:
- `src/pages/generate.astro` lub `src/pages/generate/index.astro` (strona)
- `src/components/GenerateForm.tsx` (formularz)
- `src/components/FlashcardList.tsx`, `FlashcardItem.tsx` (prezentacja wyników)

## 3. Struktura komponentów
```
GeneratePage
├─ GenerateForm
├─ FlashcardList
│  └─ FlashcardItem
├─ SkeletonLoader
├─ RetryButton
└─ ToastError
```

## 4. Szczegóły komponentów

### GenerateForm
- Opis: formularz z textarea i polem liczbowym do zbierania parametrów
- Główne elementy:
  - Textarea (500–10000 znaków) z licznikiem znaków (aria-describedby)
  - Pole liczby (`<Input type="number" min={1} max={20} />`)
  - Przycisk Submit (`disabled` gdy nieważne)
- Obsługiwane zdarzenia:
  - `onChange` textarea i input
  - `onSubmit` formularza
- Warunki walidacji:
  - `text.length >= 500 && text.length <= 10000`
  - `count >= 1 && count <= 20`
- Typy:
  - GenerateFormData = `{ text: string; count: number }`
- Propsy:
  - `onGenerate(data: GenerateFormData): void`

### FlashcardList
- Opis: lista wygenerowanych fiszek z zarządzaniem stanem edycji
- Zarządzanie stanem:
  - `editableFlashcards`: tablica EditableFlashcardDto z dodatkowymi polami (isEdited, status)
  - `editingIndex`: indeks aktualnie edytowanej fiszki (null gdy brak edycji)
  - Ograniczenie: tylko jedna fiszka może być edytowana jednocześnie
- Główne elementy: `<div>`, mapowanie po `editableFlashcards`
- Obsługiwane zdarzenia:
  - `handleStartEdit(index)`: rozpoczęcie edycji fiszki
  - `handleEdit(index, field, value)`: aktualizacja pól podczas edycji
  - `handleSave(index)`: zapisanie zmian i oznaczenie jako "ai-edited"
  - `handleCancel(index)`: anulowanie edycji z przywróceniem oryginalnych danych
- Warunki walidacji: delegowane do FlashcardItem
- Typy:
  - EditableFlashcardDto = GenerateFlashcardDto + `{ id?: string; status?: FlashcardStatus; isEdited?: boolean }`
- Propsy:
  - `flashcards: GenerateFlashcardDto[]`

### FlashcardItem
- Opis: karta pojedynczej fiszki z możliwością edycji
- Tryby wyświetlania: view mode (domyślny) i edit mode
- Główne elementy:
  - View mode: `<div>` z pytaniem i odpowiedzią (Markdown), etykieta trudności, przycisk "Edytuj"
  - Edit mode: `<Textarea>` dla question/answer, `<Select>` dla difficulty, przyciski "Zapisz"/"Anuluj"
  - Visual indicators: niebieska ramka w trybie edycji, ikona "edited" dla zmodyfikowanych fiszek
- Obsługiwane zdarzenia:
  - `onStartEdit()`: przełączenie w tryb edycji
  - `onEdit(index, field, value)`: aktualizacja pól podczas edycji
  - `onSave(index)`: zapisanie zmian i zmiana statusu na "ai-edited"
  - `onCancel(index)`: anulowanie edycji z przywróceniem oryginalnych wartości
- Walidacja:
  - Pola question i answer nie mogą być puste
  - Przycisk "Zapisz" jest disabled gdy walidacja niepoprawna
- Accessibility:
  - ARIA labels dla form controls
  - Tooltips z opisami akcji
  - Keyboard navigation (Tab, Enter, Escape)
- Propsy:
  - `card: EditableFlashcardDto`
  - `index: number`
  - `isEditing: boolean`
  - `onStartEdit: () => void`
  - `onEdit: (index: number, field: keyof GenerateFlashcardDto, value: string) => void`
  - `onSave: (index: number) => void`
  - `onCancel: (index: number) => void`

### SkeletonLoader
- Opis: placeholder w trakcie ładowania
- Główne elementy: szkieletowe bloki
- Propsy: brak

### RetryButton
- Opis: przycisk ponowienia wywołania API po błędzie
- Propsy: `onRetry: () => void`

### ToastError
- Opis: powiadomienie o błędzie
- Propsy: `message: string`, `onClose: () => void`

## 5. Typy
```ts
// DTO żądania
interface FlashcardGenerateCommand {
  text: string; // 500–10000
  count: number; // 1–20
}

// DTO odpowiedzi
interface FlashcardGenerateResponseDto {
  flashcards: GenerateFlashcardDto[];
  generation_id: string;
}

interface GenerateFlashcardDto {
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// Editable flashcard with additional UI state
interface EditableFlashcardDto extends GenerateFlashcardDto {
  id?: string; // Optional ID for tracking
  status?: FlashcardStatus; // Status after editing ('ai-generated' | 'ai-edited')
  isEdited?: boolean; // Flag if flashcard was edited by user
}

// Edit callbacks for FlashcardItem
interface FlashcardEditCallbacks {
  onEdit: (index: number, field: keyof GenerateFlashcardDto, value: string) => void;
  onSave: (index: number) => void;
  onCancel: (index: number) => void;
}

// Typy formularza
interface GenerateFormData {
  text: string;
  count: number;
}
```

## 6. Zarządzanie stanem
- Custom hook `useGenerateFlashcards`:
  - `generate(data: GenerateFormData)`: wywołuje API
  - `data`: FlashcardGenerateResponseDto | null
  - `loading`: boolean
  - `error`: Error | null
  - `retry()`: ponowny wywołanie ostatniego zapytania
- Formularz lokalny w `GenerateForm` trzyma `text` i `count`

## 7. Integracja API
- Punkt końcowy: `POST /api/flashcards/generate`
- Nagłówki: `Content-Type: application/json`, `Authorization: Bearer <token>`
- Ciało żądania: `FlashcardGenerateCommand`
- Odpowiedź: `FlashcardGenerateResponseDto`
- Błędy:
  - 400: walidacja → wyświetlić wiadomości przy polach
  - 401: przekierować do logowania
  - 503: toast z tekstem "Wystąpił błąd podczas generowania fiszek. Spróbuj ponownie."

## 8. Interakcje użytkownika
1. **Generowanie fiszek:**
   - Wpisuje lub wkleja tekst → licznik znaków aktualizuje się
   - Ustawia liczbę fiszek → sprawdzana walidacja
   - Kliknięcie "Generuj":
     - walidacja → jeśli niepoprawne, podświetlenie błędnych pól
     - wywołanie API → loading → SkeletonLoader
   - Sukces: wyświetlenie listy fiszek (`FlashcardList`)
   - Błąd: wyświetlenie `ToastError` i `RetryButton`

2. **Edycja fiszek:**
   - Kliknięcie przycisku "Edytuj" → przełączenie w tryb edycji
   - Edycja pól question/answer w `<Textarea>` → live update stanu
   - Zmiana difficulty w `<Select>` → update stanu
   - Kliknięcie "Zapisz":
     - walidacja → jeśli question/answer puste, przycisk disabled
     - zapisanie lokalnie → zmiana statusu na "ai-edited" → powrót do trybu wyświetlania
   - Kliknięcie "Anuluj" → przywrócenie oryginalnych wartości → powrót do trybu wyświetlania
   - Ograniczenie: tylko jedna fiszka może być edytowana jednocześnie

3. **Visual feedback:**
   - Tryb edycji: niebieska ramka i tło
   - Edytowane fiszki: ikona "edited" i badge "Edytowane"
   - Tooltips z opisami akcji
   - Smooth transitions między trybami

## 9. Warunki i walidacja
- W `GenerateForm`:
  - textarea: długość [500,10000]
  - count: [1,20]
  - przy błędzie walidacji: komunikaty pod polami
- Przed wywołaniem API: walidacja lokalna

## 10. Obsługa błędów
- 400: przypisać błędy do pól formularza
- 401: przekierowanie do `/login`
- 503 lub inne: pokazać `ToastError`, aktywować `RetryButton`

## 11. Kroki implementacji
1. Stworzyć plik `src/pages/generate.astro` i layout strony
2. Utworzyć komponent `GenerateForm.tsx` z polami i walidacją
3. Utworzyć hook `useGenerateFlashcards` do obsługi API
4. Dodać komponenty `SkeletonLoader`, `ToastError`, `RetryButton`
5. Utworzyć `FlashcardList.tsx` i `FlashcardItem.tsx` z renderowaniem Markdown
6. Dodać integrację z Shadcn/ui oraz Tailwind CSS
7. Przetestować scenariusze poprawne i błędne
8. Zadbać o dostępność (aria-*) i responsywność 