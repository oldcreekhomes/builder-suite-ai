import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { useIssueMutations } from "@/hooks/useIssueMutations";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AddIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: string;
}


export function AddIssueDialog({ open, onOpenChange, category }: AddIssueDialogProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"Normal" | "High">("Normal");
  const [location, setLocation] = useState<string>("");
  const [issueFiles, setIssueFiles] = useState<File[]>([]);
  const [solutionFiles, setSolutionFiles] = useState<File[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { createIssue, updateIssue } = useIssueMutations();
  const { toast } = useToast();

  const reset = () => {
    setTitle("");
    setPriority("Normal");
    setLocation("");
    setIssueFiles([]);
    setSolutionFiles([]);
    setComment("");
  };

  const pickFiles = (setter: React.Dispatch<React.SetStateAction<File[]>>) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      setter((prev) => [...prev, ...files]);
    };
    input.click();
  };

  const removeFile = (setter: React.Dispatch<React.SetStateAction<File[]>>, index: number) => {
    setter((prev) => prev.filter((_, i) => i !== index));
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

  const uploadSolutionFiles = async (issueId: string): Promise<string[]> => {
    const paths: string[] = [];
    for (const file of solutionFiles) {
      const sanitized = file.name
        .replace(/\s+/g, "_")
        .replace(/[^\w.-]/g, "_")
        .replace(/_+/g, "_");
      const fileName = `${Date.now()}-${sanitized}`;
      const filePath = `issue-solutions/${issueId}/${fileName}`;
      const { error } = await supabase.storage.from("issue-files").upload(filePath, file);
      if (error) throw error;
      paths.push(filePath);
    }
    return paths;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const missing: string[] = [];
    if (!title.trim()) missing.push("Title");
    if (!priority) missing.push("Priority");
    if (issueFiles.length === 0) missing.push("Issue Files");
    if (!location) missing.push("Location");
    if (solutionFiles.length === 0) missing.push("Solution Files");
    if (!comment.trim()) missing.push("Comment");

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
        location,
      });

      await uploadIssueFiles(newIssue.id);
      const solutionPaths = await uploadSolutionFiles(newIssue.id);

      await updateIssue.mutateAsync({
        id: newIssue.id,
        solution: comment.trim(),
        solution_files: solutionPaths,
      });

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

  const FileList = ({
    files,
    onRemove,
  }: {
    files: File[];
    onRemove: (i: number) => void;
  }) =>
    files.length === 0 ? null : (
      <div className="flex flex-wrap gap-2 mt-2">
        {files.map((f, i) => (
          <div
            key={i}
            className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded"
          >
            <span className="max-w-[180px] truncate">{f.name}</span>
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    );

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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => pickFiles(setIssueFiles)}
            >
              Add Files
            </Button>
            <FileList files={issueFiles} onRemove={(i) => removeFile(setIssueFiles, i)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger id="location">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_OPTIONS.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Solution Files *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => pickFiles(setSolutionFiles)}
            >
              Add Files
            </Button>
            <FileList
              files={solutionFiles}
              onRemove={(i) => removeFile(setSolutionFiles, i)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comment *</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a comment explaining the resolution..."
              className="min-h-[100px]"
            />
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
