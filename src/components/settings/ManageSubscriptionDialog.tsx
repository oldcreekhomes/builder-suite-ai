import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  CreditCard,
  Mail,
  FileText,
  ExternalLink,
  Loader2,
  Calendar,
  Crown,
  AlertTriangle,
} from "lucide-react";

interface ManageSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SubscriptionDetails {
  subscription: {
    id: string;
    status: string;
    plan_name: string;
    interval: string;
    quantity: number;
    unit_amount: number;
    total_amount: number;
    current_period_end: string;
    cancel_at_period_end: boolean;
  } | null;
  paymentMethod: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  } | null;
  billingEmail: string;
  invoices: Array<{
    id: string;
    date: string;
    amount: number;
    status: string;
    description: string;
    invoice_pdf: string | null;
  }>;
}

export function ManageSubscriptionDialog({
  open,
  onOpenChange,
}: ManageSubscriptionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const { data, isLoading, error } = useQuery<SubscriptionDetails>({
    queryKey: ["subscription-details"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "get-subscription-details"
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    enabled: open,
  });

  const handleCancel = async () => {
    if (!data?.subscription?.id) return;
    setCanceling(true);
    try {
      const { data: result, error } = await supabase.functions.invoke(
        "cancel-subscription",
        { body: { subscription_id: data.subscription.id } }
      );
      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      toast({
        title: "Subscription canceled",
        description: `Your subscription will remain active until ${format(new Date(data.subscription.current_period_end), "MMM d, yyyy")}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["subscription-details"] });
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      setCancelDialogOpen(false);
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    } finally {
      setCanceling(false);
    }
  };

  const brandIcon = (brand: string) => {
    const b = brand?.toLowerCase();
    if (b === "visa") return "💳";
    if (b === "mastercard") return "💳";
    if (b === "amex") return "💳";
    return "💳";
  };

  const invoiceStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Paid
          </Badge>
        );
      case "open":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            Open
          </Badge>
        );
      case "void":
        return <Badge variant="secondary">Void</Badge>;
      case "uncollectible":
        return <Badge variant="destructive">Uncollectible</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Manage Subscription
            </DialogTitle>
          </DialogHeader>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-destructive">
              <p>Failed to load subscription details.</p>
              <p className="text-sm text-muted-foreground mt-1">
                {(error as Error).message}
              </p>
            </div>
          )}

          {data && !isLoading && (
            <div className="space-y-5">
              {/* Current Subscription */}
              {data.subscription && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Current Subscription
                  </h3>
                  <div className="rounded-lg border p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        BuilderSuite Pro –{" "}
                        {data.subscription.interval === "year"
                          ? "Annual"
                          : "Monthly"}{" "}
                        (×{data.subscription.quantity})
                      </span>
                      {data.subscription.cancel_at_period_end && (
                        <Badge variant="destructive">Canceling</Badge>
                      )}
                    </div>
                    <div className="text-lg font-bold">
                      ${data.subscription.total_amount.toFixed(2)}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        per{" "}
                        {data.subscription.interval === "year"
                          ? "year"
                          : "month"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {data.subscription.cancel_at_period_end
                        ? "Access until: "
                        : "Next billing date: "}
                      {data.subscription.current_period_end
                        ? format(
                            new Date(data.subscription.current_period_end),
                            "MMMM d, yyyy"
                          )
                        : "—"}
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Payment Method */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Payment Method
                </h3>
                {data.paymentMethod ? (
                  <div className="rounded-lg border p-4 flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <span className="font-medium capitalize">
                        {data.paymentMethod.brand}
                      </span>{" "}
                      •••• {data.paymentMethod.last4}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Expires {String(data.paymentMethod.exp_month).padStart(2, "0")}/
                      {data.paymentMethod.exp_year}
                    </span>
                    <Badge variant="outline">Default</Badge>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No payment method on file.
                  </p>
                )}
              </div>

              <Separator />

              {/* Billing Information */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Billing Information
                </h3>
                <div className="rounded-lg border p-4 flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">{data.billingEmail}</span>
                </div>
              </div>

              <Separator />

              {/* Invoice History */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Invoice History
                </h3>
                {data.invoices.length > 0 ? (
                  <div className="rounded-lg border divide-y">
                    {data.invoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center gap-2 p-3 text-sm"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground text-xs shrink-0">
                          {inv.date
                            ? format(new Date(inv.date), "MMM d, yyyy")
                            : "—"}
                        </span>
                        <span className="font-medium shrink-0">
                          ${inv.amount.toFixed(2)}
                        </span>
                        <span className="shrink-0">
                          {invoiceStatusBadge(inv.status || "unknown")}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-muted-foreground text-xs">
                          {inv.description}
                        </span>
                        {inv.invoice_pdf && (
                          <a
                            href={inv.invoice_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 shrink-0"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No invoices yet.
                  </p>
                )}
              </div>

              {/* Cancel */}
              {data.subscription && !data.subscription.cancel_at_period_end && (
                <>
                  <Separator />
                  <div className="flex justify-end">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setCancelDialogOpen(true)}
                    >
                      Cancel Subscription
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancel Subscription
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will remain active until{" "}
              {data?.subscription?.current_period_end
                ? format(
                    new Date(data.subscription.current_period_end),
                    "MMMM d, yyyy"
                  )
                : "the end of the billing period"}
              . After that, you'll be limited to 3 free projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={canceling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {canceling && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
