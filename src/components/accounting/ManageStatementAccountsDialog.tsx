import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Plus, X } from "lucide-react";
import { useProjectStatementAccounts, type StatementAccount } from "@/hooks/useProjectStatementAccounts";
import { useProjectPaymentAccounts } from "@/hooks/useProjectPaymentAccounts";
import { TableRowActions, type TableAction } from "@/components/ui/table-row-actions";

const NONE = "__none__";

interface Props {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageStatementAccountsDialog({ projectId, open, onOpenChange }: Props) {
  const {
    accounts,
    isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
  } = useProjectStatementAccounts(projectId);
  const { paymentAccounts } = useProjectPaymentAccounts(projectId);

  const [newName, setNewName] = useState("");
  const [newAccountId, setNewAccountId] = useState<string>(NONE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingAccountId, setEditingAccountId] = useState<string>(NONE);

  const handleAdd = () => {
    if (!newName.trim()) return;
    createAccount.mutate(
      { name: newName, accountId: newAccountId === NONE ? null : newAccountId },
      {
        onSuccess: () => {
          setNewName("");
          setNewAccountId(NONE);
        },
      }
    );
  };

  const startEdit = (a: StatementAccount) => {
    setEditingId(a.id);
    setEditingName(a.name);
    setEditingAccountId(a.account_id || NONE);
  };

  const saveEdit = () => {
    if (!editingId || !editingName.trim()) return;
    updateAccount.mutate(
      {
        id: editingId,
        name: editingName.trim(),
        account_id: editingAccountId === NONE ? null : editingAccountId,
      },
      { onSuccess: () => setEditingId(null) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Statement Accounts</DialogTitle>
          <DialogDescription>
            Bank and credit-card accounts used to group this project's statements.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div>
          ) : accounts.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No accounts yet. Add one below.
            </div>
          ) : (
            accounts.map((a) => {
              const linked = paymentAccounts.find((p) => p.id === a.account_id);
              return (
                <div key={a.id} className="flex items-center gap-2 border rounded-md px-3 py-2">
                  {editingId === a.id ? (
                    <>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                        className="h-8 flex-1"
                        autoFocus
                      />
                      <Select value={editingAccountId} onValueChange={setEditingAccountId}>
                        <SelectTrigger className="h-8 w-56">
                          <SelectValue placeholder="Link to COA (optional)" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          <SelectItem value={NONE}>No COA link</SelectItem>
                          {paymentAccounts.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.code} - {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={saveEdit}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{a.name}</div>
                        {linked && (
                          <div className="text-xs text-muted-foreground truncate">
                            {linked.code} - {linked.name}
                          </div>
                        )}
                      </div>
                      <TableRowActions
                        actions={[
                          {
                            label: a.is_active ? "Deactivate" : "Activate",
                            onClick: () =>
                              updateAccount.mutate({ id: a.id, is_active: !a.is_active }),
                          },
                          {
                            label: "Edit",
                            onClick: () => startEdit(a),
                          },
                          {
                            label: "Delete",
                            variant: "destructive",
                            requiresConfirmation: true,
                            confirmTitle: "Delete Statement Account",
                            confirmDescription: `Are you sure you want to delete "${a.name}"? This action cannot be undone.`,
                            onClick: () => deleteAccount.mutate(a.id),
                            isLoading: deleteAccount.isPending,
                          },
                        ] satisfies TableAction[]}
                      />
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="border-t pt-4 space-y-2">
          <Label>Add account</Label>
          <div className="flex items-center gap-2">
            <Input
              placeholder="e.g. Atlantic Union - Checking"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="flex-1"
            />
            <Select value={newAccountId} onValueChange={setNewAccountId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Link to COA (optional)" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value={NONE}>No COA link</SelectItem>
                {paymentAccounts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={!newName.trim() || createAccount.isPending}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
