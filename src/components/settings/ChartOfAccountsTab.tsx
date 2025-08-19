import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Plus, FileText } from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const ChartOfAccountsTab = () => {
  const { accounts, isLoading, createAccount, accountingSettings } = useAccounts();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const [newAccount, setNewAccount] = useState({
    code: "",
    name: "",
    type: "asset" as const,
    description: ""
  });

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
      const formData = new FormData();
      formData.append('file', file);

      // Get the user session token
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
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data.success) {
        toast({
          title: "Import Successful",
          description: data.message,
        });
        // Refresh the accounts list
        window.location.reload();
      } else {
        throw new Error(data.error || 'Unknown error occurred');
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

  const handleAddAccount = async () => {
    if (!newAccount.code || !newAccount.name) {
      toast({
        title: "Validation Error",
        description: "Please enter both account code and name",
        variant: "destructive",
      });
      return;
    }

    try {
      await createAccount.mutateAsync(newAccount);
      setNewAccount({ code: "", name: "", type: "asset", description: "" });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating account:', error);
    }
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'asset': return 'bg-blue-100 text-blue-800';
      case 'liability': return 'bg-red-100 text-red-800';
      case 'equity': return 'bg-purple-100 text-purple-800';
      case 'revenue': return 'bg-green-100 text-green-800';
      case 'expense': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
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

      {/* Accounting Settings Summary */}
      {accountingSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Accounting Settings</CardTitle>
            <CardDescription>Current account mappings for automated entries</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Accounts Payable:</span>
              <span className="font-medium">
                {accounts.find(a => a.id === accountingSettings.ap_account_id)?.name || 'Not configured'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Work in Progress:</span>
              <span className="font-medium">
                {accounts.find(a => a.id === accountingSettings.wip_account_id)?.name || 'Not configured'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart of Accounts Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Chart of Accounts</CardTitle>
            <CardDescription>
              Manage your chart of accounts ({accounts.length} accounts)
            </CardDescription>
          </div>
          <Button 
            onClick={() => setShowAddForm(!showAddForm)}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add New Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Account Code</Label>
                    <Input
                      id="code"
                      value={newAccount.code}
                      onChange={(e) => setNewAccount({ ...newAccount, code: e.target.value })}
                      placeholder="e.g., 1000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Account Name</Label>
                    <Input
                      id="name"
                      value={newAccount.name}
                      onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                      placeholder="e.g., Cash in Bank"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Account Type</Label>
                    <select
                      id="type"
                      value={newAccount.type}
                      onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value as any })}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="asset">Asset</option>
                      <option value="liability">Liability</option>
                      <option value="equity">Equity</option>
                      <option value="revenue">Revenue</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      value={newAccount.description}
                      onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
                      placeholder="Account description"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleAddAccount}
                    disabled={createAccount.isPending}
                  >
                    {createAccount.isPending ? 'Adding...' : 'Add Account'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No accounts found. Import from QuickBooks or add accounts manually.
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono">{account.code}</TableCell>
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={getAccountTypeColor(account.type)}
                        >
                          {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {account.description || '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};