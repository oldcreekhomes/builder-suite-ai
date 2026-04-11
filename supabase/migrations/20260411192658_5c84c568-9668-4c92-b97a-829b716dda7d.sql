
-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  billing_interval TEXT CHECK (billing_interval IN ('monthly', 'annual')),
  user_count INTEGER NOT NULL DEFAULT 1,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(owner_id),
  UNIQUE(stripe_customer_id),
  UNIQUE(stripe_subscription_id)
);

-- Create subscription_events audit log
CREATE TABLE public.subscription_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(stripe_event_id)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- Subscriptions: owners can read their own
CREATE POLICY "Owners can view their subscription"
ON public.subscriptions FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Subscriptions: employees can read their company's subscription
CREATE POLICY "Employees can view company subscription"
ON public.subscriptions FOR SELECT
TO authenticated
USING (
  owner_id IN (
    SELECT home_builder_id FROM public.users 
    WHERE id = auth.uid() AND role = 'employee' AND confirmed = true
  )
);

-- Subscription events: viewable by subscription owner or their employees
CREATE POLICY "Users can view their subscription events"
ON public.subscription_events FOR SELECT
TO authenticated
USING (
  subscription_id IN (
    SELECT s.id FROM public.subscriptions s
    WHERE s.owner_id = auth.uid()
       OR s.owner_id IN (
         SELECT home_builder_id FROM public.users 
         WHERE id = auth.uid() AND role = 'employee' AND confirmed = true
       )
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
