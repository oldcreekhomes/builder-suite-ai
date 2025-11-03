import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CalendarIcon, Lock, Unlock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAccountingPeriods } from "@/hooks/useAccountingPeriods";
import { useCloseBookPermissions } from "@/hooks/useCloseBookPermissions";
import { Badge } from "@/components/ui/badge";

interface CloseBooksPeriodManagerProps {
  projectId: string;
}

export function CloseBooksPeriodManager({ projectId }: CloseBooksPeriodManagerProps) {
  const { periods, closePeriod, reopenPeriod, isClosing, isReopening } = useAccountingPeriods(projectId);
  const { canCloseBooks } = useCloseBookPermissions();
  
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [closureNotes, setClosureNotes] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");

  const handleClosePeriod = () => {
    if (!selectedDate) return;
    
    closePeriod({
      projectId,
      periodEndDate: format(selectedDate, 'yyyy-MM-dd'),
      closureNotes: closureNotes.trim() || undefined,
    });
    
    setShowCloseDialog(false);
    setSelectedDate(undefined);
    setClosureNotes("");
  };

  const handleReopenPeriod = () => {
    if (!reopenReason.trim()) return;
    
    reopenPeriod({
      periodId: selectedPeriodId,
      reopenReason: reopenReason.trim(),
    });
    
    setShowReopenDialog(false);
    setReopenReason("");
    setSelectedPeriodId("");
  };

  if (!canCloseBooks) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Close the Books</CardTitle>
          <CardDescription>
            You don't have permission to close accounting periods.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Close New Period Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Close Accounting Period
          </CardTitle>
          <CardDescription>
            Lock all transactions on or before the selected date. All reconciliations must be completed first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Period End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Select a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="closure-notes">Notes (Optional)</Label>
            <Textarea
              id="closure-notes"
              placeholder="Add any notes about this period closure..."
              value={closureNotes}
              onChange={(e) => setClosureNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button 
            onClick={() => setShowCloseDialog(true)}
            disabled={!selectedDate || isClosing}
            className="w-full"
          >
            <Lock className="mr-2 h-4 w-4" />
            Close Books for This Period
          </Button>
        </CardContent>
      </Card>

      {/* Existing Periods Section */}
      <Card>
        <CardHeader>
          <CardTitle>Accounting Periods</CardTitle>
          <CardDescription>
            View and manage closed accounting periods for this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!periods || periods.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No closed periods yet
            </p>
          ) : (
            <div className="space-y-3">
              {periods.map((period) => (
                <div
                  key={period.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {format(new Date(period.period_end_date), "MMMM d, yyyy")}
                      </p>
                      <Badge variant={period.status === 'closed' ? 'destructive' : 'default'}>
                        {period.status === 'closed' ? 'Closed' : 'Open'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Closed on {format(new Date(period.closed_at), "PPP 'at' p")}
                    </p>
                    {period.closure_notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {period.closure_notes}
                      </p>
                    )}
                    {period.reopened_at && (
                      <p className="text-xs text-amber-600 mt-1">
                        Reopened on {format(new Date(period.reopened_at), "PPP")} - {period.reopen_reason}
                      </p>
                    )}
                  </div>
                  
                  {period.status === 'closed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPeriodId(period.id);
                        setShowReopenDialog(true);
                      }}
                      disabled={isReopening}
                    >
                      <Unlock className="mr-2 h-4 w-4" />
                      Reopen
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Close Confirmation Dialog */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Close Accounting Period?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will lock all transactions dated on or before{" "}
                <strong>{selectedDate && format(selectedDate, "MMMM d, yyyy")}</strong>.
              </p>
              <p className="text-destructive font-medium">
                Locked transactions cannot be edited or deleted unless you reopen this period.
              </p>
              <p>
                This action will verify that all reconciliations are completed for this period.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClosePeriod}>
              Close Books
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reopen Confirmation Dialog */}
      <AlertDialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reopen Accounting Period?</AlertDialogTitle>
            <AlertDialogDescription>
              This will allow editing of previously locked transactions. A reason is required for audit purposes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="reopen-reason">Reason for Reopening *</Label>
            <Textarea
              id="reopen-reason"
              placeholder="Explain why this period needs to be reopened..."
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReopenReason("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReopenPeriod}
              disabled={!reopenReason.trim()}
            >
              Reopen Period
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
