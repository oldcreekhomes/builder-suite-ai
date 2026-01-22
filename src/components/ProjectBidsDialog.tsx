import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, FileText } from "lucide-react";
import { usePMBidNotifications, BidNotification } from "@/hooks/usePMBidNotifications";
import { useDismissBidNotification } from "@/hooks/useDismissBidNotification";
import { useUniversalFilePreviewContext } from "@/components/files/UniversalFilePreviewProvider";
import { format } from "date-fns";

interface ProjectBidsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  projectAddress: string;
}

export function ProjectBidsDialog({
  open,
  onOpenChange,
  projectId,
  projectAddress,
}: ProjectBidsDialogProps) {
  const { data } = usePMBidNotifications();
  const dismissMutation = useDismissBidNotification();
  const { openProposalFile } = useUniversalFilePreviewContext();

  const notifications = data?.notifications || [];

  // Filter notifications for this project
  const projectNotifications = notifications.filter(
    (n) => n.projectId === projectId
  );

  const willBidNotifications = projectNotifications.filter(
    (n) => n.bidStatus === "will_bid"
  );
  const submittedNotifications = projectNotifications.filter(
    (n) => n.bidStatus === "submitted"
  );

  const handleDismiss = (bidId: string, type: "will_bid" | "submitted") => {
    dismissMutation.mutate({ bidId, type });
  };

  const handleViewProposal = (proposals: string[] | null) => {
    if (!proposals || proposals.length === 0) return;
    
    // Get the first file
    const fileName = proposals[0];
    openProposalFile(fileName);
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Get street address only
  const streetAddress = projectAddress
    ? projectAddress.split(",")[0]
    : "Project";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Bid Notifications - {streetAddress}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Will Bid Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-medium text-sm">Confirmed to Bid</h3>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-700"
                >
                  {willBidNotifications.length}
                </Badge>
              </div>

              {willBidNotifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pending confirmations
                </p>
              ) : (
                <div className="space-y-2">
                  {willBidNotifications.map((notification) => (
                    <NotificationRow
                      key={notification.bidId}
                      notification={notification}
                      onDismiss={() =>
                        handleDismiss(notification.bidId, "will_bid")
                      }
                      isDismissing={dismissMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Submitted Bids Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-medium text-sm">Bids Received</h3>
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-700"
                >
                  {submittedNotifications.length}
                </Badge>
              </div>

              {submittedNotifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pending bids
                </p>
              ) : (
                <div className="space-y-2">
                  {submittedNotifications.map((notification) => (
                    <SubmittedBidRow
                      key={notification.bidId}
                      notification={notification}
                      onDismiss={() =>
                        handleDismiss(notification.bidId, "submitted")
                      }
                      onViewProposal={() =>
                        handleViewProposal(notification.proposals)
                      }
                      formatPrice={formatPrice}
                      isDismissing={dismissMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface NotificationRowProps {
  notification: BidNotification;
  onDismiss: () => void;
  isDismissing: boolean;
}

function NotificationRow({
  notification,
  onDismiss,
  isDismissing,
}: NotificationRowProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{notification.companyName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {notification.costCodeName}
        </p>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <span className="text-xs text-muted-foreground">
          {format(new Date(notification.updatedAt), "MMM d")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onDismiss}
          disabled={isDismissing}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface SubmittedBidRowProps {
  notification: BidNotification;
  onDismiss: () => void;
  onViewProposal: () => void;
  formatPrice: (price: number | null) => string;
  isDismissing: boolean;
}

function SubmittedBidRow({
  notification,
  onDismiss,
  onViewProposal,
  formatPrice,
  isDismissing,
}: SubmittedBidRowProps) {
  const hasProposal =
    notification.proposals && notification.proposals.length > 0;

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{notification.companyName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {notification.costCodeName}
        </p>
      </div>
      <div className="flex items-center gap-3 ml-4">
        <span className="text-sm font-medium text-foreground">
          {formatPrice(notification.price)}
        </span>
        {hasProposal && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onViewProposal}
            title="View Proposal"
          >
            <FileText className="h-4 w-4 text-primary" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onDismiss}
          disabled={isDismissing}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
