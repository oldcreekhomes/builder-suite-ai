import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Plus, FileText, Edit } from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { DeleteButton } from "@/components/ui/delete-button";
import { EditAccountDialog } from "./EditAccountDialog";

export const ChartOfAccountsTab = () => {
  const { accounts, isLoading, createAccount, accountingSettings, deleteAccount } = useAccounts();
  const [isImporting, setIsImporting] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);

  const handleImportIFF = async (files: File[]) => {
    if (files.length === 0) return;
    
    const file = files[0];
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
      console.log('Starting IFF import process...');
      const formData = new FormData();
      formData.append('file', file);

      // Get the user session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      console.log('Calling parse-iff-file function...');
      const { data, error } = await supabase.functions.invoke('parse-iff-file', {
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('Function response:', { data, error });
      console.log('Function response data:', JSON.stringify(data, null, 2));

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data?.success) {
        console.log('Import successful, data returned:', data);
        console.log('Accounts imported:', data.accounts?.length || 0);
        toast({
          title: "Import Successful",
          description: data.message,
        });
        // Refresh the accounts list instead of full page reload
        window.location.reload();
      } else {
        console.error('Import failed with data:', data);
        throw new Error(data?.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed", 
        description: error.message || "Failed to import chart of accounts",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleImportIFF,
    accept: {
      'application/octet-stream': ['.iif'],
      'text/plain': ['.iif']
    },
    maxFiles: 1,
    multiple: false
  });

  if (isLoading) {
    return <div className="text-center py-2 text-sm">Loading chart of accounts...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle>Import from QuickBooks</CardTitle>
          <CardDescription>
            Import your chart of accounts from a QuickBooks IIF file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary hover:bg-primary/5'
            }`}
          >
            <input {...getInputProps()} />
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-primary">Drop the IIF file here...</p>
            ) : (
              <div>
                <p className="text-muted-foreground mb-2">
                  Drag and drop your QuickBooks IIF file here, or click to select
                </p>
                <Button variant="outline" disabled={isImporting}>
                  <Upload className="h-4 w-4 mr-2" />
                  {isImporting ? 'Importing...' : 'Select IIF File'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>


      {/* Chart of Accounts Table - Matching uniform design */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Chart of Accounts</h3>
            <p className="text-sm text-gray-600">
              Manage your chart of accounts ({accounts.length} accounts)
            </p>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="h-8">
                <TableHead className="h-8 px-2 py-1 text-xs font-medium">Code</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs font-medium">Account Name</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs font-medium">Type</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs font-medium">Description</TableHead>
                <TableHead className="h-8 px-2 py-1 text-xs font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-xs text-gray-500">
                    No accounts found. Import from QuickBooks or add accounts manually.
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
                  <TableRow key={account.id} className="h-10">
                    <TableCell className="px-2 py-1 text-xs align-middle">
                      {account.code}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-xs align-middle">
                      {account.name}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-xs align-middle">
                      {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-xs text-muted-foreground align-middle">
                      {account.description || '—'}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-right align-middle">
                      <div className="flex justify-end items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          title="Edit account"
                          onClick={() => setEditingAccount(account)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
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
      </div>

      <EditAccountDialog
        account={editingAccount}
        open={!!editingAccount}
        onOpenChange={(open) => !open && setEditingAccount(null)}
      />
    </div>
  );
};