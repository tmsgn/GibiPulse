-- 1. Add image_url to tables
ALTER TABLE reports ADD COLUMN image_url TEXT;
ALTER TABLE report_groups ADD COLUMN image_url TEXT;

-- 2. Create the images bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('report_images', 'report_images', true);

-- 3. Set up Storage Policies for the new bucket
-- Allow public viewing of images
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'report_images' );

-- Allow anonymous uploads 
CREATE POLICY "Anon Uploads" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'report_images' );
