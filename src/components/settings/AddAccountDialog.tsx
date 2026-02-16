import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounts } from "@/hooks/useAccounts";

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddAccountDialog = ({ open, onOpenChange }: AddAccountDialogProps) => {
  const { createAccount, accounts } = useAccounts();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<'asset' | 'liability' | 'equity' | 'revenue' | 'expense'>('asset');
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<string>("");

  // Filter potential parents: only root accounts (no parent_id) of matching type
  const potentialParents = accounts.filter(
    (a) => !a.parent_id && a.type === type
  );

  const selectedParent = parentId ? accounts.find((a) => a.id === parentId) : null;

  const handleParentChange = (value: string) => {
    const newParentId = value === "none" ? "" : value;
    setParentId(newParentId);
    // Auto-inherit type from parent
    if (newParentId) {
      const parent = accounts.find((a) => a.id === newParentId);
      if (parent) setType(parent.type as any);
    }
  };

  const handleTypeChange = (value: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense') => {
    setType(value);
    // Clear parent if type changes and parent doesn't match
    if (parentId) {
      const parent = accounts.find((a) => a.id === parentId);
      if (parent && parent.type !== value) setParentId("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim() || !name.trim()) {
      return;
    }

    await createAccount.mutateAsync({
      code: code.trim(),
      name: name.trim(),
      type,
      description: description.trim() || undefined,
      parent_id: parentId || undefined,
    });

    // Reset form and close dialog
    setCode("");
    setName("");
    setType('asset');
    setDescription("");
    setParentId("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setCode("");
    setName("");
    setType('asset');
    setDescription("");
    setParentId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Account Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., 1000"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Account Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cash"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Account Type</Label>
            <Select value={type} onValueChange={handleTypeChange} disabled={!!selectedParent}>
              <SelectTrigger id="type">
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
            <Select value={parentId || "none"} onValueChange={handleParentChange}>
              <SelectTrigger id="parent">
                <SelectValue placeholder="None (root account)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (root account)</SelectItem>
                {potentialParents.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={createAccount.isPending}>
              {createAccount.isPending ? "Adding..." : "Add Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
