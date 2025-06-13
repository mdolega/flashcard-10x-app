-- Migration: Create ai_generations_logs table
-- Description: Creates the table for storing AI generation logs with cost tracking
-- Author: AI Assistant
-- Date: 2024-03-19

-- Create api_status enum type
create type api_status as enum ('success', 'error');

-- Create ai_generations_logs table
create table if not exists public.ai_generations_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id),
    prompt varchar(2000) not null,
    response jsonb not null,
    model varchar(100) not null,
    cost numeric not null,
    tokens integer not null,
    status api_status not null default 'success',
    status_code integer not null default 200,
    error_message text,
    created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.ai_generations_logs enable row level security;

-- Create index on user_id for faster lookups
create index ai_generations_logs_user_id_idx on public.ai_generations_logs(user_id);

-- Create policies for authenticated users
create policy "Users can view their own AI generation logs"
    on public.ai_generations_logs
    for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can insert their own AI generation logs"
    on public.ai_generations_logs
    for insert
    to authenticated
    with check (auth.uid() = user_id);

-- Create policies for anon users (no access)
create policy "Anon users have no access to AI logs"
    on public.ai_generations_logs
    for all
    to anon
    using (false);

-- Comments
comment on table public.ai_generations_logs is 'Logs of AI generations with cost tracking';
comment on column public.ai_generations_logs.prompt is 'User prompt sent to AI model';
comment on column public.ai_generations_logs.response is 'JSON response from AI model';
comment on column public.ai_generations_logs.model is 'Name/version of AI model used';
comment on column public.ai_generations_logs.cost is 'Cost of generation in USD';
comment on column public.ai_generations_logs.tokens is 'Number of tokens used in generation';
comment on column public.ai_generations_logs.status is 'Status of API call (success/error)';
comment on column public.ai_generations_logs.error_message is 'Error message if status is error'; 