-- Create marketplace_messages table to track all messages sent to suppliers
CREATE TABLE public.marketplace_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_company_id UUID NOT NULL REFERENCES public.marketplace_companies(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_email TEXT,
  sender_phone TEXT,
  message TEXT NOT NULL,
  response_method TEXT NOT NULL CHECK (response_method IN ('email', 'phone')),
  recipient_email TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add message_count column to marketplace_companies for quick display
ALTER TABLE public.marketplace_companies 
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.marketplace_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public messaging feature)
CREATE POLICY "Anyone can send messages" 
ON public.marketplace_messages FOR INSERT 
WITH CHECK (true);

-- Authenticated users can read messages (for analytics)
CREATE POLICY "Authenticated users can read messages" 
ON public.marketplace_messages FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create index for faster lookups
CREATE INDEX idx_marketplace_messages_company_id ON public.marketplace_messages(marketplace_company_id);
CREATE INDEX idx_marketplace_messages_sent_at ON public.marketplace_messages(sent_at DESC);