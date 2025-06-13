# Dokument wymagań produktu (PRD) - Fiszki AI

## 1. Przegląd produktu
Fiszki AI to webowa aplikacja umożliwiająca generowanie, tworzenie i zarządzanie fiszkami edukacyjnymi przy wsparciu sztucznej inteligencji. Użytkownicy mogą szybko przekształcić dowolny tekst źródłowy w fiszki w formacie Markdown, edytować je manualnie, a następnie uczyć się zgodnie z harmonogramem opartym na algorytmie SRS.

## 2. Problem użytkownika
Manualne tworzenie wysokiej jakości fiszek edukacyjnych jest czasochłonne, co zniechęca do korzystania z efektywnej metody nauki jaką jest spaced repetition.

## 3. Wymagania funkcjonalne
- rejestracja i logowanie przy użyciu email i hasła, zarządzanie kontem (zmiana hasła, usunięcie konta)
- generowanie fiszek przez AI na podstawie wprowadzonego tekstu (500–10000 znaków) z możliwością wyboru liczby fiszek (1–20, wartość maksymalna konfigurowana w pliku .env)
- manualne tworzenie nowych fiszek w formacie Markdown (pole przód i tył)
- przeglądanie listy fiszek użytkownika, filtrowanie wg statusu i poziomu trudności
- edycja fiszek; po edycji status zmienia się na edited
- usuwanie fiszek
- integracja z open-source'owym algorytmem SRS (np. SM-2) w celu harmonogramowania powtórek
- wsparcie formatowania Markdown (lista, tabele, kod, kursywa itp.)
- opcjonalne oznaczanie poziomu trudności (łatwy/średni/trudny) generowane przez AI
- logowanie wszystkich interakcji z AI (promptów) w bazie danych

## 4. Granice produktu
- w MVP nie będzie własnego zaawansowanego algorytmu powtórek (tylko integracja z prostym SRS)
- brak importu plików (PDF, DOCX)
- brak współdzielenia zestawów pomiędzy użytkownikami
- brak integracji z innymi platformami edukacyjnymi
- brak aplikacji mobilnych
- brak funkcji undo lub masowego przywracania/usuwania fiszek
- brak resetowania hasła za pomocą email (w przyszłości)

## 5. Historyjki użytkowników
#### US-001
- Tytuł: Rejestracja nowego użytkownika
- Opis: Jako nowy użytkownik chcę się zarejestrować za pomocą email i hasła, aby uzyskać konto w aplikacji
- Kryteria akceptacji:
  - formularz rejestracji wymaga poprawnego formatu email i hasła o długości min. 8 znaków
  - po podaniu poprawnych danych konto zostaje utworzone, a użytkownik otrzymuje token JWT
  - próba rejestracji z już istniejącym emailem zwraca błąd 409 i komunikat "Email już w użyciu"
  - próba rejestracji z niepoprawnym emailem lub słabym hasłem zwraca błąd 400 i informację o przyczynie

#### US-002
- Tytuł: Logowanie użytkownika
- Opis: Jako zarejestrowany użytkownik chcę się zalogować za pomocą email i hasła, aby uzyskać dostęp do swoich fiszek
- Kryteria akceptacji:
  - poprawne dane uwierzytelniające zwracają token JWT
  - niepoprawne hasło lub email zwraca błąd 401 z komunikatem "Nieprawidłowe dane logowania"
  - po otrzymaniu tokena użytkownik może uzyskać dostęp do chronionych endpointów

#### US-003
- Tytuł: Zmiana hasła
- Opis: Jako zalogowany użytkownik chcę zmienić swoje hasło, aby utrzymać bezpieczeństwo konta
- Kryteria akceptacji:
  - endpoint wymaga podania aktualnego i nowego hasła
  - aktualne hasło musi być prawidłowe, a nowe min. 8 znaków
  - w przypadku niepoprawnego aktualnego hasła zwracany jest błąd 403
  - po udanej zmianie hasła zwracany jest status 200 i komunikat potwierdzający

#### US-004
- Tytuł: Usunięcie konta
- Opis: Jako zalogowany użytkownik chcę trwale usunąć swoje konto, aby pozbyć się wszystkich danych
- Kryteria akceptacji:
  - przed usunięciem konto wymaga potwierdzenia (np. ponowne wprowadzenie hasła)
  - po potwierdzeniu konto i wszystkie powiązane dane (fiszek, logi AI) zostają usunięte
  - kolejna próba logowania tymi samymi danymi zwraca błąd 401

#### US-005
- Tytuł: Generowanie fiszek przez AI
- Opis: Jako użytkownik chcę wkleić tekst (500–10000 znaków) i wybrać liczbę fiszek (1–20), aby automatycznie wygenerować fiszki w formacie Markdown
- Kryteria akceptacji:
  - system waliduje długość tekstu i liczbę fiszek zgodnie z konfiguracją .env
  - przy poprawnych danych zwracana jest lista fiszek z polami pytanie/odpowiedź i opcjonalnym poziomem trudności
  - w przypadku błędnego limitu tekstu lub liczby fiszek zwracany jest błąd 400 z komunikatem

#### US-006
- Tytuł: Obsługa błędów i retry przy wywołaniu AI
- Opis: Jako użytkownik chcę otrzymać czytelny komunikat o błędzie i możliwość ponowienia próby, gdy API AI zawiedzie
- Kryteria akceptacji:
  - w przypadku błędu po stronie AI (timeout, błąd 5xx) wyświetlany jest komunikat "Wystąpił błąd podczas generowania fiszek. Spróbuj ponownie."
  - użytkownik może wysłać ponownie to samo żądanie bez utraty wprowadzonych danych
  - liczba prób retry konfigurowana w pliku .env

#### US-007
- Tytuł: Przeglądanie listy fiszek
- Opis: Jako użytkownik chcę zobaczyć listę moich fiszek wraz ze statusem i poziomem trudności, aby wybrać, co edytować lub usuwać
- Kryteria akceptacji:
  - endpoint zwraca wszystkie fiszki zalogowanego użytkownika
  - zwracane dane zawierają pola id, pytanie, odpowiedź, status i poziom trudności
  - brak dostępu do fiszek innych użytkowników (autoryzacja)

#### US-008
- Tytuł: Edycja fiszki
- Opis: Jako użytkownik chcę edytować zawartość fiszki, aby poprawić pytanie lub odpowiedź
- Kryteria akceptacji:
  - formularz edycji wspiera Markdown
  - po zatwierdzeniu zmiany status fiszki zmienia się na "edited"
  - puste pola lub nieprawidłowy format zwraca błąd 400

#### US-009
- Tytuł: Usuwanie fiszki
- Opis: Jako użytkownik chcę usunąć niepotrzebną fiszkę, aby zarządzać swoimi materiałami
- Kryteria akceptacji:
  - usunięcie wymaga potwierdzenia
  - po usunięciu fiszka znika z listy użytkownika
  - brak możliwości przywrócenia usuniętych fiszek w MVP

#### US-010
- Tytuł: Akceptacja lub odrzucenie fiszek wygenerowanych przez AI
- Opis: Jako użytkownik chcę zaakceptować lub odrzucić każdą fiszkę wygenerowaną przez AI, aby pozostawić tylko trafne treści
- Kryteria akceptacji:
  - interfejs umożliwia oznaczenie fiszki jako zaakceptowana lub odrzucona
  - zaakceptowane fiszki trafiają do harmonogramu SRS
  - odrzucone fiszki są usuwane lub oznaczane jako odrzucone
  - zmiany statusu zwracają update 200

#### US-011
- Tytuł: Harmonogramowanie powtórek SRS
- Opis: Jako użytkownik chcę uczyć się fiszek zgodnie z harmonogramem opartym na algorytmie SRS (np. SM-2), aby zoptymalizować zapamiętywanie
- Kryteria akceptacji:
  - integracja z wybranym algorytmem SRS zwraca listę fiszek do powtórki
  - dane konfiguracyjne algorytmu (np. interwały) dokumentowane i parametryzowane
  - po ukończeniu powtórki system aktualizuje datę kolejnej powtórki według algorytmu

#### US-012
- Tytuł: Wyświetlanie poziomu trudności fiszek
- Opis: Jako użytkownik chcę widzieć poziom trudności każdej fiszki, aby ocenić swoje postępy i dobrać odpowiednie materiały
- Kryteria akceptacji:
  - poziom trudności (łatwy/średni/trudny) generowany przez AI jest zapisywany i zwracany w API
  - interfejs wyświetla poziom trudności przy każdej fiszce
  - filtrowanie lub sortowanie według poziomu trudności będzie dostępne w przyszłych iteracjach

#### US-013
- Tytuł: Logowanie interakcji z AI
- Opis: Jako produktowiec chcę mieć dostęp do logów promptów AI, aby analizować skuteczność generowania fiszek
- Kryteria akceptacji:
  - każde zapytanie do API AI jest zapisywane w bazie z timestampem, treścią promptu i user_id
  - istnieje endpoint do pobierania logów (z ograniczeniami dostępu)

## 6. Metryki sukcesu
- co najmniej 75% fiszek generowanych przez AI nie jest edytowanych przez użytkownika
- co najmniej 75% wszystkich fiszek jest tworzonych z użyciem AI
- pokrycie kodu testami jednostkowymi na poziomie co najmniej 50%