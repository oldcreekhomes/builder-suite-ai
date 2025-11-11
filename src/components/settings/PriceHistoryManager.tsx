import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { CalendarIcon, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFileIcon, getFileIconColor } from "@/components/bidding/utils/fileIconUtils";
import { useUniversalFilePreviewContext } from "@/components/files/UniversalFilePreviewProvider";

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
  const [historicalPrice, setHistoricalPrice] = useState("");
  const [historicalDate, setHistoricalDate] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { openProjectFile } = useUniversalFilePreviewContext();

  useEffect(() => {
    if (open && costCode) {
      fetchPriceHistory();
      // Set default date to today
      setHistoricalDate(new Date());
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "File must be smaller than 50MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload PDF, DOC, DOCX, XLS, or XLSX files only",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const handleAddHistoricalPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!costCode || !historicalPrice || !historicalDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate that the date is not in the future
    const selectedDate = new Date(historicalDate);
    selectedDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate > today) {
      toast({
        title: "Invalid Date",
        description: "Cannot add price history for future dates",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let filePath: string | null = null;

      // Upload file if selected
      if (selectedFile) {
        const fileName = `price_history_${costCode.id}_${Date.now()}_${selectedFile.name}`;
        filePath = `price-history/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;
      }

      const { error } = await supabase
        .from('cost_code_price_history')
        .insert({
          cost_code_id: costCode.id,
          price: parseFloat(historicalPrice),
          changed_at: historicalDate.toISOString(),
          changed_by: user?.id,
          owner_id: costCode.owner_id,
          notes: notes.trim() || null,
          file_path: filePath,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Historical price added successfully",
      });

      // Reset form
      setHistoricalPrice("");
      setHistoricalDate(new Date());
      setNotes("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh the list
      fetchPriceHistory();
    } catch (error) {
      console.error('Error adding historical price:', error);
      toast({
        title: "Error",
        description: "Failed to add historical price",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Price History</SheetTitle>
          <SheetDescription>
            {costCode?.code} - {costCode?.name}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Add Historical Price Form */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold mb-4">Add Historical Price</h3>
            <form onSubmit={handleAddHistoricalPrice} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="historical-date">Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !historicalDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {historicalDate ? format(historicalDate, "MM/dd/yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={historicalDate}
                        onSelect={setHistoricalDate}
                        disabled={(date) => date > new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="historical-price">Price *</Label>
                  <Input
                    id="historical-price"
                    type="number"
                    step="0.01"
                    value={historicalPrice}
                    onChange={(e) => setHistoricalPrice(e.target.value)}
                    placeholder="Enter price"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this price change..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>File Attachment (Optional)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => {
                        const IconComponent = getFileIcon(selectedFile.name);
                        const iconColorClass = getFileIconColor(selectedFile.name);
                      }}
                      className={`${getFileIconColor(selectedFile.name)} transition-colors p-2 hover:scale-110`}
                      title={`${selectedFile.name}`}
                    >
                      {(() => {
                        const IconComponent = getFileIcon(selectedFile.name);
                        return <IconComponent className="h-5 w-5" />;
                      })()}
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center"
                      title="Remove file"
                    >
                      <span className="text-xs font-bold leading-none">×</span>
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4 mr-2" />
                    Attach File
                  </Button>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? "Adding..." : "Add Historical Price"}
              </Button>
            </form>
          </div>

          {/* Price History Timeline */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Price History</h3>
            
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : priceHistory.length === 0 ? (
              <div className="text-sm text-muted-foreground">No price history yet</div>
            ) : (
              <div className="space-y-3">
                {priceHistory.map((entry) => (
                  <div 
                    key={entry.id} 
                    className="rounded-lg border border-border bg-card p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">
                        ${parseFloat(entry.price.toString()).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(entry.changed_at), "MMM d, yyyy")}
                      </div>
                    </div>
                    
                    {entry.notes && (
                      <div className="text-sm text-muted-foreground">
                        {entry.notes}
                      </div>
                    )}

                    {entry.file_path && (
                      <div className="mt-2">
                        <div className="text-xs text-muted-foreground mb-1">File:</div>
                        <div className="relative inline-block">
                          <button
                            onClick={() => {
                              const fileName = entry.file_path!.split('/').pop() || 'file';
                              openProjectFile(entry.file_path!, fileName);
                            }}
                            className={`${getFileIconColor(entry.file_path)} transition-colors p-1 hover:scale-110`}
                            title={`View ${entry.file_path.split('.').pop()?.toUpperCase()} file`}
                            disabled={deletingFileId === entry.id}
                          >
                            {(() => {
                              const IconComponent = getFileIcon(entry.file_path!);
                              return <IconComponent className="h-4 w-4" />;
                            })()}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHistoricalFile(entry.id, entry.file_path!);
                            }}
                            className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-3 h-3 flex items-center justify-center"
                            title="Delete file"
                            type="button"
                            disabled={deletingFileId === entry.id}
                          >
                            <span className="text-xs font-bold leading-none">×</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
