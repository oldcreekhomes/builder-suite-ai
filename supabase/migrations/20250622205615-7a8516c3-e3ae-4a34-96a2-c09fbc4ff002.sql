
-- Create a table for employee invitations
CREATE TABLE public.employee_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  role TEXT NOT NULL DEFAULT 'employee',
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  home_builder_id UUID REFERENCES public.profiles(id),
  UNIQUE(email, home_builder_id)
);

-- Enable RLS
ALTER TABLE public.employee_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for employee invitations
CREATE POLICY "Home builders can manage their employee invitations" 
  ON public.employee_invitations 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND user_type = 'home_builder'
      AND (invited_by = auth.uid() OR home_builder_id = auth.uid())
    )
  );

-- Add phone_number column to profiles table
ALTER TABLE public.profiles ADD COLUMN phone_number TEXT;

-- Add role column to profiles table (different from user_type)
ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'employee';

-- Create function to send employee invitation email
CREATE OR REPLACE FUNCTION public.invite_employee(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone_number TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'employee'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_id UUID;
  home_builder_id UUID;
BEGIN
  -- Get the home builder ID
  SELECT id INTO home_builder_id
  FROM public.profiles
  WHERE id = auth.uid() AND user_type = 'home_builder';
  
  IF home_builder_id IS NULL THEN
    RAISE EXCEPTION 'Only home builders can invite employees';
  END IF;
  
  -- Insert invitation
  INSERT INTO public.employee_invitations (
    email, first_name, last_name, phone_number, role, invited_by, home_builder_id
  ) VALUES (
    p_email, p_first_name, p_last_name, p_phone_number, p_role, auth.uid(), home_builder_id
  ) RETURNING id INTO invitation_id;
  
  RETURN invitation_id;
END;
$$;
