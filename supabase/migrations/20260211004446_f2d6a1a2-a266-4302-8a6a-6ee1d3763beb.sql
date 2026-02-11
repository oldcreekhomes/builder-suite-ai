
-- Split unallocated bill lines and journal entry lines 50/50 for 412 E Nelson
-- Project: 67e55b12-ade9-435b-89e0-7cbc05357245
-- Lot 1: d8b627a1-5643-4da9-86da-72d149e2e3d3
-- Lot 2: d634d368-ceaa-4f50-b301-7e015b33d0a6

DO $$
DECLARE
  v_project_id UUID := '67e55b12-ade9-435b-89e0-7cbc05357245';
  v_lot1_id UUID := 'd8b627a1-5643-4da9-86da-72d149e2e3d3';
  v_lot2_id UUID := 'd634d368-ceaa-4f50-b301-7e015b33d0a6';
  v_line RECORD;
  v_lot1_amount NUMERIC;
  v_lot2_amount NUMERIC;
  v_lot1_unit_cost NUMERIC;
  v_lot2_unit_cost NUMERIC;
  v_lot1_debit NUMERIC;
  v_lot2_debit NUMERIC;
  v_lot1_credit NUMERIC;
  v_lot2_credit NUMERIC;
  v_next_line_number INT;
  v_bill_count INT := 0;
  v_je_count INT := 0;
BEGIN
  -- ========================================
  -- STEP 1: Split Bill Lines
  -- ========================================
  FOR v_line IN
    SELECT bl.id, bl.bill_id, bl.amount, bl.unit_cost, bl.quantity,
           bl.cost_code_id, bl.memo, bl.line_type, bl.owner_id, bl.line_number, bl.project_id
    FROM bill_lines bl
    JOIN bills b ON b.id = bl.bill_id
    WHERE bl.project_id = v_project_id
      AND bl.lot_id IS NULL
      AND bl.is_reversal = false
    ORDER BY bl.bill_id, bl.line_number
  LOOP
    v_lot1_amount := ROUND(v_line.amount / 2, 2);
    v_lot2_amount := v_line.amount - v_lot1_amount;
    v_lot1_unit_cost := ROUND(v_line.unit_cost / 2, 2);
    v_lot2_unit_cost := v_line.unit_cost - v_lot1_unit_cost;

    -- Update existing line -> Lot 1
    UPDATE bill_lines
    SET lot_id = v_lot1_id, amount = v_lot1_amount, unit_cost = v_lot1_unit_cost
    WHERE id = v_line.id;

    -- Get next line number for this bill
    SELECT COALESCE(MAX(line_number), 0) + 1 INTO v_next_line_number
    FROM bill_lines WHERE bill_id = v_line.bill_id;

    -- Insert new line -> Lot 2
    INSERT INTO bill_lines (bill_id, lot_id, amount, unit_cost, quantity, cost_code_id, memo, line_type, owner_id, line_number, project_id)
    VALUES (v_line.bill_id, v_lot2_id, v_lot2_amount, v_lot2_unit_cost, v_line.quantity, v_line.cost_code_id, v_line.memo, v_line.line_type, v_line.owner_id, v_next_line_number, v_line.project_id);

    v_bill_count := v_bill_count + 1;
  END LOOP;

  RAISE NOTICE 'Split % bill lines', v_bill_count;

  -- ========================================
  -- STEP 2: Split Journal Entry Lines (bill + bill_payment source types)
  -- ========================================
  FOR v_line IN
    SELECT jel.id, jel.journal_entry_id, jel.account_id, jel.cost_code_id,
           jel.debit, jel.credit, jel.memo, jel.owner_id, jel.line_number, jel.project_id
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id
    WHERE jel.project_id = v_project_id
      AND jel.lot_id IS NULL
      AND je.reversed_by_id IS NULL
    ORDER BY jel.journal_entry_id, jel.line_number
  LOOP
    v_lot1_debit := ROUND(v_line.debit / 2, 2);
    v_lot2_debit := v_line.debit - v_lot1_debit;
    v_lot1_credit := ROUND(v_line.credit / 2, 2);
    v_lot2_credit := v_line.credit - v_lot1_credit;

    -- Update existing line -> Lot 1
    UPDATE journal_entry_lines
    SET lot_id = v_lot1_id, debit = v_lot1_debit, credit = v_lot1_credit
    WHERE id = v_line.id;

    -- Get next line number for this journal entry
    SELECT COALESCE(MAX(line_number), 0) + 1 INTO v_next_line_number
    FROM journal_entry_lines WHERE journal_entry_id = v_line.journal_entry_id;

    -- Insert new line -> Lot 2
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, cost_code_id, lot_id, debit, credit, memo, owner_id, line_number, project_id)
    VALUES (v_line.journal_entry_id, v_line.account_id, v_line.cost_code_id, v_lot2_id, v_lot2_debit, v_lot2_credit, v_line.memo, v_line.owner_id, v_next_line_number, v_line.project_id);

    v_je_count := v_je_count + 1;
  END LOOP;

  RAISE NOTICE 'Split % journal entry lines', v_je_count;
END $$;
