import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

interface Employee {
  id: string;
  home_builder_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  role: string;
  avatar_url?: string;
  confirmed: boolean;
  created_at: string;
  updated_at: string;
}

interface EditEmployeeDialogProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEmployeeDialog({ employee, open, onOpenChange }: EditEmployeeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    role: "employee",
    confirmed: false,
  });

  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        firstName: employee.first_name || "",
        lastName: employee.last_name || "",
        email: employee.email || "",
        phoneNumber: employee.phone_number || "",
        role: employee.role || "employee",
        confirmed: employee.confirmed || false,
      });
      setAvatarUrl(employee.avatar_url || "");
    }
  }, [employee]);

  const uploadAvatar = async (file: File) => {
    if (!employee) return null;

    try {
      setUploadingAvatar(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${employee.id}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const newAvatarUrl = data.publicUrl;
      
      // Update the employee with the new avatar URL
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', employee.id);

      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);
      
      toast({
        title: "Success",
        description: "Profile photo updated successfully",
      });
      
      return newAvatarUrl;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload photo",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarClick = () => {
    if (employee && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && employee) {
      await uploadAvatar(file);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const updateEmployeeMutation = useMutation({
    mutationFn: async () => {
      if (!employee) return;

      const { error } = await supabase
        .from('users')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone_number: formData.phoneNumber || null,
          confirmed: formData.confirmed,
        })
        .eq('id', employee.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update employee",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    updateEmployeeMutation.mutate();
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Photo Section */}
          <div className="flex flex-col items-center space-y-2 pb-4 border-b">
            <Label>Profile Photo</Label>
            <div className="relative group">
              <Avatar 
                className="h-20 w-20 cursor-pointer transition-all group-hover:opacity-80"
                onClick={handleAvatarClick}
              >
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-gray-200 text-gray-600 text-lg">
                  {formData.firstName && formData.lastName 
                    ? getInitials(formData.firstName, formData.lastName)
                    : 'NA'
                  }
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAvatarClick}
              disabled={uploadingAvatar}
              className="text-xs"
            >
              {uploadingAvatar ? (
                <>
                  <Upload className="h-3 w-3 mr-1 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-3 w-3 mr-1" />
                  Upload Photo
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-xs text-gray-500 text-center">
              Click the photo or upload button to change
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              disabled
              className="bg-gray-50 cursor-not-allowed"
            />
            <p className="text-sm text-gray-500">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="accountant">Accountant</SelectItem>
                <SelectItem value="construction_manager">Construction Manager</SelectItem>
                <SelectItem value="project_manager">Project Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="confirmed"
              checked={formData.confirmed}
              onCheckedChange={(checked) => setFormData({ ...formData, confirmed: checked })}
            />
            <Label htmlFor="confirmed">Employee Confirmed</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateEmployeeMutation.isPending}
            >
              {updateEmployeeMutation.isPending ? "Updating..." : "Update Employee"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}