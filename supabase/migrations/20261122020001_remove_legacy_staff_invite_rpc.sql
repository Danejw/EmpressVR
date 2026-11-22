-- Phase 2: once the new login flow is deployed, remove the now-unused RPC.
-- ASVS 4.1: avoid leaving obsolete public API entrypoints.
drop function public.claim_staff_invitation();
