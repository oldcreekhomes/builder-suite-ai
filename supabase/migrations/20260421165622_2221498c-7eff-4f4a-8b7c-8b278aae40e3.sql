
-- ============================================================
-- 1. CLEAN UP DUPLICATE project_bid_packages BEFORE ADDING UNIQUE INDEX
-- ============================================================
-- For each duplicate (project_id, cost_code_id) group, pick a canonical
-- "keeper" row: most POs, then most bids, then earliest created_at, then
-- smallest id. Then re-point related rows to the keeper and delete duplicates.

WITH dups AS (
  SELECT project_id, cost_code_id
  FROM public.project_bid_packages
  GROUP BY project_id, cost_code_id
  HAVING COUNT(*) > 1
),
ranked AS (
  SELECT
    pbp.id,
    pbp.project_id,
    pbp.cost_code_id,
    pbp.created_at,
    (SELECT COUNT(*) FROM public.project_purchase_orders po WHERE po.bid_package_id = pbp.id) AS po_count,
    (SELECT COUNT(*) FROM public.project_bids pb WHERE pb.bid_package_id = pbp.id) AS bid_count,
    ROW_NUMBER() OVER (
      PARTITION BY pbp.project_id, pbp.cost_code_id
      ORDER BY
        (SELECT COUNT(*) FROM public.project_purchase_orders po WHERE po.bid_package_id = pbp.id) DESC,
        (SELECT COUNT(*) FROM public.project_bids pb WHERE pb.bid_package_id = pbp.id) DESC,
        pbp.created_at ASC,
        pbp.id ASC
    ) AS rn
  FROM public.project_bid_packages pbp
  JOIN dups d ON d.project_id = pbp.project_id AND d.cost_code_id = pbp.cost_code_id
),
keepers AS (
  SELECT project_id, cost_code_id, id AS keeper_id
  FROM ranked
  WHERE rn = 1
),
losers AS (
  SELECT r.id AS loser_id, k.keeper_id
  FROM ranked r
  JOIN keepers k
    ON k.project_id = r.project_id
   AND k.cost_code_id = r.cost_code_id
  WHERE r.rn > 1
)
-- Re-point project_bids from loser packages to the keeper. Use NOT EXISTS
-- to avoid violating any unique constraint on (bid_package_id, company_id).
UPDATE public.project_bids pb
SET bid_package_id = l.keeper_id
FROM losers l
WHERE pb.bid_package_id = l.loser_id
  AND NOT EXISTS (
    SELECT 1 FROM public.project_bids pb2
    WHERE pb2.bid_package_id = l.keeper_id
      AND pb2.company_id IS NOT DISTINCT FROM pb.company_id
  );

-- Delete any remaining bids on losers that conflict with bids already on the keeper
DELETE FROM public.project_bids pb
USING (
  WITH dups AS (
    SELECT project_id, cost_code_id
    FROM public.project_bid_packages
    GROUP BY project_id, cost_code_id
    HAVING COUNT(*) > 1
  ),
  ranked AS (
    SELECT
      pbp.id,
      pbp.project_id,
      pbp.cost_code_id,
      ROW_NUMBER() OVER (
        PARTITION BY pbp.project_id, pbp.cost_code_id
        ORDER BY
          (SELECT COUNT(*) FROM public.project_purchase_orders po WHERE po.bid_package_id = pbp.id) DESC,
          (SELECT COUNT(*) FROM public.project_bids pb WHERE pb.bid_package_id = pbp.id) DESC,
          pbp.created_at ASC,
          pbp.id ASC
      ) AS rn
    FROM public.project_bid_packages pbp
    JOIN dups d ON d.project_id = pbp.project_id AND d.cost_code_id = pbp.cost_code_id
  )
  SELECT id AS loser_id FROM ranked WHERE rn > 1
) l
WHERE pb.bid_package_id = l.loser_id;

-- Re-point project_purchase_orders from loser packages to the keeper
WITH dups AS (
  SELECT project_id, cost_code_id
  FROM public.project_bid_packages
  GROUP BY project_id, cost_code_id
  HAVING COUNT(*) > 1
),
ranked AS (
  SELECT
    pbp.id,
    pbp.project_id,
    pbp.cost_code_id,
    ROW_NUMBER() OVER (
      PARTITION BY pbp.project_id, pbp.cost_code_id
      ORDER BY
        (SELECT COUNT(*) FROM public.project_purchase_orders po WHERE po.bid_package_id = pbp.id) DESC,
        (SELECT COUNT(*) FROM public.project_bids pb WHERE pb.bid_package_id = pbp.id) DESC,
        pbp.created_at ASC,
        pbp.id ASC
    ) AS rn
  FROM public.project_bid_packages pbp
  JOIN dups d ON d.project_id = pbp.project_id AND d.cost_code_id = pbp.cost_code_id
),
keepers AS (SELECT project_id, cost_code_id, id AS keeper_id FROM ranked WHERE rn = 1),
losers AS (
  SELECT r.id AS loser_id, k.keeper_id FROM ranked r
  JOIN keepers k ON k.project_id = r.project_id AND k.cost_code_id = r.cost_code_id
  WHERE r.rn > 1
)
UPDATE public.project_purchase_orders po
SET bid_package_id = l.keeper_id
FROM losers l
WHERE po.bid_package_id = l.loser_id;

-- Finally, delete the loser bid packages
WITH dups AS (
  SELECT project_id, cost_code_id
  FROM public.project_bid_packages
  GROUP BY project_id, cost_code_id
  HAVING COUNT(*) > 1
),
ranked AS (
  SELECT
    pbp.id,
    pbp.project_id,
    pbp.cost_code_id,
    ROW_NUMBER() OVER (
      PARTITION BY pbp.project_id, pbp.cost_code_id
      ORDER BY
        (SELECT COUNT(*) FROM public.project_purchase_orders po WHERE po.bid_package_id = pbp.id) DESC,
        (SELECT COUNT(*) FROM public.project_bids pb WHERE pb.bid_package_id = pbp.id) DESC,
        pbp.created_at ASC,
        pbp.id ASC
    ) AS rn
  FROM public.project_bid_packages pbp
  JOIN dups d ON d.project_id = pbp.project_id AND d.cost_code_id = pbp.cost_code_id
)
DELETE FROM public.project_bid_packages pbp
USING ranked r
WHERE pbp.id = r.id AND r.rn > 1;

-- ============================================================
-- 2. UNIQUE INDEX TO PREVENT FUTURE DUPLICATE BID PACKAGES
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS project_bid_packages_project_costcode_unique
  ON public.project_bid_packages (project_id, cost_code_id);

-- ============================================================
-- 3. TIGHTEN RLS: company_cost_codes
-- ============================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.company_cost_codes;

CREATE POLICY "Tenant can access their company_cost_codes"
ON public.company_cost_codes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_cost_codes.company_id
      AND (
        c.home_builder_id = auth.uid()
        OR c.home_builder_id = public.get_current_user_home_builder_id()
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_cost_codes.company_id
      AND (
        c.home_builder_id = auth.uid()
        OR c.home_builder_id = public.get_current_user_home_builder_id()
      )
  )
  AND EXISTS (
    SELECT 1 FROM public.cost_codes cc
    WHERE cc.id = company_cost_codes.cost_code_id
      AND (
        cc.owner_id = auth.uid()
        OR cc.owner_id = public.get_current_user_home_builder_id()
      )
  )
);

-- ============================================================
-- 4. TIGHTEN RLS: cost_code_specifications
-- ============================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.cost_code_specifications;

CREATE POLICY "Tenant can access their cost_code_specifications"
ON public.cost_code_specifications
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cost_codes cc
    WHERE cc.id = cost_code_specifications.cost_code_id
      AND (
        cc.owner_id = auth.uid()
        OR cc.owner_id = public.get_current_user_home_builder_id()
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cost_codes cc
    WHERE cc.id = cost_code_specifications.cost_code_id
      AND (
        cc.owner_id = auth.uid()
        OR cc.owner_id = public.get_current_user_home_builder_id()
      )
  )
);

-- ============================================================
-- 5. TIGHTEN RLS: project_bids
-- ============================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.project_bids;

CREATE POLICY "Tenant can access their project_bids"
ON public.project_bids
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_bid_packages pbp
    JOIN public.projects p ON p.id = pbp.project_id
    WHERE pbp.id = project_bids.bid_package_id
      AND (
        p.owner_id = auth.uid()
        OR p.owner_id = public.get_current_user_home_builder_id()
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_bid_packages pbp
    JOIN public.projects p ON p.id = pbp.project_id
    WHERE pbp.id = project_bids.bid_package_id
      AND (
        p.owner_id = auth.uid()
        OR p.owner_id = public.get_current_user_home_builder_id()
      )
  )
);

-- ============================================================
-- 6. REMOVE PLATFORM-ADMIN CROSS-TENANT VISIBILITY ON cost_codes
-- ============================================================
-- This was leaking other builders' copied template cost codes into the
-- operational app for any user with the platform_admin role. Platform-level
-- analytics should use explicit security-definer admin RPCs instead.
DROP POLICY IF EXISTS "Platform admins can view all cost_codes" ON public.cost_codes;
