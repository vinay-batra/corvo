-- Add account_type to portfolios so AI advice can be tax-context aware.
-- Eight supported values: taxable_brokerage (default), roth_ira, traditional_ira,
-- roth_401k, traditional_401k, hsa, 529, custodial.

alter table portfolios
  add column if not exists account_type text not null default 'taxable_brokerage';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'portfolios_account_type_check'
  ) then
    alter table portfolios
      add constraint portfolios_account_type_check
      check (account_type in (
        'taxable_brokerage','roth_ira','traditional_ira',
        'roth_401k','traditional_401k','hsa','529','custodial'
      ));
  end if;
end$$;

-- Drop PostgREST's stale column cache so the new column is visible immediately.
notify pgrst, 'reload schema';
