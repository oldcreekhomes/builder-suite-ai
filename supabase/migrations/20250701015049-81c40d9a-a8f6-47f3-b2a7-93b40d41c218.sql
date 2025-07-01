
-- Add status column to project_bidding table to track bid status
ALTER TABLE public.project_bidding 
ADD COLUMN status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'closed'));

-- Create junction table to track companies for each bidding item
CREATE TABLE public.project_bidding_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_bidding_id UUID NOT NULL REFERENCES public.project_bidding(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bid_status TEXT NOT NULL DEFAULT 'will_bid' CHECK (bid_status IN ('will_bid', 'will_not_bid')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_bidding_id, company_id)
);

-- Enable RLS on the new table
ALTER TABLE public.project_bidding_companies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project_bidding_companies
CREATE POLICY "Users can view their project bidding companies" 
  ON public.project_bidding_companies 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.project_bidding pb
    JOIN public.projects p ON pb.project_id = p.id
    WHERE pb.id = project_bidding_companies.project_bidding_id 
    AND p.owner_id = auth.uid()
  ));

CREATE POLICY "Users can create their project bidding companies" 
  ON public.project_bidding_companies 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.project_bidding pb
    JOIN public.projects p ON pb.project_id = p.id
    WHERE pb.id = project_bidding_companies.project_bidding_id 
    AND p.owner_id = auth.uid()
  ));

CREATE POLICY "Users can update their project bidding companies" 
  ON public.project_bidding_companies 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.project_bidding pb
    JOIN public.projects p ON pb.project_id = p.id
    WHERE pb.id = project_bidding_companies.project_bidding_id 
    AND p.owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete their project bidding companies" 
  ON public.project_bidding_companies 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.project_bidding pb
    JOIN public.projects p ON pb.project_id = p.id
    WHERE pb.id = project_bidding_companies.project_bidding_id 
    AND p.owner_id = auth.uid()
  ));
