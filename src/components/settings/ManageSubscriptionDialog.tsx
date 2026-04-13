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
import { format, addDays } from "date-fns";
import {
  CreditCard,
  Mail,
  FileText,
  Download,
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
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    created: string | null;
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

/** Get the next billing date with robust fallbacks */
function getNextBillingDate(sub: SubscriptionDetails["subscription"]): Date | null {
  if (!sub) return null;
  
  // Primary: use current_period_end from Stripe
  if (sub.current_period_end) {
    const d = new Date(sub.current_period_end);
    if (!isNaN(d.getTime()) && d.getTime() > 0) return d;
  }
  
  // Fallback: compute from current_period_start + interval
  if (sub.current_period_start) {
    const start = new Date(sub.current_period_start);
    if (!isNaN(start.getTime()) && start.getTime() > 0) {
      return addDays(start, sub.interval === "year" ? 365 : 30);
    }
  }
  
  // Last resort: compute from created date + interval
  if (sub.created) {
    const created = new Date(sub.created);
    if (!isNaN(created.getTime()) && created.getTime() > 0) {
      return addDays(created, sub.interval === "year" ? 365 : 30);
    }
  }

  // Absolute fallback: 30 days from now
  return addDays(new Date(), 30);
}

/** Generate and download a simple receipt PDF */
function downloadInvoiceReceipt(invoice: SubscriptionDetails["invoices"][0], billingEmail: string) {
  const invoiceDate = invoice.date ? format(new Date(invoice.date), "MMMM d, yyyy") : "N/A";
  const amount = `$${invoice.amount.toFixed(2)}`;
  
  // Build a simple HTML receipt, render to blob, and download
  const receiptHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.id}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #1a1a1a; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
        .company { font-size: 24px; font-weight: 700; color: #2563eb; }
        .invoice-title { font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
        .invoice-id { font-size: 12px; color: #9ca3af; margin-top: 4px; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 8px; font-weight: 600; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
        .detail-label { color: #6b7280; }
        .detail-value { font-weight: 500; }
        .total-row { display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #e5e7eb; margin-top: 8px; }
        .total-label { font-weight: 600; font-size: 16px; }
        .total-value { font-weight: 700; font-size: 16px; color: #059669; }
        .status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
        .status-paid { background: #d1fae5; color: #065f46; }
        .status-open { background: #fef3c7; color: #92400e; }
        .footer { margin-top: 48px; text-align: center; color: #9ca3af; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="company">BuilderSuite</div>
          <div style="color: #6b7280; font-size: 13px; margin-top: 4px;">Subscription Invoice</div>
        </div>
        <div style="text-align: right;">
          <div class="invoice-title">Invoice</div>
          <div class="invoice-id">${invoice.id}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Invoice Details</div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${invoiceDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Status</span>
          <span class="detail-value"><span class="status ${invoice.status === 'paid' ? 'status-paid' : 'status-open'}">${(invoice.status || 'unknown').toUpperCase()}</span></span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Billing Email</span>
          <span class="detail-value">${billingEmail}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Description</div>
        <div class="detail-row">
          <span class="detail-label">${invoice.description}</span>
          <span class="detail-value">${amount}</span>
        </div>
        <div class="total-row">
          <span class="total-label">Total Paid</span>
          <span class="total-value">${amount}</span>
        </div>
      </div>

      <div class="footer">
        This is a receipt for your records. Thank you for your subscription!
      </div>
    </body>
    </html>
  `;

  // Use print-to-PDF via a hidden iframe
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);
  
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(receiptHtml);
    iframeDoc.close();
    
    // Wait for content to render then trigger print (save as PDF)
    setTimeout(() => {
      iframe.contentWindow?.print();
      // Clean up after a delay
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  }
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

      const billingDate = getNextBillingDate(data.subscription);
      toast({
        title: "Subscription canceled",
        description: billingDate
          ? `Your subscription will remain active until ${format(billingDate, "MMM d, yyyy")}.`
          : "Your subscription will remain active until the end of the billing period.",
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

  const billingDate = data?.subscription ? getNextBillingDate(data.subscription) : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg overflow-y-auto max-h-[90vh]">
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
                      {billingDate
                        ? format(billingDate, "MMMM d, yyyy")
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          title="Download Receipt"
                          onClick={() => downloadInvoiceReceipt(inv, data.billingEmail)}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
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
              {billingDate
                ? format(billingDate, "MMMM d, yyyy")
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
