import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  useGrantFolderAccess,
  useRevokeFolderAccess,
  type FolderAccessGrant,
} from '@/hooks/useProjectFolderLocks';

interface FolderAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  folderPath: string;
  grants: FolderAccessGrant[];
}

export function FolderAccessModal({
  open,
  onOpenChange,
  projectId,
  folderPath,
  grants,
}: FolderAccessModalProps) {
  const { user } = useAuth();
  const grantAccess = useGrantFolderAccess();
  const revokeAccess = useRevokeFolderAccess();

  // Fetch employees in the same company
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['company-employees-for-access', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Get current user to find home_builder_id
      const { data: currentUser } = await supabase
        .from('users')
        .select('id, home_builder_id, role')
        .eq('id', user.id)
        .single();

      if (!currentUser) return [];

      const ownerId = currentUser.role === 'owner' ? currentUser.id : currentUser.home_builder_id;
      if (!ownerId) return [];

      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role')
        .eq('home_builder_id', ownerId)
        .eq('confirmed', true)
        .neq('id', user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && open,
  });

  const folderGrants = grants.filter(g => g.folder_path === folderPath);
  const grantedUserIds = new Set(folderGrants.map(g => g.user_id));

  const handleToggle = (userId: string, currentlyGranted: boolean) => {
    if (currentlyGranted) {
      revokeAccess.mutate({ projectId, folderPath, userId });
    } else {
      grantAccess.mutate({ projectId, folderPath, userId });
    }
  };

  const folderName = folderPath.split('/').pop() || folderPath;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-red-600" />
            Manage Access — {folderName}
          </DialogTitle>
          <DialogDescription>
            Select which employees can see this locked folder and its contents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : employees.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No employees found in your company.
            </p>
          ) : (
            employees.map((emp) => {
              const isGranted = grantedUserIds.has(emp.id);
              const displayName = [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.email;
              return (
                <label
                  key={emp.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={isGranted}
                    onCheckedChange={() => handleToggle(emp.id, isGranted)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
