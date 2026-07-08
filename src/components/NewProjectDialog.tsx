
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { supabase } from "@/integrations/supabase/client";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallDialog } from "./PaywallDialog";
import { SERVICE_AREA_OPTIONS } from "@/lib/serviceArea";
import {
  LocalLotManagementSection,
  type LocalLot,
} from "./projects/LocalLotManagementSection";
import {
  NewProjectNotificationsMatrix,
  emptyNotificationSelection,
  getMissingPrimaryChannels,
  buildRecipientRows,
  type ChannelKey,
  type NotificationSelection,
} from "./projects/NewProjectNotificationsMatrix";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  const [address, setAddress] = useState("");
  const [region, setRegion] = useState<string>("");
  const [constructionManager, setConstructionManager] = useState("");
  const [accountingManager, setAccountingManager] = useState("");
  const [apartmentsEnabled, setApartmentsEnabled] = useState<"yes" | "no">("no");
  const [status, setStatus] = useState("");
  const [accountingSoftware, setAccountingSoftware] = useState("quickbooks");
  const [lots, setLots] = useState<LocalLot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "notifications">("info");
  const [notifications, setNotifications] = useState<NotificationSelection>(
    emptyNotificationSelection()
  );
  const [missingChannels, setMissingChannels] = useState<Set<ChannelKey>>(new Set());
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { users, isLoading: usersLoading } = useCompanyUsers();
  const { needsSubscription, projectCount } = useSubscription();

  const resetForm = () => {
    setAddress("");
    setRegion("");
    setConstructionManager("");
    setAccountingManager("");
    setApartmentsEnabled("no");
    setStatus("");
    setAccountingSoftware("quickbooks");
    setLots([]);
    setHasAttemptedSave(false);
    setNotifications(emptyNotificationSelection());
    setMissingChannels(new Set());
    setActiveTab("info");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!status || !constructionManager || !address || !accountingManager) {
      setHasAttemptedSave(true);
      setActiveTab("info");
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const missing = getMissingPrimaryChannels(notifications);
    if (missing.size > 0) {
      setMissingChannels(missing);
      setActiveTab("notifications");
      toast({
        title: "Missing primary contacts",
        description: "Please select a primary contact (star) for all 5 notification types.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a project",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      let owner_id = user.id;
      if (profile && profile.home_builder_id) {
        owner_id = profile.home_builder_id;
      }

      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          address,
          status,
          construction_manager: constructionManager,
          accounting_manager: accountingManager,
          accounting_software: accountingSoftware,
          region: region || null,
          apartments_enabled: apartmentsEnabled === "yes",
          total_lots: lots.length,
          owner_id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating project:", error);
        toast({
          title: "Error",
          description: "Failed to create project. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Insert lots
      if (lots.length > 0) {
        const lotRows = lots.map((l) => ({
          project_id: project.id,
          lot_number: l.lot_number,
          lot_name: l.lot_name ?? null,
        }));
        const { error: lotsError } = await supabase.from("project_lots").insert(lotRows);
        if (lotsError) {
          console.error("Error inserting lots:", lotsError);
          toast({
            title: "Project created, but lots failed to save",
            description: lotsError.message,
            variant: "destructive",
          });
        }
      }

      // Persist notification recipients
      const rows = buildRecipientRows(project.id, notifications);
      if (rows.length > 0) {
        const { error: notifError } = await supabase
          .from("project_notification_recipients")
          .upsert(rows as any, { onConflict: "project_id,user_id" });
        if (notifError) {
          console.error("Error saving notification recipients:", notifError);
          toast({
            title: "Project created, but notifications failed to save",
            description: notifError.message,
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Success",
        description: "Project created successfully!",
      });

      resetForm();
      onOpenChange(false);
      navigate(`/project/${project.id}`);
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  if (needsSubscription && open) {
    return (
      <PaywallDialog
        open={open}
        onOpenChange={onOpenChange}
        projectCount={projectCount}
      />
    );
  }

  const usersDisabled = isLoading || usersLoading;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Fill in the project details and select notification recipients.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "info" | "notifications")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Project Information</TabsTrigger>
              <TabsTrigger value="notifications">
                Notifications
                {missingChannels.size > 0 && <span className="ml-2 text-red-500">•</span>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="grid grid-cols-8 gap-4">
                <div className="col-span-5 space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <AddressAutocomplete
                    id="address"
                    value={address}
                    onChange={setAddress}
                    placeholder="Enter project address"
                    disabled={isLoading}
                    className={hasAttemptedSave && !address ? "text-red-500 placeholder:text-red-400" : ""}
                  />
                </div>
                <div className="col-span-3 space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Select
                    value={region || "no-region"}
                    onValueChange={(value) => setRegion(value === "no-region" ? "" : value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-region">No Region</SelectItem>
                      {SERVICE_AREA_OPTIONS.map((area) => (
                        <SelectItem key={area} value={area}>{area}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="constructionManager">Construction Manager</Label>
                  <Select
                    value={constructionManager}
                    onValueChange={setConstructionManager}
                    disabled={usersDisabled}
                  >
                    <SelectTrigger className={hasAttemptedSave && !constructionManager ? "text-red-500" : ""}>
                      <SelectValue placeholder={usersLoading ? "Loading users..." : "Select construction manager"} />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {`${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountingManager">Accounting Manager</Label>
                  <Select
                    value={accountingManager}
                    onValueChange={setAccountingManager}
                    disabled={usersDisabled}
                  >
                    <SelectTrigger className={hasAttemptedSave && !accountingManager ? "text-red-500" : ""}>
                      <SelectValue placeholder={usersLoading ? "Loading users..." : "Select accounting manager"} />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {`${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apartments">Apartments</Label>
                  <Select
                    value={apartmentsEnabled}
                    onValueChange={(v) => setApartmentsEnabled(v as "yes" | "no")}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={setStatus} disabled={isLoading}>
                    <SelectTrigger className={hasAttemptedSave && !status ? "text-red-500" : ""}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="In Design">In Design</SelectItem>
                      <SelectItem value="Permitting">Permitting</SelectItem>
                      <SelectItem value="Under Construction">Under Construction</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountingSoftware">Accounting Software</Label>
                  <Select
                    value={accountingSoftware}
                    onValueChange={setAccountingSoftware}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quickbooks">QuickBooks</SelectItem>
                      <SelectItem value="builder_suite">Builder Suite</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <LocalLotManagementSection lots={lots} onChange={setLots} />
            </TabsContent>

            <TabsContent value="notifications" className="mt-4">
              <NewProjectNotificationsMatrix
                value={notifications}
                onChange={(next) => {
                  setNotifications(next);
                  if (missingChannels.size > 0) {
                    setMissingChannels(getMissingPrimaryChannels(next));
                  }
                }}
                missingChannels={missingChannels}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-black hover:bg-gray-800"
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
