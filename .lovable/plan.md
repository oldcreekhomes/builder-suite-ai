## Move ÷ Button to Its Own Column in Edit Bill (Match Enter Manually)

The ÷ icon isn't visible in the screenshot because both rows are already grouped (`All 10 lots` / `All 9 lots`), and I only rendered the button inside the Actions cell for ungrouped single rows. The Enter Manually tab puts ÷ in its own dedicated column between Purchase Order and Action, always visible when the project has multiple addresses.

### Change in `src/components/bills/EditBillDialog.tsx`

1. **Header row (line ~945, Job Cost table)** — add a new `<TableHead>` between `Purchase Order` and `Actions`, only when `showAddressColumn` is true:
   ```
   {showAddressColumn && <TableHead className="w-[50px] text-center"></TableHead>}
   ```

2. **Body row (around the Actions cell ~line 1119)** — remove the ÷ button from inside the Actions `<div>` (revert Actions cell back to a single trash button, original `w-[50px]`), and insert a new dedicated `<TableCell>` immediately after the Purchase Order cell:
   ```
   {showAddressColumn && (
     <TableCell className="text-center">
       <Tooltip>
         <TooltipTrigger asChild>
           <Button
             onClick={() => singleRow && splitJobCostRowEvenly(singleRow.id)}
             size="sm"
             variant="ghost"
             className="h-8 w-8 p-0"
             disabled={
               !singleRow ||
               !!singleRow.lotId ||
               ((parseFloat(singleRow.amount) || 0) * (parseFloat(singleRow.quantity) || 1)) <= 0
             }
           >
             <Divide className="h-4 w-4" />
           </Button>
         </TooltipTrigger>
         <TooltipContent>
           <p>Split evenly across all addresses</p>
         </TooltipContent>
       </Tooltip>
     </TableCell>
   )}
   ```

3. Revert the Actions header width back to `w-[50px]` and the Actions cell back to a plain trash button (undo the previous flex wrapper).

### Result
- ÷ column shows for every job-cost row when project has >1 address — same column position as Enter Manually
- Disabled (greyed) on rows that already have a lot assigned or are already split across lots, enabled on fresh ungrouped rows with a positive total
- No expense-tab changes (expenses have no addresses)
