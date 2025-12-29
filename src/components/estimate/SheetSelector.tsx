import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, FileText, Trash2, Pencil } from "lucide-react";
import { UploadSheetDialog } from "./UploadSheetDialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SheetSelectorProps {
  takeoffId: string;
  selectedSheetId: string | null;
  onSelectSheet: (sheetId: string | null) => void;
  onItemsExtracted?: (sheetIds: string[], itemIds: string[]) => void;
}

const COMMON_SCALES = [
  "1/16\" = 1'-0\"",
  "3/32\" = 1'-0\"",
  "1/8\" = 1'-0\"",
  "3/16\" = 1'-0\"",
  "1/4\" = 1'-0\"",
  "3/8\" = 1'-0\"",
  "1/2\" = 1'-0\"",
  "3/4\" = 1'-0\"",
  "1\" = 1'-0\"",
  "1-1/2\" = 1'-0\"",
  "3\" = 1'-0\"",
  "AS NOTED",
  "NTS",
];

export function SheetSelector({ takeoffId, selectedSheetId, onSelectSheet, onItemsExtracted }: SheetSelectorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sheetToDelete, setSheetToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [sheetToEdit, setSheetToEdit] = useState<{ id: string; name: string; drawing_scale: string | null } | null>(null);
  const [editFormData, setEditFormData] = useState({ sheet_number: '', sheet_title: '', scale: '' });
  const [isSaving, setIsSaving] = useState(false);

  const { data: sheets, refetch } = useQuery({
    queryKey: ['takeoff-sheets', takeoffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('takeoff_sheets')
        .select('*')
        .eq('takeoff_project_id', takeoffId);

      if (error) throw error;
      
      // Sort alphanumerically by name (e.g., A1, A2, A3, E1, S1, SP)
      return data?.sort((a, b) => {
        const nameA = a.name || '';
        const nameB = b.name || '';
        
        // Extract letter prefix and number
        const matchA = nameA.match(/^([A-Za-z]+)(\d*)(.*)$/);
        const matchB = nameB.match(/^([A-Za-z]+)(\d*)(.*)$/);
        
        if (!matchA && !matchB) return nameA.localeCompare(nameB);
        if (!matchA) return 1;
        if (!matchB) return -1;
        
        // Compare letter prefix first
        const letterCompare = matchA[1].localeCompare(matchB[1]);
        if (letterCompare !== 0) return letterCompare;
        
        // Then compare numbers numerically
        const numA = matchA[2] ? parseInt(matchA[2], 10) : 0;
        const numB = matchB[2] ? parseInt(matchB[2], 10) : 0;
        if (numA !== numB) return numA - numB;
        
        // Finally compare any suffix
        return (matchA[3] || '').localeCompare(matchB[3] || '');
      });
    },
    enabled: !!takeoffId && !!user,
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSheetToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleEdit = (sheet: { id: string; name: string; drawing_scale: string | null }, e: React.MouseEvent) => {
    e.stopPropagation();
    // Parse the name to extract sheet number and title (format: "A1-Ground Floor Plan" or "A1 Ground Floor Plan")
    const name = sheet.name || '';
    const match = name.match(/^([A-Za-z0-9]+)[\s-]+(.*)$/);
    const sheetNumber = match ? match[1] : name;
    const sheetTitle = match ? match[2] : '';
    
    setSheetToEdit(sheet);
    setEditFormData({
      sheet_number: sheetNumber,
      sheet_title: sheetTitle,
      scale: sheet.drawing_scale || '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!sheetToEdit) return;
    setIsSaving(true);

    try {
      const newName = editFormData.sheet_title 
        ? `${editFormData.sheet_number}-${editFormData.sheet_title}`
        : editFormData.sheet_number;

      const { error } = await supabase
        .from('takeoff_sheets')
        .update({
          name: newName,
          drawing_scale: editFormData.scale || null,
        })
        .eq('id', sheetToEdit.id);

      if (error) throw error;

      toast({ title: "Success", description: "Sheet updated" });
      refetch();
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating sheet:', error);
      toast({ title: "Error", description: "Failed to update sheet", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!sheetToDelete) return;

    try {
      const { error } = await supabase
        .from('takeoff_sheets')
        .delete()
        .eq('id', sheetToDelete);

      if (error) throw error;
      
      if (selectedSheetId === sheetToDelete) {
        onSelectSheet(null);
      }
      
      toast({ title: "Success", description: "Sheet deleted" });
      refetch();
    } catch (error) {
      console.error('Error deleting sheet:', error);
      toast({ title: "Error", description: "Failed to delete sheet", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setSheetToDelete(null);
    }
  };

  return (
    <div className="flex flex-col h-full border-r bg-muted/10">
      <div className="px-4 py-3 border-b flex items-center justify-between min-h-16">
        <h3 className="font-medium leading-tight">
          <span className="block">Drawing</span>
          <span className="block">Sheets</span>
        </h3>
        <Button 
          size="sm" 
          className="h-10"
          onClick={() => setUploadDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Upload Sheet
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {!sheets || sheets.length === 0 ? (
            <div className="text-center py-8 px-4">
              <FileText className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No sheets uploaded yet
              </p>
            </div>
          ) : (
            sheets.map((sheet) => (
              <div
                key={sheet.id}
                className={cn(
                  "group flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors",
                  selectedSheetId === sheet.id 
                    ? "bg-accent border-l-2 border-primary" 
                    : "hover:bg-accent"
                )}
                onClick={() => onSelectSheet(sheet.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sheet.name}</p>
                  {sheet.drawing_scale && (
                    <p className="text-xs text-muted-foreground truncate">
                      Scale: {sheet.drawing_scale}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleEdit(sheet, e)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDelete(sheet.id, e)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <UploadSheetDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        takeoffId={takeoffId}
        onSuccess={(sheetIds, itemIds) => {
          console.log('📤 Upload success callback:', { sheetIds, itemIds });
          refetch();
          if (onItemsExtracted && itemIds.length > 0) {
            onItemsExtracted(sheetIds, itemIds);
          }
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this sheet?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the sheet
              and remove it from the project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Sheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sheet_number">Sheet #</Label>
              <Input
                id="sheet_number"
                value={editFormData.sheet_number}
                onChange={(e) => setEditFormData(prev => ({ ...prev, sheet_number: e.target.value }))}
                placeholder="e.g., A1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheet_title">Title</Label>
              <Input
                id="sheet_title"
                value={editFormData.sheet_title}
                onChange={(e) => setEditFormData(prev => ({ ...prev, sheet_title: e.target.value }))}
                placeholder="e.g., Ground Floor Plan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scale">Scale</Label>
              <Select
                value={editFormData.scale}
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, scale: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select scale" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_SCALES.map((scale) => (
                    <SelectItem key={scale} value={scale}>
                      {scale}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
