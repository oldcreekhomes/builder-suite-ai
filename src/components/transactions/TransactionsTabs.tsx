import { useState, useCallback } from "react";
import { ArrowRightLeft } from "lucide-react";
import { ContentSidebar } from "@/components/ui/ContentSidebar";
import { JournalEntryForm } from "@/components/journal/JournalEntryForm";
import { WriteChecksContent } from "./WriteChecksContent";
import { MakeDepositsContent } from "./MakeDepositsContent";
import { CreditCardsContent } from "./CreditCardsContent";
import { ReconcileAccountsContent } from "./ReconcileAccountsContent";
import { UnsavedChangesProvider, useUnsavedChangesContext } from "@/contexts/UnsavedChangesContext";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";

interface TransactionsTabsProps {
  projectId?: string;
}

const items = [
  { value: "journal-entry", label: "Journal Entry" },
  { value: "write-checks", label: "Write Checks" },
  { value: "make-deposits", label: "Make Deposits" },
  { value: "credit-cards", label: "Credit Cards" },
  { value: "reconcile-accounts", label: "Reconcile Accounts" },
];

function TransactionsTabsInner({ projectId }: TransactionsTabsProps) {
  const [active, setActive] = useState("journal-entry");
  const { requestNavigation, showDialog, confirmSave, confirmDiscard, cancelNavigation, isSaving } = useUnsavedChangesContext();

  const handleItemChange = useCallback((newItem: string) => {
    if (newItem === active) return;
    requestNavigation(() => {
      setActive(newItem);
    });
  }, [active, requestNavigation]);

  return (
    <>
      <div className="flex flex-1 overflow-hidden">
        <ContentSidebar
          title="Transaction Type"
          icon={ArrowRightLeft}
          items={items}
          activeItem={active}
          onItemChange={handleItemChange}
        />
        <div className="flex-1 min-w-0 p-6 overflow-auto">
          {active === "journal-entry" && <JournalEntryForm projectId={projectId} activeTab={active} />}
          {active === "write-checks" && <WriteChecksContent projectId={projectId} />}
          {active === "make-deposits" && <MakeDepositsContent projectId={projectId} activeTab={active} />}
          {active === "credit-cards" && <CreditCardsContent projectId={projectId} />}
          {active === "reconcile-accounts" && <ReconcileAccountsContent projectId={projectId} />}
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
