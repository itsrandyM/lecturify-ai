-- Create shared links table for secure recording sharing
CREATE TABLE public.shared_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recording_id UUID NOT NULL,
  link_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  access_count INTEGER DEFAULT 0,
  max_access_count INTEGER DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

-- Create policies for shared links
CREATE POLICY "Users can manage shared links for their recordings" 
ON public.shared_links 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.recordings 
    WHERE recordings.id = shared_links.recording_id 
    AND recordings.user_id = auth.uid()
  )
);

-- Create function to generate secure tokens
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS TEXT
LANGUAGE SQL
AS $$
  SELECT encode(gen_random_bytes(32), 'base64url');
$$;