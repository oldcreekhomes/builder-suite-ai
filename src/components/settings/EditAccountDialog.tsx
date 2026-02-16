import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAccounts } from "@/hooks/useAccounts";

interface Account {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  description?: string;
  parent_id?: string | null;
}

interface EditAccountDialogProps {
  account: Account | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAccountDialog({ account, open, onOpenChange }: EditAccountDialogProps) {
  const queryClient = useQueryClient();
  const { accounts } = useAccounts();
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "asset" as 'asset' | 'liability' | 'equity' | 'revenue' | 'expense',
    description: "",
    parent_id: "" as string,
  });

  useEffect(() => {
    if (account) {
      setFormData({
        code: account.code || "",
        name: account.name || "",
        type: account.type || "asset",
        description: account.description || "",
        parent_id: account.parent_id || "",
      });
    }
  }, [account]);

  // Filter potential parents: root accounts of matching type, excluding self
  const potentialParents = accounts.filter(
    (a) => !a.parent_id && a.type === formData.type && a.id !== account?.id
  );

  const selectedParent = formData.parent_id ? accounts.find((a) => a.id === formData.parent_id) : null;

  const handleParentChange = (value: string) => {
    const newParentId = value === "none" ? "" : value;
    setFormData((prev) => ({ ...prev, parent_id: newParentId }));
    if (newParentId) {
      const parent = accounts.find((a) => a.id === newParentId);
      if (parent) setFormData((prev) => ({ ...prev, parent_id: newParentId, type: parent.type as any }));
    }
  };

  const handleTypeChange = (value: string) => {
    setFormData((prev) => {
      const newState = { ...prev, type: value as any };
      // Clear parent if type no longer matches
      if (prev.parent_id) {
        const parent = accounts.find((a) => a.id === prev.parent_id);
        if (parent && parent.type !== value) newState.parent_id = "";
      }
      return newState;
    });
  };

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('accounts')
        .update({
          code: data.code,
          name: data.name,
          type: data.type,
          description: data.description || null,
          parent_id: data.parent_id || null,
        })
        .eq('id', account!.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({
        title: "Success",
        description: "Account updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update account",
        variant: "destructive",
      });
      console.error('Error updating account:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      toast({
        title: "Validation Error",
        description: "Please enter both account code and name",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Account Code</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g., 1000"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Account Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Cash in Bank"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Account Type</Label>
            <Select value={formData.type} onValueChange={handleTypeChange} disabled={!!selectedParent}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asset">Asset</SelectItem>
                <SelectItem value="liability">Liability</SelectItem>
                <SelectItem value="equity">Equity</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            {selectedParent && (
              <p className="text-xs text-muted-foreground">Type inherited from parent account</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent">Parent Account (Optional)</Label>
            <Select value={formData.parent_id || "none"} onValueChange={handleParentChange}>
              <SelectTrigger id="parent">
                <SelectValue placeholder="None (root account)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (root account)</SelectItem>
                {potentialParents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Account description"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
