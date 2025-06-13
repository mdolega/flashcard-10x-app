-- Migration: Create flashcards table
-- Description: Creates the main flashcards table with AI generation references
-- Author: AI Assistant
-- Date: 2024-03-19

-- Create flashcards table
create table if not exists public.flashcards (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id),
    ai_generation_id uuid references public.ai_generations_logs(id),
    question varchar(200) not null,
    answer varchar(500) not null,
    status varchar not null check (status in ('manual','ai-generated','ai-edited')),
    difficulty varchar not null check (difficulty in ('easy','medium','hard')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz
);

-- Enable RLS
alter table public.flashcards enable row level security;

-- Create index on user_id for faster lookups
create index flashcards_user_id_idx on public.flashcards(user_id);

-- Create updated_at function if it doesn't exist
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create policies for authenticated users
create policy "Users can view their own flashcards"
    on public.flashcards
    for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can insert their own flashcards"
    on public.flashcards
    for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "Users can update their own flashcards"
    on public.flashcards
    for update
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can delete their own flashcards"
    on public.flashcards
    for delete
    to authenticated
    using (auth.uid() = user_id);

-- Create policies for anon users (no access)
create policy "Anon users have no access to flashcards"
    on public.flashcards
    for all
    to anon
    using (false);

-- Create updated_at trigger
create trigger handle_flashcards_updated_at
    before update on public.flashcards
    for each row
    execute function public.handle_updated_at();

-- Comments
comment on table public.flashcards is 'User flashcards with AI generation tracking';
comment on column public.flashcards.user_id is 'References the auth.users.id';
comment on column public.flashcards.ai_generation_id is 'References the AI generation if created/edited by AI';
comment on column public.flashcards.question is 'Flashcard question/front side';
comment on column public.flashcards.answer is 'Flashcard answer/back side';
comment on column public.flashcards.status is 'Creation method: manual, AI-generated, or AI-edited';
comment on column public.flashcards.difficulty is 'User-set difficulty level';
comment on column public.flashcards.deleted_at is 'Soft delete timestamp'; 