-- Add units table for categorizing recordings
CREATE TABLE public.units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- Create policies for units
CREATE POLICY "Users can view their own units" 
ON public.units 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own units" 
ON public.units 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own units" 
ON public.units 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own units" 
ON public.units 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add unit_id to recordings table
ALTER TABLE public.recordings 
ADD COLUMN unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_recordings_unit_id ON public.recordings(unit_id);
CREATE INDEX idx_units_user_id ON public.units(user_id);

-- Add trigger for units updated_at
CREATE TRIGGER update_units_updated_at
BEFORE UPDATE ON public.units
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();