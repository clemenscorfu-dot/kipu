insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'idea-images',
  'idea-images',
  true,
  8000000,
  array['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload own idea images" on storage.objects;
create policy "Users can upload own idea images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'idea-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own idea images" on storage.objects;
create policy "Users can update own idea images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'idea-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'idea-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own idea images" on storage.objects;
create policy "Users can delete own idea images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'idea-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
