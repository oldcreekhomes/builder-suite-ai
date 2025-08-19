
-- 1) Core accounting types
create type public.account_type as enum ('asset','liability','equity','revenue','expense');
create type public.bill_status as enum ('draft','posted','void');
create type public.bill_line_type as enum ('job_cost','expense');

-- 2) Chart of Accounts
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  code text not null,
  name text not null,
  type public.account_type not null,
  description text,
  parent_id uuid references public.accounts(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, code)
);

alter table public.accounts enable row level security;

create policy "Accounts visible to owner and confirmed employees"
  on public.accounts
  for select
  using (
    owner_id = auth.uid()
    or owner_id in (
      select u.home_builder_id
      from public.users u
      where u.id = auth.uid() and u.confirmed = true and u.role = 'employee'
    )
  );

create policy "Accounts insert limited to owner and confirmed employees"
  on public.accounts
  for insert
  with check (
    owner_id = auth.uid()
    or owner_id in (
      select u.home_builder_id
      from public.users u
      where u.id = auth.uid() and u.confirmed = true and u.role = 'employee'
    )
  );

create policy "Accounts update limited to owner and confirmed employees"
  on public.accounts
  for update
  using (
    owner_id = auth.uid()
    or owner_id in (
      select u.home_builder_id
      from public.users u
      where u.id = auth.uid() and u.confirmed = true and u.role = 'employee'
    )
  );

create policy "Accounts delete limited to owner and confirmed employees"
  on public.accounts
  for delete
  using (
    owner_id = auth.uid()
    or owner_id in (
      select u.home_builder_id
      from public.users u
      where u.id = auth.uid() and u.confirmed = true and u.role = 'employee'
    )
  );

-- updated_at trigger for accounts
create or replace function public.update_accounts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_update_accounts_updated_at
before update on public.accounts
for each row
execute function public.update_accounts_updated_at();

create index idx_accounts_owner_id on public.accounts(owner_id);
create index idx_accounts_code_owner on public.accounts(owner_id, code);

-- 3) Accounting Settings (AP/WIP mappings)
create table public.accounting_settings (
  owner_id uuid primary key,
  ap_account_id uuid references public.accounts(id) on delete set null,
  wip_account_id uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accounting_settings enable row level security;

create policy "Settings visible to owner and confirmed employees"
  on public.accounting_settings
  for select
  using (
    owner_id = auth.uid()
    or owner_id in (
      select u.home_builder_id
      from public.users u
      where u.id = auth.uid() and u.confirmed = true and u.role = 'employee'
    )
  );

create policy "Settings updatable/insertable by owner and confirmed employees"
  on public.accounting_settings
  for all
  using (
    owner_id = auth.uid()
    or owner_id in (
      select u.home_builder_id
      from public.users u
      where u.id = auth.uid() and u.confirmed = true and u.role = 'employee'
    )
  )
  with check (
    owner_id = auth.uid()
    or owner_id in (
      select u.home_builder_id
      from public.users u
      where u.id = auth.uid() and u.confirmed = true and u.role = 'employee'
    )
  );

create or replace function public.update_accounting_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_update_accounting_settings_updated_at
before update on public.accounting_settings
for each row
execute function public.update_accounting_settings_updated_at();

-- 4) Bills
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  vendor_id uuid not null references public.companies(id),
  project_id uuid null references public.projects(id),
  bill_date date not null default (now()::date),
  due_date date,
  terms text,
  reference_number text,
  notes text,
  status public.bill_status not null default 'draft',
  total_amount numeric(12,2) not null default 0,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bills enable row level security;

create policy "Bills visible to owner and confirmed employees"
  on public.bills
  for select
  using (
    owner_id = auth.uid()
    or owner_id in (
      select u.home_builder_id
      from public.users u
      where u.id = auth.uid() and u.confirmed = true and u.role = 'employee'
    )
  );

create policy "Bills insert limited to owner and confirmed employees"
  on public.bills
  for insert
  with check (
    owner_id = auth.uid()
    or owner_id in (
      select u.home_builder_id
      from public.users u
      where u.id = auth.uid() and u.confirmed = true and u.role = 'employee'
    )
  );

create policy "Bills update limited to owner and confirmed employees"
  on public.bills
  for update
  using (
    owner_id = auth.uid()
    or owner_id in (
      select u.home_builder_id
      from public.users u
      where u.id = auth.uid() and u.confirmed = true and u.role = 'employee'
    )
  );

create policy "Bills delete limited to owner and confirmed employees"
  on public.bills
  for delete
  using (
    owner_id = auth.uid()
    or owner_id in (
      select u.home_builder_id
      from public.users u
      where u.id = auth.uid() and u.confirmed = true and u.role = 'employee'
    )
  );

-- Validation: vendor must belong to same owner
create or replace function public.validate_bill_vendor_owner()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from public.companies where id = new.vendor_id;
  if v_owner is null or v_owner <> new.owner_id then
    raise exception 'Vendor does not belong to this owner/company';
  end if;
  return new;
end;
$$;

create trigger trg_validate_bill_vendor_owner
before insert or update on public.bills
for each row
execute function public.validate_bill_vendor_owner();

-- updated_at trigger for bills
create or replace function public.update_bills_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_update_bills_updated_at
before update on public.bills
for each row
execute function public.update_bills_updated_at();

create index idx_bills_owner_id on public.bills(owner_id);
create index idx_bills_vendor_id on public.bills(vendor_id);

-- 5) Bill Lines
create table public.bill_lines (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  owner_id uuid not null,
  line_number integer not null default 1,
  line_type public.bill_line_type not null,
  account_id uuid null references public.accounts(id), -- required for expense lines (WIP will be picked from settings for job cost)
  project_id uuid null references public.projects(id),
  cost_code_id uuid null references public.cost_codes(id),
  quantity numeric(12,4) not null default 1,
  unit_cost numeric(12,4) not null default 0,
  amount numeric(12,2) not null default 0,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (quantity >= 0),
  check (amount >= 0)
);

alter table public.bill_lines enable row level security;

create policy "Bill lines visible to owner and confirmed employees"
  on public.bill_lines
  for select
  using (
    owner_id = auth.uid()
    or owner_id in (
      select u.home_builder_id
      from public.users u
      where u.id = auth.uid() and u.confirmed = true and u.role = 'employee'
    )
  );

create policy "Bill lines insert limited to owner and confirmed employees"
  on public.bill_lines
  for insert
  with check (
    owner_id = auth.uid()
    or owner_id in (
      select u.home_builder_id
      from public.users u
      where u.id = auth.uid() and u.confirmed = true and u.role = 'employee'
    )
  );

create policy "Bill lines update limited to owner and confirmed employees"
  on public.bill_lines
  for update
  using (
    owner_id = auth.uid()
    or owner_id in (
      select u.home_builder_id
      from public.users u
      where u.id = auth.uid() and u.confirmed = true and u.role = 'employee'
    )
  );

create policy "Bill lines delete limited to owner and confirmed employees"
  on public.bill_lines
  for delete
  using (
    owner_id = auth.uid()
    or owner_id in (
      select u.home_builder_id
      from public.users u
      where u.id = auth.uid() and u.confirmed = true and u.role = 'employee'
    )
  );

-- Keep bill_lines.owner_id in sync with bills.owner_id and compute amount when needed
create or replace function public.sync_bill_line_owner_and_amount()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  b_owner uuid;
begin
  select owner_id into b_owner from public.bills where id = new.bill_id;
  if b_owner is null then
    raise exception 'Invalid bill_id';
  end if;
  new.owner_id := b_owner;

  -- If amount is zero but quantity/unit_cost present, compute amount
  if (new.amount is null or new.amount = 0) then
    new.amount := round(coalesce(new.quantity,0) * coalesce(new.unit_cost,0), 2);
  end if;

  return new;
end;
$$;

create trigger trg_sync_bill_line_owner_and_amount
before insert or update on public.bill_lines
for each row
execute function public.sync_bill_line_owner_and_amount();

-- updated_at trigger for bill_lines
create or replace function public.update_bill_lines_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_update_bill_lines_updated_at
before update on public.bill_lines
for each row
execute function public.update_bill_lines_updated_at();

create index idx_bill_lines_bill_id on public.bill_lines(bill_id);
create index idx_bill_lines_owner_id on public.bill_lines(owner_id);
create index idx_bill_lines_line_type on public.bill_lines(line_type);

-- 6) Journal Entries
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  source_type text not null, -- e.g. 'bill'
  source_id uuid not null,   -- references the id of source record (bills.id)
  entry_date date not null default (now()::date),
  description text,
  posted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, source_id)
);

alter table public.journal_entries enable row level security;

create policy "Journal entries visible to owner and confirmed employees"
  on public.journal_entries
  for select
  using (
    owner_id = auth.uid()
    or owner_id in (
      select u.home_builder_id
      from public.users u
      where u.id = auth.uid() and u.confirmed = true and u.role = 'employee'
    )
  );

create policy "Journal entries CUD limited to owner and confirmed employees"
  on public.journal_entries
  for all
  using (
    owner_id = auth.uid()
    or owner_id in (
      select u.home_builder_id
      from public.users u
      where u.id = auth.uid() and u.confirmed = true and u.role = 'employee'
    )
  )
  with check (
    owner_id = auth.uid()
    or owner_id in (
      select u.home_builder_id
      from public.users u
      where u.id = auth.uid() and u.confirmed = true and u.role = 'employee'
    )
  );

create or replace function public.update_journal_entries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_update_journal_entries_updated_at
before update on public.journal_entries
for each row
execute function public.update_journal_entries_updated_at();

create index idx_journal_entries_owner_id on public.journal_entries(owner_id);
create index idx_journal_entries_source on public.journal_entries(source_type, source_id);

-- 7) Journal Entry Lines
create table public.journal_entry_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  owner_id uuid not null,
  line_number integer not null default 1,
  account_id uuid not null references public.accounts(id),
  debit numeric(12,2) not null default 0,
  credit numeric(12,2) not null default 0,
  project_id uuid null references public.projects(id),
  cost_code_id uuid null references public.cost_codes(id),
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((debit = 0 and credit > 0) or (credit = 0 and debit > 0))
);

alter table public.journal_entry_lines enable row level security;

create policy "Journal entry lines visible to owner and confirmed employees"
  on public.journal_entry_lines
  for select
  using (
    owner_id = auth.uid()
    or owner_id in (
      select u.home_builder_id
      from public.users u
      where u.id = auth.uid() and u.confirmed = true and u.role = 'employee'
    )
  );

create policy "Journal entry lines CUD limited to owner and confirmed employees"
  on public.journal_entry_lines
  for all
  using (
    owner_id = auth.uid()
    or owner_id in (
      select u.home_builder_id
      from public.users u
      where u.id = auth.uid() and u.confirmed = true and u.role = 'employee'
    )
  )
  with check (
    owner_id = auth.uid()
    or owner_id in (
      select u.home_builder_id
      from public.users u
      where u.id = auth.uid() and u.confirmed = true and u.role = 'employee'
    )
  );

-- Keep owner_id in sync with parent JE
create or replace function public.sync_journal_line_owner()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  je_owner uuid;
begin
  select owner_id into je_owner from public.journal_entries where id = new.journal_entry_id;
  if je_owner is null then
    raise exception 'Invalid journal_entry_id';
  end if;
  new.owner_id := je_owner;
  return new;
end;
$$;

create trigger trg_sync_journal_line_owner
before insert or update on public.journal_entry_lines
for each row
execute function public.sync_journal_line_owner();

-- updated_at trigger for journal_entry_lines
create or replace function public.update_journal_entry_lines_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_update_journal_entry_lines_updated_at
before update on public.journal_entry_lines
for each row
execute function public.update_journal_entry_lines_updated_at();

create index idx_journal_entry_lines_owner_id on public.journal_entry_lines(owner_id);
create index idx_journal_entry_lines_account on public.journal_entry_lines(account_id);

-- 8) Optional data validations to ensure referenced records belong to the same owner
create or replace function public.validate_bill_line_ownership()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  b_owner uuid;
  a_owner uuid;
  p_owner uuid;
  c_owner uuid;
begin
  select owner_id into b_owner from public.bills where id = new.bill_id;
  if b_owner is null then
    raise exception 'Bill not found';
  end if;

  if new.account_id is not null then
    select owner_id into a_owner from public.accounts where id = new.account_id;
    if a_owner is null or a_owner <> b_owner then
      raise exception 'Account does not belong to this owner/company';
    end if;
  end if;

  if new.project_id is not null then
    select owner_id into p_owner from public.projects where id = new.project_id;
    if p_owner is null or p_owner <> b_owner then
      raise exception 'Project does not belong to this owner/company';
    end if;
  end if;

  if new.cost_code_id is not null then
    select owner_id into c_owner from public.cost_codes where id = new.cost_code_id;
    if c_owner is null or c_owner <> b_owner then
      raise exception 'Cost code does not belong to this owner/company';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_validate_bill_line_ownership
before insert or update on public.bill_lines
for each row
execute function public.validate_bill_line_ownership();
