# Schemat bazy danych

## 1. Tabele

### flashcards

| Kolumna           | Typ              | Ograniczenia                                                                 |
|-------------------|------------------|-------------------------------------------------------------------------------|
| id                | uuid             | primary key, default gen_random_uuid()                                        |
| user_id           | uuid             | not null, references auth.users(id)                                           |
| ai_generation_id           | uuid             | nullable, references ai_generations_logs(id)                                           |
| question          | varchar(200)     | not null                                                                      |
| answer            | varchar(500)     | not null                                                                      |
| status            | varchar          | not null, check (status in ('manual','ai-generated','ai-edited'))            |
| difficulty        | varchar          | not null, check (difficulty in ('easy','medium','hard'))                      |                                                                 |                                                                   |
| created_at        | timestamptz      | not null, default now()                                                       |
| updated_at        | timestamptz      | not null, default now()                                                       |
| deleted_at        | timestamptz      |                                                                               |

### ai_generations_logs

| Kolumna    | Typ            | Ograniczenia                            |
|------------|---------------|-----------------------------------------|
| id         | uuid          | primary key, default gen_random_uuid()  |
| user_id    | uuid          | not null, references auth.users(id)     |
| prompt     | varchar(2000) | not null                                |
| response   | jsonb         | not null                                |
| model      | varchar(100)  | not null                                |
| cost       | numeric       | not null                                |
| tokens     | integer       | not null                                |
| status     | api_status    | not null, default 'success'             |
| status_code| integer       | not null, default 200                   |
| error_message| text        | nullable                                |
| created_at | timestamptz    | not null, default now()                 |

## 2. Relacje

- Flashcard referuje do generowanych fiszek (flashcard.ai_genearion.id  → ai_generations_logs.id)

## 3. Indeksy

- B-tree index na kolumnie flashcards(user_id).
- B-tree index na kolumnie ai_logs(user_id).

## 4. Zasady RLS

Uytkownik moze odpytywać tylko rekordy dla własnego user_id

## Uwagi do projektu

- Soft delete realizowany przez `deleted_at`.
- Użycie `gen_random_uuid()` z rozszerzenia `pgcrypto` w tabelach `flashcards` oraz `ai_logs`.
- Supabase auth zapewnia uwierzytelnianie, wykorzystujemy `auth.uid()` w politykach RLS.
- Dane SRS przechowywane bezpośrednio w tabeli `flashcards` dla wydajności.
- Indeksy na kolumnie `user_id` zapewniają szybki dostęp do danych użytkownika.
- Tabela “users” będzie obsługiwana przez Supabase Auth. Nie twórz dedykowanej tabeli dla uzytkownikow.
