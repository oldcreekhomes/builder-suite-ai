import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { getFileIcon, getFileIconColor } from "@/components/bidding/utils/fileIconUtils";
import { useUniversalFilePreviewContext } from "@/components/files/UniversalFilePreviewProvider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type CostCode = Tables<'cost_codes'>;
type PriceHistory = Tables<'cost_code_price_history'>;

interface PriceHistoryManagerProps {
  costCode: CostCode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PriceHistoryManager({ costCode, open, onOpenChange }: PriceHistoryManagerProps) {
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const { toast } = useToast();
  const { openProjectFile } = useUniversalFilePreviewContext();

  useEffect(() => {
    if (open && costCode) {
      fetchPriceHistory();
    }
  }, [open, costCode]);

  const fetchPriceHistory = async () => {
    if (!costCode) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cost_code_price_history')
        .select('*')
        .eq('cost_code_id', costCode.id)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setPriceHistory(data || []);
    } catch (error) {
      console.error('Error fetching price history:', error);
      toast({
        title: "Error",
        description: "Failed to load price history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistoricalFile = async (historyId: string, filePath: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    setDeletingFileId(historyId);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('project-files')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Update database record
      const { error: dbError } = await supabase
        .from('cost_code_price_history')
        .update({ file_path: null })
        .eq('id', historyId);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "File deleted successfully",
      });

      fetchPriceHistory();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    } finally {
      setDeletingFileId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Price History</SheetTitle>
          <SheetDescription>
            {costCode?.code} - {costCode?.name}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : priceHistory.length === 0 ? (
            <div className="text-sm text-muted-foreground">No price history yet</div>
          ) : (
            <div className="space-y-1">
              {priceHistory.map((entry) => (
                <div 
                  key={entry.id} 
                  className="flex items-center gap-3 py-2 px-2 rounded hover:bg-muted/50"
                >
                  {/* Price */}
                  <div className="text-sm font-medium w-24 shrink-0">
                    ${parseFloat(entry.price.toString()).toFixed(2)}
                  </div>
                  
                  {/* Date */}
                  <div className="text-xs text-muted-foreground w-24 shrink-0">
                    {format(new Date(entry.changed_at), "MMM d, yyyy")}
                  </div>
                  
                  {/* Notes - truncated */}
                  <div className="text-xs text-muted-foreground flex-1 truncate min-w-0">
                    {entry.notes && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">{entry.notes}</span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{entry.notes}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  {/* File icon */}
                  {entry.file_path && (
                    <div className="relative shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => {
                              const fileName = entry.file_path!.split('/').pop() || 'file';
                              openProjectFile(entry.file_path!, fileName);
                            }}
                            className={`${getFileIconColor(entry.file_path)} transition-colors hover:scale-110`}
                            disabled={deletingFileId === entry.id}
                          >
                            {(() => {
                              const IconComponent = getFileIcon(entry.file_path!);
                              return <IconComponent className="h-4 w-4" />;
                            })()}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View {entry.file_path.split('.').pop()?.toUpperCase()} file</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHistoricalFile(entry.id, entry.file_path!);
                            }}
                            className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-3 h-3 flex items-center justify-center"
                            type="button"
                            disabled={deletingFileId === entry.id}
                          >
                            <span className="text-xs font-bold leading-none">×</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete file</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
