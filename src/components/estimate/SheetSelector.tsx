import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, FileText, Trash2 } from "lucide-react";
import { UploadSheetDialog } from "./UploadSheetDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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

interface SheetSelectorProps {
  takeoffId: string;
  selectedSheetId: string | null;
  onSelectSheet: (sheetId: string | null) => void;
}

export function SheetSelector({ takeoffId, selectedSheetId, onSelectSheet }: SheetSelectorProps) {
  const { user } = useAuth();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sheetToDelete, setSheetToDelete] = useState<string | null>(null);

  const { data: sheets, refetch } = useQuery({
    queryKey: ['takeoff-sheets', takeoffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('takeoff_sheets')
        .select('*')
        .eq('takeoff_project_id', takeoffId)
        .order('page_number', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!takeoffId && !!user,
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSheetToDelete(id);
    setDeleteDialogOpen(true);
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
      
      toast.success('Sheet deleted');
      refetch();
    } catch (error) {
      console.error('Error deleting sheet:', error);
      toast.error('Failed to delete sheet');
    } finally {
      setDeleteDialogOpen(false);
      setSheetToDelete(null);
    }
  };

  return (
    <div className="flex flex-col h-full border-r bg-muted/10">
      <div className="p-4 border-b">
        <h3 className="font-medium mb-2">Drawing Sheets</h3>
        <Button 
          size="sm" 
          className="w-full"
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
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
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
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-accent"
                )}
                onClick={() => onSelectSheet(sheet.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sheet.name}</p>
                  {sheet.drawing_scale && (
                    <p className="text-xs opacity-80 truncate">
                      Scale: {sheet.drawing_scale}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDelete(sheet.id, e)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <UploadSheetDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        takeoffId={takeoffId}
        onSuccess={() => {
          refetch();
          setUploadDialogOpen(false);
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
    </div>
  );
}
