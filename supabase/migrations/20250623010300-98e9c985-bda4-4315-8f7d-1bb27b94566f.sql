
-- Create cost_codes table to store company cost codes
CREATE TABLE public.cost_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  parent_group TEXT,
  quantity TEXT,
  price DECIMAL(10,2),
  unit_of_measure TEXT,
  has_specifications BOOLEAN DEFAULT false,
  has_bidding BOOLEAN DEFAULT false,
  owner_id UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on cost_codes table
ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies for cost_codes
CREATE POLICY "Users can view their own cost codes" ON public.cost_codes
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create their own cost codes" ON public.cost_codes
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own cost codes" ON public.cost_codes
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own cost codes" ON public.cost_codes
  FOR DELETE USING (owner_id = auth.uid());

-- Create unique constraint to prevent duplicate codes per user
CREATE UNIQUE INDEX cost_codes_code_owner_unique ON public.cost_codes(code, owner_id);
