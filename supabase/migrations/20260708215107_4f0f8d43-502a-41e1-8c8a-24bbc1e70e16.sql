
CREATE TABLE public.project_notification_recipients (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  receive_bid boolean NOT NULL DEFAULT false,
  receive_po boolean NOT NULL DEFAULT false,
  receive_schedule boolean NOT NULL DEFAULT false,
  receive_bid_submitted boolean NOT NULL DEFAULT false,
  receive_accounting boolean NOT NULL DEFAULT false,
  is_primary_bid boolean NOT NULL DEFAULT false,
  is_primary_po boolean NOT NULL DEFAULT false,
  is_primary_schedule boolean NOT NULL DEFAULT false,
  is_primary_bid_submitted boolean NOT NULL DEFAULT false,
  is_primary_accounting boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id),
  CONSTRAINT pnr_primary_bid_requires_receive CHECK (NOT is_primary_bid OR receive_bid),
  CONSTRAINT pnr_primary_po_requires_receive CHECK (NOT is_primary_po OR receive_po),
  CONSTRAINT pnr_primary_schedule_requires_receive CHECK (NOT is_primary_schedule OR receive_schedule),
  CONSTRAINT pnr_primary_bid_submitted_requires_receive CHECK (NOT is_primary_bid_submitted OR receive_bid_submitted),
  CONSTRAINT pnr_primary_accounting_requires_receive CHECK (NOT is_primary_accounting OR receive_accounting)
);

CREATE UNIQUE INDEX pnr_one_primary_bid ON public.project_notification_recipients(project_id) WHERE is_primary_bid;
CREATE UNIQUE INDEX pnr_one_primary_po ON public.project_notification_recipients(project_id) WHERE is_primary_po;
CREATE UNIQUE INDEX pnr_one_primary_schedule ON public.project_notification_recipients(project_id) WHERE is_primary_schedule;
CREATE UNIQUE INDEX pnr_one_primary_bid_submitted ON public.project_notification_recipients(project_id) WHERE is_primary_bid_submitted;
CREATE UNIQUE INDEX pnr_one_primary_accounting ON public.project_notification_recipients(project_id) WHERE is_primary_accounting;
CREATE INDEX pnr_user_idx ON public.project_notification_recipients(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_notification_recipients TO authenticated;
GRANT ALL ON public.project_notification_recipients TO service_role;

ALTER TABLE public.project_notification_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access recipients for their company projects"
  ON public.project_notification_recipients
  FOR ALL
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      WHERE p.owner_id = auth.uid()
         OR p.owner_id IN (
           SELECT u.home_builder_id FROM public.users u
           WHERE u.id = auth.uid() AND u.confirmed = true
         )
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      WHERE p.owner_id = auth.uid()
         OR p.owner_id IN (
           SELECT u.home_builder_id FROM public.users u
           WHERE u.id = auth.uid() AND u.confirmed = true
         )
    )
  );

CREATE OR REPLACE FUNCTION public.update_pnr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_pnr_updated_at
BEFORE UPDATE ON public.project_notification_recipients
FOR EACH ROW EXECUTE FUNCTION public.update_pnr_updated_at();

-- Backfill Construction Manager as primary for bid/po/schedule/bid_submitted
INSERT INTO public.project_notification_recipients (
  project_id, user_id,
  receive_bid, receive_po, receive_schedule, receive_bid_submitted,
  is_primary_bid, is_primary_po, is_primary_schedule, is_primary_bid_submitted
)
SELECT p.id, p.construction_manager,
  true, true, true, true,
  true, true, true, true
FROM public.projects p
WHERE p.construction_manager IS NOT NULL
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Backfill Accounting Manager (separate row if different user)
INSERT INTO public.project_notification_recipients (
  project_id, user_id, receive_accounting, is_primary_accounting
)
SELECT p.id, p.accounting_manager, true, true
FROM public.projects p
WHERE p.accounting_manager IS NOT NULL
  AND p.accounting_manager IS DISTINCT FROM p.construction_manager
ON CONFLICT (project_id, user_id) DO NOTHING;

-- If accounting_manager == construction_manager, flip the accounting flags on existing row
UPDATE public.project_notification_recipients r
SET receive_accounting = true, is_primary_accounting = true
FROM public.projects p
WHERE r.project_id = p.id
  AND r.user_id = p.accounting_manager
  AND p.accounting_manager = p.construction_manager;
