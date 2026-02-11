
-- Part 1: Fix Bill Line Amounts (5 bills with overages)

-- Bill 323f445c (11893, overage $0.04): reduce line 4fdbf92c from $53.13 to $53.09
UPDATE public.bill_lines SET amount = 53.09 WHERE id = '4fdbf92c-bc81-4908-bf2b-55a648c6de42';

-- Bill f8b175a8 (11893, overage $0.04): reduce line e201433b from $53.13 to $53.09
UPDATE public.bill_lines SET amount = 53.09 WHERE id = 'e201433b-94fa-4695-a981-253d9475d6df';

-- Bill 9c24fbaf (12428-413 E Nelson, overage $0.02): reduce line 992d3535 from $53.13 to $53.11
UPDATE public.bill_lines SET amount = 53.11 WHERE id = '992d3535-fe6b-427f-b4fc-779d4feea426';

-- Bill dd67e9d4 (INV-2026-00000996, overage $0.01): reduce line c79b1d78 from $0.98 to $0.97
UPDATE public.bill_lines SET amount = 0.97 WHERE id = 'c79b1d78-15b6-496d-b75b-010c5dcbf63a';

-- Bill 0f1e4c4d (02022026-413, overage $0.01): reduce line a504ddf3 from $2.73 to $2.72
UPDATE public.bill_lines SET amount = 2.72 WHERE id = 'a504ddf3-77c7-429d-98b4-f1eff7469b32';

-- Part 2: Fix Journal Entry Line Amounts (2 imbalanced JEs)

-- JE f5de9e9d (Bill f8b175a8/11893, diff $0.04): reduce debit from $53.13 to $53.09
UPDATE public.journal_entry_lines SET debit = 53.09 WHERE id = '4ca0d35b-db56-4301-b1b9-d53d689e3289';

-- JE 0ca0e8bc (Bill 0f1e4c4d/02022026-413, diff $0.01): reduce debit from $2.73 to $2.72
UPDATE public.journal_entry_lines SET debit = 2.72 WHERE id = '389a319b-f8fa-4a74-aeec-e471ba8a4d2a';
