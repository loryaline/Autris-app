-- Fix: set search_path on all functions to resolve Security Advisor warnings

alter function public.handle_new_user() set search_path = public;
alter function public.update_novel_word_count() set search_path = public;
alter function public.update_updated_at() set search_path = public;
