-- Fix recordings not saving/playing by correcting RLS and storage access for MVP (no auth)

-- 1) RECORDINGS: Remove circular policy and open access temporarily
DROP POLICY IF EXISTS "Public access via shared links" ON public.recordings;
DROP POLICY IF EXISTS "Users can view their own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Users can insert their own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Users can update their own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Users can delete their own recordings" ON public.recordings;

ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view recordings"
ON public.recordings
FOR SELECT
USING (true);

CREATE POLICY "Public can insert recordings"
ON public.recordings
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can update recordings"
ON public.recordings
FOR UPDATE
USING (true);

CREATE POLICY "Public can delete recordings"
ON public.recordings
FOR DELETE
USING (true);

-- 2) STORAGE: Make bucket public and allow read/write so uploads + playback work
UPDATE storage.buckets SET public = true WHERE id = 'recordings';

DROP POLICY IF EXISTS "Public read recordings" ON storage.objects;
DROP POLICY IF EXISTS "Public upload recordings" ON storage.objects;
DROP POLICY IF EXISTS "Public update recordings" ON storage.objects;
DROP POLICY IF EXISTS "Public delete recordings" ON storage.objects;

CREATE POLICY "Public read recordings"
ON storage.objects
FOR SELECT
USING (bucket_id = 'recordings');

CREATE POLICY "Public upload recordings"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'recordings');

CREATE POLICY "Public update recordings"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'recordings');

CREATE POLICY "Public delete recordings"
ON storage.objects
FOR DELETE
USING (bucket_id = 'recordings');
