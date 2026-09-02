import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, CalendarIcon, ChevronDown, ChevronRight, Search, Landmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { UniversalFilePreviewProvider, useUniversalFilePreviewContext } from "@/components/files/UniversalFilePreviewProvider";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { formatDateSafe } from "@/utils/dateOnly";
import { useProjectStatementAccounts } from "@/hooks/useProjectStatementAccounts";
import { ManageStatementAccountsDialog } from "./ManageStatementAccountsDialog";

interface BankStatementsDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UNASSIGNED = "__unassigned__";

function BankStatementsDialogContent({ projectId, onOpenChange }: Omit<BankStatementsDialogProps, 'open'>) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { openProjectFile } = useUniversalFilePreviewContext();
  const { accounts: statementAccounts, activeAccounts } = useProjectStatementAccounts(projectId);

  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDate, setEditingDate] = useState<Date | undefined>(undefined);
  const [editingAccountId, setEditingAccountId] = useState<string>(UNASSIGNED);

  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadStatementDate, setUploadStatementDate] = useState<Date | undefined>(undefined);
  const [uploadAccountId, setUploadAccountId] = useState<string>("");

  // Organization state
  const [manageAccountsOpen, setManageAccountsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAccountId, setBulkAccountId] = useState<string>("");

  const cleanName = (raw?: string) => (raw ? raw.replace(/^\d{13}_/, "") : "");
  const displayName = (raw?: string | null) => {
    const stripped = (raw || '').replace('Bank Statements/', '');
    const base = stripped.split('/').pop() || stripped;
    return cleanName(base).replace(/\.pdf$/i, '') || 'Untitled';
  };

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // "2025-06-30" -> "June 2025" (no timezone conversion)
  const periodLabel = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const m = /^(\d{4})-(\d{2})/.exec(dateStr);
    if (!m) return null;
    return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
  };


  // Fetch bank statements
  const { data: statements, isLoading } = useQuery({
    queryKey: ['bank-statements', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_files')
        .select('id, original_filename, storage_path, uploaded_at, mime_type, file_size, statement_date, statement_account_id')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .like('original_filename', 'Bank Statements/%')
        .order('statement_date', { ascending: false, nullsFirst: false });

      if (error) throw error;
      // Hide folder placeholder records – they are not statements
      return (data || []).filter(
        (f) => !(f.original_filename || '').toLowerCase().endsWith('.folderkeeper')
      );
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const { error } = await supabase
        .from('project_files')
        .update({ is_deleted: true })
        .eq('id', fileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statements', projectId] });
      queryClient.invalidateQueries({ queryKey: ['bank-statement-metrics', projectId] });
      toast({
        title: "Statement deleted",
        description: "Bank statement has been removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete statement: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update mutation (filename, statement_date, account)
  const updateMutation = useMutation({
    mutationFn: async ({ fileId, newName, statementDate, statementAccountId }: { fileId: string; newName: string; statementDate: Date | null; statementAccountId: string | null }) => {
      const { error } = await supabase
        .from('project_files')
        .update({
          original_filename: `Bank Statements/${newName}`,
          statement_date: statementDate ? format(statementDate, 'yyyy-MM-dd') : null,
          statement_account_id: statementAccountId,
        })
        .eq('id', fileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statements', projectId] });
      setEditingId(null);
      setEditingName("");
      setEditingDate(undefined);
      setEditingAccountId(UNASSIGNED);
      toast({
        title: "Success",
        description: "Bank statement updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Bulk assign mutation
  const bulkAssignMutation = useMutation({
    mutationFn: async ({ ids, accountId }: { ids: string[]; accountId: string }) => {
      const { error } = await supabase
        .from('project_files')
        .update({ statement_account_id: accountId })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bank-statements', projectId] });
      setSelectedIds([]);
      setBulkAccountId("");
      toast({
        title: "Statements moved",
        description: `${variables.ids.length} statement(s) assigned.`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (fileId: string, currentName: string, currentDate: string | null, currentAccountId: string | null) => {
    setEditingId(fileId);
    setEditingName(cleanName(currentName.replace('Bank Statements/', '')));
    setEditingAccountId(currentAccountId || UNASSIGNED);
    if (currentDate) {
      const [year, month, day] = currentDate.split('-').map(Number);
      setEditingDate(new Date(year, month - 1, day));
    } else {
      setEditingDate(undefined);
    }
  };

  const handleSaveEdit = () => {
    if (!editingName.trim()) {
      toast({
        title: "Error",
        description: "Filename cannot be empty",
        variant: "destructive",
      });
      return;
    }
    if (editingId) {
      updateMutation.mutate({
        fileId: editingId,
        newName: editingName.trim(),
        statementDate: editingDate || null,
        statementAccountId: editingAccountId === UNASSIGNED ? null : editingAccountId,
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    if (pdfFiles.length !== files.length) {
      toast({
        title: "Invalid file type",
        description: "Only PDF files are allowed",
        variant: "destructive",
      });
    }
    if (pdfFiles.length > 0) {
      setSelectedFiles(pdfFiles);
      setUploadDialogOpen(true);
    }
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    if (!uploadStatementDate) {
      toast({
        title: "Statement End Date Required",
        description: "Please select the statement end date before uploading",
        variant: "destructive",
      });
      return;
    }
    if (!uploadAccountId) {
      toast({
        title: "Account Required",
        description: "Please select which account these statements belong to",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      for (const file of selectedFiles) {
        const originalFilename = `Bank Statements/${file.name}`;
        const fileId = crypto.randomUUID();
        const storageName = `${projectId}/${fileId}_${originalFilename}`;

        const { data: uploadUrl, error: urlError } = await supabase.storage
          .from('project-files')
          .createSignedUploadUrl(storageName);

        if (urlError) throw urlError;

        const uploadResponse = await fetch(uploadUrl.signedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) throw new Error('Upload failed');

        const { error: insertError } = await supabase
          .from('project_files')
          .insert({
            project_id: projectId,
            filename: storageName,
            original_filename: originalFilename,
            file_size: file.size,
            file_type: 'pdf',
            mime_type: file.type,
            storage_path: storageName,
            uploaded_by: user.id,
            is_deleted: false,
            statement_date: format(uploadStatementDate, 'yyyy-MM-dd'),
            statement_account_id: uploadAccountId,
          });

        if (insertError) throw insertError;
      }

      queryClient.invalidateQueries({ queryKey: ['bank-statements', projectId] });
      queryClient.invalidateQueries({ queryKey: ['bank-statement-metrics', projectId] });

      toast({
        title: "Success",
        description: `${selectedFiles.length} statement(s) uploaded successfully`,
      });

      setUploadDialogOpen(false);
      setSelectedFiles([]);
      setUploadStatementDate(undefined);
      setUploadAccountId("");
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (storagePath: string, filename: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(storagePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.replace('Bank Statements/', '');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatStatementDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return formatDateSafe(dateStr, 'MM/dd/yy');
  };

  // Group statements by statement account, in the user's configured order
  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();

    const byAccount = new Map<string, any[]>();
    for (const row of statements || []) {
      const key = row.statement_account_id || UNASSIGNED;
      if (!byAccount.has(key)) byAccount.set(key, []);
      byAccount.get(key)!.push(row);
    }

    // Newest statement period first; undated rows last. Ties broken by newest upload.
    const sortRows = (list: any[]) =>
      [...list].sort((a, b) => {
        const ad = a.statement_date || '';
        const bd = b.statement_date || '';
        if (ad && bd && ad !== bd) return bd.localeCompare(ad);
        if (ad && !bd) return -1;
        if (!ad && bd) return 1;
        return (b.uploaded_at || '').localeCompare(a.uploaded_at || '');
      });

    // Label each row by its statement period, numbering duplicates within the account.
    const labelRows = (list: any[]) => {
      const counts = new Map<string, number>();
      return list.map((row) => {
        const period = periodLabel(row.statement_date);
        let label: string;
        if (period) {
          const n = (counts.get(period) || 0) + 1;
          counts.set(period, n);
          label = n === 1 ? period : `${period} (${n})`;
        } else {
          label = displayName(row.original_filename);
        }
        return { ...row, _label: label };
      });
    };

    const matches = (row: any) =>
      !term ||
      String(row._label).toLowerCase().includes(term) ||
      String(row.original_filename || '').toLowerCase().includes(term);

    const buildRows = (list: any[]) => labelRows(sortRows(list)).filter(matches);

    const ordered = statementAccounts
      .filter((a) => byAccount.has(a.id) || a.is_active)
      .map((a) => ({
        key: a.id,
        label: a.name,
        rows: buildRows(byAccount.get(a.id) || []),
      }));

    const unassigned = byAccount.get(UNASSIGNED) || [];
    if (unassigned.length > 0) {
      ordered.push({ key: UNASSIGNED, label: 'Unassigned', rows: buildRows(unassigned) });
    }

    return ordered;
  }, [statements, statementAccounts, search]);


  const totalRows = (statements || []).length;

  const toggleGroup = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
      <DialogHeader>
        <DialogTitle>Bank Statements</DialogTitle>
        <DialogDescription>
          Upload and manage bank statement PDFs for this project
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search statements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={() => setManageAccountsOpen(true)}>
            <Landmark className="h-4 w-4 mr-2" />
            Accounts
          </Button>
          <Button asChild disabled={isUploading}>
            <label className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload PDF'}
              <input
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
            </label>
          </Button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <span className="text-sm">{selectedIds.length} selected</span>
          <Select value={bulkAccountId} onValueChange={setBulkAccountId}>
            <SelectTrigger className="h-8 w-64">
              <SelectValue placeholder="Move to account..." />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {activeAccounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!bulkAccountId || bulkAssignMutation.isPending}
            onClick={() => bulkAssignMutation.mutate({ ids: selectedIds, accountId: bulkAccountId })}
          >
            Move
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Clear</Button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : totalRows === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>No bank statements yet.</p>
            <p className="text-sm mt-2">Add an account, then upload a PDF to get started.</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No statements match your search.</div>
        ) : (
          groups.map((group) => {
            const isCollapsed = !!collapsed[group.key];
            const latest = group.rows.find((r) => r.statement_date)?.statement_date || null;
            return (
              <div key={group.key} className="border rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted text-left"
                >
                  {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="font-medium text-sm">{group.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {group.rows.length} statement{group.rows.length === 1 ? '' : 's'}
                  </span>
                  {latest && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      Latest {formatStatementDate(latest)}
                    </span>
                  )}
                </button>

                {!isCollapsed && (
                  group.rows.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground">No statements yet.</div>
                  ) : (
                    <Table containerClassName="relative w-full overflow-visible max-h-none">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead>File Name</TableHead>
                          <TableHead className="w-40">Statement End Date</TableHead>
                          <TableHead className="w-28">Uploaded</TableHead>
                          <TableHead className="w-24">Size</TableHead>
                          <TableHead className="w-20 text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.rows.map((statement) => (
                          <TableRow
                            key={statement.id}
                            onClick={() => {
                              openProjectFile(
                                statement.storage_path,
                                `${statement._label}.pdf`
                              );
                            }}
                            className="cursor-pointer hover:bg-muted/50"
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedIds.includes(statement.id)}
                                onCheckedChange={() => toggleSelected(statement.id)}
                              />
                            </TableCell>
                            <TableCell
                              className="font-medium"
                              title={displayName(statement.original_filename)}
                            >
                              {statement._label}
                            </TableCell>

                            <TableCell>{formatStatementDate(statement.statement_date)}</TableCell>
                            <TableCell>
                              {statement.uploaded_at ? formatDateSafe(statement.uploaded_at, 'MM/dd/yy') : '-'}
                            </TableCell>
                            <TableCell>
                              {statement.file_size ? formatFileSize(statement.file_size) : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                                <TableRowActions
                                  actions={[
                                    {
                                      label: "Download",
                                      onClick: () => handleDownload(
                                        statement.storage_path,
                                        `${statement._label}.pdf`
                                      ),

                                    },
                                    {
                                      label: "Edit",
                                      onClick: () => handleEdit(
                                        statement.id,
                                        statement.original_filename || '',
                                        statement.statement_date,
                                        statement.statement_account_id
                                      ),
                                    },
                                    {
                                      label: "Delete",
                                      variant: "destructive",
                                      requiresConfirmation: true,
                                      confirmTitle: "Delete Bank Statement",
                                      confirmDescription: "Are you sure you want to delete this bank statement? This action cannot be undone.",
                                      onClick: () => deleteMutation.mutate(statement.id),
                                      isLoading: deleteMutation.isPending,
                                    },
                                  ]}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )
                )}
              </div>
            );
          })
        )}
      </div>

      <ManageStatementAccountsDialog
        projectId={projectId}
        open={manageAccountsOpen}
        onOpenChange={setManageAccountsOpen}
      />

      {/* Upload Dialog with Account + Statement End Date */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setUploadDialogOpen(false);
          setSelectedFiles([]);
          setUploadStatementDate(undefined);
          setUploadAccountId("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Bank Statement</DialogTitle>
            <DialogDescription>
              Select the account and statement end date for {selectedFiles.length} file(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Selected Files</Label>
              <div className="text-sm text-muted-foreground">
                {selectedFiles.map(f => f.name).join(', ')}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Account</Label>
              {activeAccounts.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No statement accounts yet — close this and use the Accounts button to add one.
                </div>
              ) : (
                <Select value={uploadAccountId} onValueChange={setUploadAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {activeAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Statement End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !uploadStatementDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {uploadStatementDate ? format(uploadStatementDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={uploadStatementDate}
                    onSelect={(date) => { if (date) setUploadStatementDate(date); }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false);
                setSelectedFiles([]);
                setUploadStatementDate(undefined);
                setUploadAccountId("");
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isUploading || !uploadStatementDate || !uploadAccountId}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog with Account + Statement End Date */}
      <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bank Statement</DialogTitle>
            <DialogDescription>
              Update the account, file name and statement end date
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filename">File Name</Label>
              <Input
                id="filename"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                }}
                placeholder="Enter filename"
              />
            </div>
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={editingAccountId} onValueChange={setEditingAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {statementAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statement End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editingDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editingDate ? format(editingDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editingDate}
                    onSelect={(date) => { if (date) setEditingDate(date); }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingId(null)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DialogContent>
  );
}

export function BankStatementsDialog(props: BankStatementsDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <UniversalFilePreviewProvider>
        <BankStatementsDialogContent
          projectId={props.projectId}
          onOpenChange={props.onOpenChange}
        />
      </UniversalFilePreviewProvider>
    </Dialog>
  );
}
