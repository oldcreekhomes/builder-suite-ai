import { useState, useCallback } from "react";
import { ArrowRightLeft } from "lucide-react";
import { ContentSidebar } from "@/components/ui/ContentSidebar";
import { JournalEntryForm } from "@/components/journal/JournalEntryForm";
import { WriteChecksContent } from "./WriteChecksContent";
import { MakeDepositsContent } from "./MakeDepositsContent";
import { CreditCardsContent } from "./CreditCardsContent";
import { ReconcileAccountsContent } from "./ReconcileAccountsContent";
import { RecurringTransactionsContent } from "./RecurringTransactionsContent";
import { PendingRecurringBanner } from "./PendingRecurringBanner";
import { UnsavedChangesProvider, useUnsavedChangesContext } from "@/contexts/UnsavedChangesContext";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import type { RecurringTransaction } from "@/hooks/useRecurringTransactions";

interface TransactionsTabsProps {
  projectId?: string;
}

const items = [
  { value: "journal-entry", label: "Journal Entry" },
  { value: "write-checks", label: "Write Checks" },
  { value: "make-deposits", label: "Make Deposits" },
  { value: "credit-cards", label: "Credit Cards" },
  { value: "reconcile-accounts", label: "Reconcile Accounts" },
  { value: "recurring", label: "Recurring" },
];

function TransactionsTabsInner({ projectId }: TransactionsTabsProps) {
  const [active, setActive] = useState("journal-entry");
  const { requestNavigation, showDialog, confirmSave, confirmDiscard, cancelNavigation, isSaving } = useUnsavedChangesContext();
  const [recurringTemplate, setRecurringTemplate] = useState<RecurringTransaction | null>(null);

  const handleItemChange = useCallback((newItem: string) => {
    if (newItem === active) return;
    requestNavigation(() => {
      setActive(newItem);
      setRecurringTemplate(null);
    });
  }, [active, requestNavigation]);

  const handleEnterRecurring = useCallback((rt: RecurringTransaction) => {
    setRecurringTemplate(rt);
    const targetTab = rt.transaction_type === "check" ? "write-checks"
      : rt.transaction_type === "credit_card" ? "credit-cards"
      : "write-checks"; // bills can default to checks for now
    requestNavigation(() => {
      setActive(targetTab);
    });
  }, [requestNavigation]);

  return (
    <>
      <div className="flex flex-1 overflow-hidden flex-col">
        <PendingRecurringBanner
          onEnterTransaction={handleEnterRecurring}
          onViewAll={() => handleItemChange("recurring")}
        />
        <div className="flex flex-1 overflow-hidden">
          <ContentSidebar
            title="Transaction Type"
            icon={ArrowRightLeft}
            items={items}
            activeItem={active}
            onItemChange={handleItemChange}
          />
          <div className="flex-1 min-w-0 px-6 pt-3 pb-6 overflow-auto">
            {active === "journal-entry" && <JournalEntryForm projectId={projectId} activeTab={active} />}
            {active === "write-checks" && <WriteChecksContent projectId={projectId} recurringTemplate={recurringTemplate} onClearTemplate={() => setRecurringTemplate(null)} />}
            {active === "make-deposits" && <MakeDepositsContent projectId={projectId} activeTab={active} />}
            {active === "credit-cards" && <CreditCardsContent projectId={projectId} recurringTemplate={recurringTemplate} onClearTemplate={() => setRecurringTemplate(null)} />}
            {active === "reconcile-accounts" && <ReconcileAccountsContent projectId={projectId} />}
            {active === "recurring" && <RecurringTransactionsContent projectId={projectId} onEnterTransaction={handleEnterRecurring} />}
          </div>
        </div>
      </div>

      <UnsavedChangesDialog
        open={showDialog}
        onSave={confirmSave}
        onDiscard={confirmDiscard}
        onCancel={cancelNavigation}
        isSaving={isSaving}
      />
    </>
  );
}

export function TransactionsTabs({ projectId }: TransactionsTabsProps) {
  return (
    <UnsavedChangesProvider>
      <TransactionsTabsInner projectId={projectId} />
    </UnsavedChangesProvider>
  );
}
