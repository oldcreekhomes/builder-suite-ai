# Fix PO 2026-2401N-0066 "Billed to Date" at 2401 N Potomac

## What's wrong
The $1,395.00 is one older TNT bill (FR0000121019-001, 09/22/26, "Labor", cost code 4395 Window & Door Install, paid). It got linked to the **install line** of PO 0066 ($342.86). It isn't a garage storage door bill. The PO Status window adds every bill on the PO into Billed to Date, so that $1,395 shows up against the door line.

The $1,395 labor almost certainly belongs to PO **2026-2401N-0009** (2401 Install, $3,330.00, cost code 4395).

## Fix (data only, no code changes)
1. Move the $1,395 Labor line's PO link from PO 0066 to PO 0009's "2401 Install" line. Amount, cost code, lot, payment and cleared status all stay the same. No journal entries change.
2. Link the 2401 A door bill (FR0000123515-001) to PO 0066's "Garage Storage Doors" line. Right now it's on the PO but not on a line. The 2401 B and C bills are already on that line.
3. Check the result: PO 0066 should show $0 billed before these invoices, and PO 0009's billed amount should go up by $1,395.

## Heads-up
After the fix, the three door bills (3 x $626.42 = $1,879.26) are still more than the door line ($1,556.96). If the install line ($342.86) is counted, the whole PO is $1,899.82, which leaves $20.56 remaining. So these bills can still show "Over" on the door line by itself. That's real, not a glitch.
