-- Minimal Postgres schema to get the app bootstrapped.
-- Adjust types and constraints as needed.

create table if not exists alumni (
  id bigserial primary key,
  email text unique not null,
  password text not null,
  name text not null,
  phone text,
  degree text,
  graduation_year integer,
  department text,
  batch text,
  address text,
  city text,
  state text,
  country text,
  linkedin text,
  github text,
  website text,
  company text,
  designation text,
  years_experience integer,
  document_path text,
  document_original_name text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists events (
  id bigserial primary key,
  title text not null,
  description text,
  event_date date,
  event_time time,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists students (
  id bigserial primary key,
  email text unique not null,
  password text not null,
  name text not null,
  phone text,
  department text not null,
  linkedin text,
  status text not null default 'active' check (status in ('active','inactive','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists mentorship (
  id bigserial primary key,
  mentor_id bigint not null references alumni(id) on delete cascade,
  mentee_id bigint not null,
  subject_area text,
  description text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists mentorship_programs (
  id bigserial primary key,
  mentor_user_id bigint not null references alumni(id) on delete cascade,
  subject text not null,
  description text,
  whatsapp_link text not null,
  batch_size integer not null check (batch_size > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists mentorship_enrollments (
  id bigserial primary key,
  program_id bigint not null references mentorship_programs(id) on delete cascade,
  mentee_user_id bigint not null,
  created_at timestamptz not null default now(),
  unique(program_id, mentee_user_id)
);

create table if not exists jobs (
  id bigserial primary key,
  recruiter_id bigint references alumni(id) on delete set null,
  title text not null,
  company text not null,
  description text not null,
  location text,
  job_type text check (job_type in ('full-time','part-time','internship','contract')),
  salary_range text,
  requirements text,
  status text not null default 'active' check (status in ('active','closed','draft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists donations (
  id bigserial primary key,
  donor_id bigint references alumni(id) on delete set null,
  amount decimal(10,2) not null,
  payment_method text,
  payment_id text,
  status text not null default 'pending' check (status in ('pending','completed','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add other tables similarly based on usage if needed.


