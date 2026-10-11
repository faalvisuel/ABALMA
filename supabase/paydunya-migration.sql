-- Run once in Supabase SQL Editor before deploying the PayDunya Edge Function.
alter table public.bookings add column if not exists paydunya_token text;
alter table public.bookings add column if not exists paydunya_checkout_url text;

-- Payment confirmation now comes only from the verified PayDunya callback/status check.
revoke execute on function public.pay_booking(uuid, text) from public, anon, authenticated;
