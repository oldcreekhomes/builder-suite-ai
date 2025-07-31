import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIssueMutations } from "@/hooks/useIssueMutations";
import { useToast } from "@/hooks/use-toast";
import { CompanyIssue } from "@/hooks/useCompanyIssues";

interface EditIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issue: CompanyIssue;
}

export function EditIssueDialog({ open, onOpenChange, issue }: EditIssueDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Normal");
  const { updateIssue } = useIssueMutations();
  const { toast } = useToast();

  useEffect(() => {
    if (issue) {
      setTitle(issue.title);
      setDescription(issue.description || "");
      setPriority(issue.priority);
    }
  }, [issue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title for the issue",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateIssue.mutateAsync({
        id: issue.id,
        title: title.trim(),
        description: description.trim() || null,
        priority: priority as "Normal" | "High",
      });

      toast({
        title: "Success",
        description: "Issue updated successfully",
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update issue",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Issue</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter issue title..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateIssue.isPending}
            >
              {updateIssue.isPending ? "Updating..." : "Update Issue"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}