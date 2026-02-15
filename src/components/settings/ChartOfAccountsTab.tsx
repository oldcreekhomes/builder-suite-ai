import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Plus, Edit, Search } from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { DeleteButton } from "@/components/ui/delete-button";
import { EditAccountDialog } from "./EditAccountDialog";
import { AddAccountDialog } from "./AddAccountDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChartOfAccountsTemplateDialog } from "./ChartOfAccountsTemplateDialog";
import { useQueryClient } from "@tanstack/react-query";

export const ChartOfAccountsTab = () => {
  const { accounts, isLoading, createAccount, accountingSettings, deleteAccount } = useAccounts();
  const [isImporting, setIsImporting] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [templateDismissed, setTemplateDismissed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Show template dialog when no accounts exist and not loading
  const templateDialogOpen = accounts.length === 0 && !isLoading && !templateDismissed;

  const handleUseTemplate = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Not authenticated", variant: "destructive" });
      return;
    }

    const response = await supabase.functions.invoke('copy-template-accounts', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Failed to import template');
    }

    const result = response.data;
    toast({
      title: "Template Imported!",
      description: `Successfully imported ${result.accountsImported} accounts.`,
    });

    queryClient.invalidateQueries({ queryKey: ['accounts'] });
  };

  const handleImportQuickBooks = () => {
    setTemplateDismissed(true);
  };

  const handleAddManually = () => {
    setTemplateDismissed(true);
    setAddDialogOpen(true);
  };

  const handleAddDialogOpenChange = (open: boolean) => {
    setAddDialogOpen(open);
    if (!open) setTemplateDismissed(false);
  };

  const handleImportIFF = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.iif')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an IIF file from QuickBooks",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('parse-iff-file', {
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Import Successful",
          description: data.message,
        });
        window.location.reload();
      } else {
        throw new Error(data?.error || 'Unknown error occurred');
      }
    } catch (error) {
      toast({
        title: "Import Failed", 
        description: error.message || "Failed to import chart of accounts",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const filteredAccounts = accounts.filter((account) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      account.code.toLowerCase().includes(q) ||
      account.name.toLowerCase().includes(q)
    );
  });

  if (isLoading) {
    return <div className="text-center py-2 text-sm">Loading chart of accounts...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Chart of Accounts</h3>
          <p className="text-sm text-muted-foreground">
            Manage your chart of accounts ({accounts.length} accounts)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".iif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportIFF(file);
              e.target.value = '';
            }}
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
            <Upload className="h-4 w-4 mr-2" />
            {isImporting ? 'Importing...' : 'Import IIF'}
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative w-64">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {searchQuery ? 'No accounts match your search.' : 'No accounts found. Import from QuickBooks or add accounts manually.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>{account.code}</TableCell>
                    <TableCell>{account.name}</TableCell>
                    <TableCell>{account.type.charAt(0).toUpperCase() + account.type.slice(1)}</TableCell>
                    <TableCell className="text-muted-foreground">{account.description || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center space-x-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => setEditingAccount(account)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit account</p>
                          </TooltipContent>
                        </Tooltip>
                        <DeleteButton
                          onDelete={() => deleteAccount.mutate(account.id)}
                          title="Delete Account"
                          description={`Are you sure you want to delete account ${account.code} - ${account.name}? This action cannot be undone.`}
                          isLoading={deleteAccount.isPending}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

      <ChartOfAccountsTemplateDialog
        open={templateDialogOpen}
        onOpenChange={(open) => { if (!open) setTemplateDismissed(true); }}
        onUseTemplate={handleUseTemplate}
        onImportQuickBooks={handleImportQuickBooks}
        onAddManually={handleAddManually}
      />

      <AddAccountDialog
        open={addDialogOpen}
        onOpenChange={handleAddDialogOpenChange}
      />

      <EditAccountDialog
        account={editingAccount}
        open={!!editingAccount}
        onOpenChange={(open) => !open && setEditingAccount(null)}
      />
    </div>
  );
};
