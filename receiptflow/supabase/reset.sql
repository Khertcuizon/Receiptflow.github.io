-- ============================================================================
-- DANGER: deletes ALL ReceiptFlow tables and data (including account_profiles,
-- so every user must register again). Run this ONLY when you are starting over
-- on an existing project, and only after you have backed up what you need.
--
-- Run it before supabase/schema.sql. It does not empty the receipt image
-- bucket, because Supabase blocks direct SQL deletes on storage.objects.
-- Empty the "receipts" bucket from Storage in the dashboard first if needed.
-- ============================================================================

drop table if exists public.notifications   cascade;
drop table if exists public.expenses        cascade;
drop table if exists public.receipts        cascade;
drop table if exists public.budgets         cascade;
drop table if exists public.categories      cascade;
drop table if exists public.user_settings   cascade;
drop table if exists public.account_profiles cascade;

drop function if exists public.save_receipt_with_expense(text, jsonb, text, jsonb);
drop function if exists public.save_receipt_with_expense(text, text, date, numeric, text, text, text, text, text);
drop function if exists public.set_updated_at();
