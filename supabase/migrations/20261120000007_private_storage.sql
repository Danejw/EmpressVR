-- Public site-media was created by the content/media foundation migration.
-- Paid assets require private Storage and entitlement-checked signed delivery.
-- No anon/authenticated Storage object policies are added.
-- Backend service_role handles upload and signed URL issuance after authorization.
insert into storage.buckets (id,name,public,file_size_limit)
  values ('paid-downloads','paid-downloads',false,104857600)
  on conflict (id) do update set public = false;
