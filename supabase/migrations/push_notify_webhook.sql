-- Migration: push_notify_webhook
-- Crea un Database Webhook en Supabase que llama a la Edge Function
-- "notify-event" cuando un evento pasa a status='published'.
--
-- INSTRUCCIONES:
-- 1. Despliega la Edge Function primero:
--      supabase functions deploy notify-event
-- 2. Ejecuta este SQL en el Supabase SQL Editor de tu proyecto.
--    Reemplaza <PROJECT_REF> con el ref de tu proyecto Supabase (ej: xyzabcdef).
--    Reemplaza <ANON_KEY> con tu anon key publica.

-- Habilitar la extension pg_net si no esta activa (necesaria para HTTP desde PG)
create extension if not exists pg_net;

-- Funcion que dispara la notificacion al publicar un evento
create or replace function public.trigger_notify_event()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Solo actuar cuando status cambia a 'published'
  if (NEW.status = 'published' and (OLD.status is null or OLD.status <> 'published')) then
    perform net.http_post(
      url := 'https://<PROJECT_REF>.supabase.co/functions/v1/notify-event',
      body := json_build_object(
        'type', 'UPDATE',
        'table', 'events',
        'record', row_to_json(NEW),
        'old_record', row_to_json(OLD)
      )::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <ANON_KEY>'
      )
    );
  end if;
  return NEW;
end;
$$;

-- Trigger en la tabla events
drop trigger if exists on_event_published on public.events;
create trigger on_event_published
  after insert or update of status
  on public.events
  for each row
  execute function public.trigger_notify_event();

-- Politica adicional en push_subscriptions para que la Edge Function
-- (que usa service_role) pueda leer todas las suscripciones
-- La Edge Function ya usa service_role, que bypassa RLS automaticamente.
-- No se necesita politica adicional.
