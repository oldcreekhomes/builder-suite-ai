import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounts } from "@/hooks/useAccounts";
import { supabase } from "@/integrations/supabase/client";

type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
type AccountSubtype = 'bank' | 'loan' | 'credit_card' | 'equity' | 'other';

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUBTYPE_OPTIONS: Record<AccountType, AccountSubtype[]> = {
  asset: ['bank', 'loan', 'other'],
  liability: ['loan', 'credit_card', 'other'],
  equity: ['equity', 'other'],
  revenue: [],
  expense: [],
};

const SUBTYPE_LABEL: Record<AccountSubtype, string> = {
  bank: 'Bank',
  loan: 'Loan',
  credit_card: 'Credit Card',
  equity: 'Equity',
  other: 'Other',
};

export const AddAccountDialog = ({ open, onOpenChange }: AddAccountDialogProps) => {
  const { createAccount, accounts } = useAccounts();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>('asset');
  const [subtype, setSubtype] = useState<AccountSubtype | "">("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<string>("");

  const potentialParents = accounts.filter(
    (a) => !a.parent_id && a.type === type
  );

  const selectedParent = parentId ? accounts.find((a) => a.id === parentId) : null;
  const subtypeOptions = SUBTYPE_OPTIONS[type] ?? [];

  const handleParentChange = (value: string) => {
    const newParentId = value === "none" ? "" : value;
    setParentId(newParentId);
    if (newParentId) {
      const parent = accounts.find((a) => a.id === newParentId);
      if (parent) {
        setType(parent.type as AccountType);
        const parentSubtype = (parent as any).subtype as AccountSubtype | null;
        if (parentSubtype) setSubtype(parentSubtype);
      }
    }
  };

  const handleTypeChange = (value: AccountType) => {
    setType(value);
    setSubtype("");
    if (parentId) {
      const parent = accounts.find((a) => a.id === parentId);
      if (parent && parent.type !== value) setParentId("");
    }
  };

  const reset = () => {
    setCode(""); setName(""); setType('asset'); setSubtype(""); setDescription(""); setParentId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    const created: any = await createAccount.mutateAsync({
      code: code.trim(),
      name: name.trim(),
      type,
      description: description.trim() || undefined,
      parent_id: parentId || undefined,
    });

    if (subtype && created?.id) {
      await supabase.from('accounts').update({ subtype }).eq('id', created.id);
    }

    reset();
    onOpenChange(false);
  };

  const handleCancel = () => {
    reset();
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
            <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g., 1000" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Account Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Cash" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Account Type</Label>
            <Select value={type} onValueChange={(v) => handleTypeChange(v as AccountType)} disabled={!!selectedParent}>
              <SelectTrigger id="type"><SelectValue /></SelectTrigger>
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

          {subtypeOptions.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="subtype">Subtype</Label>
              <Select value={subtype || "none"} onValueChange={(v) => setSubtype(v === "none" ? "" : (v as AccountSubtype))}>
                <SelectTrigger id="subtype"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {subtypeOptions.map((s) => (
                    <SelectItem key={s} value={s}>{SUBTYPE_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Mark as Bank to make this account selectable when writing checks, making deposits, or paying bills.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="parent">Parent Account (Optional)</Label>
            <Select value={parentId || "none"} onValueChange={handleParentChange}>
              <SelectTrigger id="parent"><SelectValue placeholder="None (root account)" /></SelectTrigger>
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
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button type="submit" disabled={createAccount.isPending}>
              {createAccount.isPending ? "Adding..." : "Add Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
