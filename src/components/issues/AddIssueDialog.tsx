import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIssueMutations } from "@/hooks/useIssueMutations";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getFileIcon, getFileIconColor, getCleanFileName } from "@/components/bidding/utils/fileIconUtils";

interface AddIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: string;
}

export function AddIssueDialog({ open, onOpenChange, category }: AddIssueDialogProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"Normal" | "High">("Normal");
  const [issueFiles, setIssueFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { createIssue } = useIssueMutations();
  const { toast } = useToast();

  const reset = () => {
    setTitle("");
    setPriority("Normal");
    setIssueFiles([]);
  };

  const pickFiles = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      setIssueFiles((prev) => [...prev, ...files]);
    };
    input.click();
  };

  const removeFile = (index: number) => {
    setIssueFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadIssueFiles = async (issueId: string) => {
    const { data: userData } = await supabase.auth.getUser();
    for (const file of issueFiles) {
      const ext = file.name.split(".").pop();
      const fileName = `${Math.random()}.${ext}`;
      const filePath = `${issueId}/${fileName}`;
      const { error: upErr } = await supabase.storage.from("issue-files").upload(filePath, file);
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("issue_files").insert({
        issue_id: issueId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: userData.user?.id,
      });
      if (dbErr) throw dbErr;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const missing: string[] = [];
    if (!title.trim()) missing.push("Title");
    if (!priority) missing.push("Priority");
    if (issueFiles.length === 0) missing.push("Issue Files");

    if (missing.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please provide the following: ${missing.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const newIssue: any = await createIssue.mutateAsync({
        title: title.trim(),
        category,
        priority,
      });

      await uploadIssueFiles(newIssue.id);

      toast({ title: "Success", description: "Issue created successfully" });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error creating issue:", err);
      toast({
        title: "Error",
        description: err?.message || "Failed to create issue",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !submitting) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New {category} Issue</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter issue title..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority *</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as "Normal" | "High")}>
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Issue Files *</Label>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={pickFiles}
              >
                Add Files
              </Button>
              {issueFiles.map((file, i) => {
                const IconComponent = getFileIcon(file.name);
                const iconColorClass = getFileIconColor(file.name);
                return (
                  <div key={i} className="relative group">
                    <div
                      className={`${iconColorClass} p-1`}
                      title={getCleanFileName(file.name)}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-3 h-3 flex items-center justify-center"
                      title="Remove file"
                    >
                      <span className="text-xs font-bold leading-none">×</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Issue"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
