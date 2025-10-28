import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JournalEntryForm } from "@/components/journal/JournalEntryForm";
import { WriteChecksContent } from "./WriteChecksContent";
import { MakeDepositsContent } from "./MakeDepositsContent";
import { CreditCardsContent } from "./CreditCardsContent";
import { ReconcileAccountsContent } from "./ReconcileAccountsContent";

interface TransactionsTabsProps {
  projectId?: string;
}

export function TransactionsTabs({ projectId }: TransactionsTabsProps) {
  const [activeTab, setActiveTab] = useState("journal-entry");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
        <MakeDepositsContent projectId={projectId} />
      </TabsContent>
      
      <TabsContent value="credit-cards" className="mt-6">
        <CreditCardsContent projectId={projectId} />
      </TabsContent>
      
      <TabsContent value="reconcile-accounts" className="mt-6">
        <ReconcileAccountsContent projectId={projectId} />
      </TabsContent>
    </Tabs>
  );
}
