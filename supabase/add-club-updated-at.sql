-- Añade fecha de actualización a los clubs y la mantiene sola: sin trigger,
-- cualquier UPDATE (desde ClubForm, un script o el SQL editor) se olvida de
-- tocarla y la fecha mostrada en la ficha queda mintiendo desde el primer
-- edit que no la incluya a mano.
alter table clubs add column if not exists updated_at timestamptz not null default now();

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists clubs_set_updated_at on clubs;
create trigger clubs_set_updated_at
  before update on clubs
  for each row
  execute function set_updated_at();
