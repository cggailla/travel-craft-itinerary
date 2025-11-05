-- Create tables for chunked PDF generation jobs and sections
create table if not exists public.pdf_jobs (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null,
  status text not null default 'pending',
  mode text default 'chunked',
  total_sections integer not null default 0,
  completed_sections integer not null default 0,
  data_path text,
  final_pdf_url text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pdf_job_sections (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.pdf_jobs(id) on delete cascade,
  section_index integer not null,
  section_key text not null,
  step_index integer,
  status text not null default 'pending',
  attempts integer not null default 0,
  partial_path text,
  partial_url text,
  size_bytes bigint,
  pages integer,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pdf_job_sections_job on public.pdf_job_sections(job_id);
create index if not exists idx_pdf_job_sections_status on public.pdf_job_sections(status);

-- Simple trigger to keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_pdf_jobs_updated_at'
  ) then
    create trigger trg_pdf_jobs_updated_at
    before update on public.pdf_jobs
    for each row execute function public.set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_pdf_job_sections_updated_at'
  ) then
    create trigger trg_pdf_job_sections_updated_at
    before update on public.pdf_job_sections
    for each row execute function public.set_updated_at();
  end if;
end $$;

