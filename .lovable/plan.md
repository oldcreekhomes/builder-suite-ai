Regenerate the combined Excel using the correct Nob Hill total of **$446,724.08** (Review $376,284.25 + Approved $63,082.09 + Paid $7,357.74 = 41 bills, confirmed in DB).

Steps:
1. Pull every Nob Hill bill line across draft/posted/paid, sum by cost code.
2. Reuse your existing mappings (2150→4170, 4015/4020/4040→4010.3/.4/.2, 4070→4040, no-code → "(Uncategorized)").
3. If any new cost codes appear that aren't in OCH, list them and ask before mapping.
4. Write `/mnt/documents/Combined_OCH_NobHill_Costs_v2.xlsx`. OCH column unchanged ($1,951,708.79), Nob Hill column = $446,724.08, grand total ≈ $2,398,432.87. Drop rows where Combined = $0.