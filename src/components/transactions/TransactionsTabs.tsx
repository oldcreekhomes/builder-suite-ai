import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JournalEntryForm } from "@/components/journal/JournalEntryForm";

interface TransactionsTabsProps {
  projectId?: string;
}

export function TransactionsTabs({ projectId }: TransactionsTabsProps) {
  return (
    <Tabs defaultValue="journal-entry" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="journal-entry">Journal Entry</TabsTrigger>
        <TabsTrigger value="write-checks">Write Checks</TabsTrigger>
        <TabsTrigger value="make-deposits">Make Deposits</TabsTrigger>
        <TabsTrigger value="reconcile-accounts">Reconcile Accounts</TabsTrigger>
      </TabsList>
      
      <TabsContent value="journal-entry" className="mt-6">
        <JournalEntryForm projectId={projectId} />
      </TabsContent>
      
      <TabsContent value="write-checks" className="mt-6">
        <div className="text-center py-8 text-muted-foreground">
          Write Checks content - To be implemented
        </div>
      </TabsContent>
      
      <TabsContent value="make-deposits" className="mt-6">
        <div className="text-center py-8 text-muted-foreground">
          Make Deposits content - To be implemented
        </div>
      </TabsContent>
      
      <TabsContent value="reconcile-accounts" className="mt-6">
        <div className="text-center py-8 text-muted-foreground">
          Reconcile Accounts content - To be implemented
        </div>
      </TabsContent>
    </Tabs>
  );
}
