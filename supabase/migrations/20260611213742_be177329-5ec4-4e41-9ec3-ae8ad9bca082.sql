UPDATE public.bill_payments
SET payment_account_id = '7b456e28-9eec-44cb-9f01-c745cc70867c'
WHERE id IN ('5cfcf7e8-9639-4678-b5c8-2ffc700aba09','ea0ee44b-31a0-4778-92d0-68cf9f64ceb6')
  AND payment_account_id = '27ed0c3a-be95-4367-aa21-1a2b51ea1585'
  AND reconciled = false;