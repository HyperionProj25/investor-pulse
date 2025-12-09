-- Create storage bucket for pitch deck files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pitch-deck-files',
  'pitch-deck-files',
  true,
  52428800, -- 50MB limit
  ARRAY[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Public read access for pitch deck files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pitch-deck-files');

CREATE POLICY "Authenticated users can upload pitch deck files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pitch-deck-files');

CREATE POLICY "Authenticated users can update their pitch deck files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'pitch-deck-files');

CREATE POLICY "Authenticated users can delete pitch deck files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'pitch-deck-files');
