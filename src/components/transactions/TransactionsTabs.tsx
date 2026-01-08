import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

function TransactionsTabsInner({ projectId }: TransactionsTabsProps) {
  const [activeTab, setActiveTab] = useState("journal-entry");
  const { requestNavigation, showDialog, confirmSave, confirmDiscard, cancelNavigation, isSaving } = useUnsavedChangesContext();

  const handleTabChange = useCallback((newTab: string) => {
    if (newTab === activeTab) return;
    
    requestNavigation(() => {
      setActiveTab(newTab);
    });
  }, [activeTab, requestNavigation]);

  return (
    <>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="journal-entry">Journal Entry</TabsTrigger>
          <TabsTrigger value="write-checks">Write Checks</TabsTrigger>
          <TabsTrigger value="make-deposits">Make Deposits</TabsTrigger>
          <TabsTrigger value="credit-cards">Credit Cards</TabsTrigger>
          <TabsTrigger value="reconcile-accounts">Reconcile Accounts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="journal-entry" className="mt-6">
          <JournalEntryForm projectId={projectId} activeTab={activeTab} />
        </TabsContent>
        
        <TabsContent value="write-checks" className="mt-6">
          <WriteChecksContent projectId={projectId} />
        </TabsContent>
        
        <TabsContent value="make-deposits" className="mt-6">
          <MakeDepositsContent projectId={projectId} activeTab={activeTab} />
        </TabsContent>
        
        <TabsContent value="credit-cards" className="mt-6">
          <CreditCardsContent projectId={projectId} />
        </TabsContent>
        
        <TabsContent value="reconcile-accounts" className="mt-6">
          <ReconcileAccountsContent projectId={projectId} />
        </TabsContent>
      </Tabs>

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
