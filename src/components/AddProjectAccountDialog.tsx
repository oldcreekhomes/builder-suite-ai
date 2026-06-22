import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
type AccountSubtype = 'bank' | 'loan' | 'credit_card' | 'equity' | 'other';

interface ExistingAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parent_id: string | null;
  subtype?: string | null;
  project_id?: string | null;
}

interface Props {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingAccounts: ExistingAccount[];
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

export const AddProjectAccountDialog = ({ projectId, open, onOpenChange, existingAccounts }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>('equity');
  const [subtype, setSubtype] = useState<AccountSubtype | "">("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const potentialParents = existingAccounts.filter(
    (a) => !a.parent_id && a.type === type
  );

  const selectedParent = parentId ? existingAccounts.find((a) => a.id === parentId) : null;
  const subtypeOptions = SUBTYPE_OPTIONS[type] ?? [];

  const handleParentChange = (value: string) => {
    const newParentId = value === "none" ? "" : value;
    setParentId(newParentId);
    if (newParentId) {
      const parent = existingAccounts.find((a) => a.id === newParentId);
      if (parent) {
        setType(parent.type as AccountType);
        const parentSubtype = (parent.subtype as AccountSubtype | null) ?? null;
        if (parentSubtype) setSubtype(parentSubtype);
      }
    }
  };

  const handleTypeChange = (value: AccountType) => {
    setType(value);
    setSubtype("");
    if (parentId) {
      const parent = existingAccounts.find((a) => a.id === parentId);
      if (parent && parent.type !== value) setParentId("");
    }
  };

  const reset = () => {
    setCode(""); setName(""); setType('equity'); setSubtype(""); setDescription(""); setParentId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!code.trim() || !name.trim()) return;
    setSubmitting(true);
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('home_builder_id')
        .eq('id', user.id)
        .single();
      const owner_id = userData?.home_builder_id || user.id;

      const { error } = await supabase
        .from('accounts')
        .insert({
          owner_id,
          project_id: projectId,
          code: code.trim(),
          name: name.trim(),
          type,
          subtype: subtype || null,
          description: description.trim() || null,
          parent_id: parentId || null,
          is_active: true,
        } as any);

      if (error) throw error;

      toast({ title: "Account added", description: "This account is only available in this project." });
      queryClient.invalidateQueries({ queryKey: ['accounts-for-project-selection', projectId] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to add account", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Account (this project only)</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            This account will be available only in this project. It will not appear in your global Chart of Accounts or in any other project.
          </p>

          <div className="space-y-2">
            <Label htmlFor="code">Account Code</Label>
            <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g., 2905.3" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Account Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., New Investor Equity" required />
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
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adding..." : "Add Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
