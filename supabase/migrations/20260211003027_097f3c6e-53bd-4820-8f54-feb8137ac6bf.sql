
-- Part 1: Fix Bill Line Amounts (4 bills)

-- Bill 11893 (f8b175a8): reduce line e201433b by $0.04
UPDATE public.bill_lines SET amount = 53.09 WHERE id = 'e201433b-f041-4f55-972c-0e09e67b3146';

-- Bill 12428-413 E Nelson (9c24fbaf): reduce line 992d3535 by $0.02
UPDATE public.bill_lines SET amount = 53.11 WHERE id = '992d3535-a9a7-4c63-bd88-2bdffab8c1e9';

-- Bill INV-2026-00000996 (dd67e9d4): reduce line c79b1d78 by $0.01
UPDATE public.bill_lines SET amount = 0.97 WHERE id = 'c79b1d78-3024-4e32-a64b-df3e05e11d15';

-- Bill 02022026-413 (0f1e4c4d): reduce line a504ddf3 by $0.01
UPDATE public.bill_lines SET amount = 2.72 WHERE id = 'a504ddf3-34d8-4647-82ca-6506805be38f';

-- Part 2: Fix Journal Entry Line Amounts (2 journal entries)

-- JE f5de9e9d (Bill 11893): reduce debit line 4ca0d35b from $53.13 to $53.09
UPDATE public.journal_entry_lines SET debit = 53.09 WHERE id = '4ca0d35b-8c1e-4a2f-9d3b-7e6f5a4c3d2b';

-- JE 0ca0e8bc (Bill 02022026-413): reduce debit line 389a319b from $2.73 to $2.72
UPDATE public.journal_entry_lines SET debit = 2.72 WHERE id = '389a319b-7c2d-4e5f-a1b3-6d8e9f0a1b2c';
