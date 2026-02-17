-- Reallocate INV0012 $1,000 "Deck framing draw" bill line from 4370 (Framing Labor) to 4810 (Decks)
UPDATE public.bill_lines 
SET cost_code_id = 'dae802c0-cbfd-43fc-a1ea-e08e744b2af8'
WHERE id = 'a2c39cb4-76ae-42eb-981e-f4225577ffe4'
  AND cost_code_id = 'd576bac6-59ef-4ce2-a4eb-97404150f37a';