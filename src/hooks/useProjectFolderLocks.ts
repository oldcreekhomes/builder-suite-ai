import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

export interface FolderLock {
  id: string;
  project_id: string;
  folder_path: string;
  locked_by: string;
  created_at: string;
}

export interface FolderAccessGrant {
  id: string;
  project_id: string;
  folder_path: string;
  user_id: string;
  granted_by: string;
  created_at: string;
}

export const useProjectFolderLocks = (projectId: string) => {
  const { user } = useAuth();

  const locksQuery = useQuery({
    queryKey: ['project-folder-locks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_folder_locks')
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      return (data || []) as FolderLock[];
    },
    enabled: !!user && !!projectId,
  });

  const grantsQuery = useQuery({
    queryKey: ['project-folder-access-grants', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_folder_access_grants')
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      return (data || []) as FolderAccessGrant[];
    },
    enabled: !!user && !!projectId,
  });

  const locks = locksQuery.data || [];
  const grants = grantsQuery.data || [];

  const isFolderLocked = (folderPath: string): boolean => {
    return locks.some(lock => 
      folderPath === lock.folder_path || folderPath.startsWith(lock.folder_path + '/')
    );
  };

  const isFolderDirectlyLocked = (folderPath: string): boolean => {
    return locks.some(lock => lock.folder_path === folderPath);
  };

  const canAccessFolder = (folderPath: string, userId: string, isOwner: boolean): boolean => {
    if (isOwner) return true;
    if (!isFolderLocked(folderPath)) return true;
    // Check if user has a grant for this folder or any parent locked folder
    return grants.some(grant => 
      grant.user_id === userId && (
        folderPath === grant.folder_path || folderPath.startsWith(grant.folder_path + '/')
      )
    );
  };

  return {
    locks,
    grants,
    isLoading: locksQuery.isLoading || grantsQuery.isLoading,
    isFolderLocked,
    isFolderDirectlyLocked,
    canAccessFolder,
  };
};

export const useLockFolder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, folderPath }: { projectId: string; folderPath: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('project_folder_locks')
        .insert({ project_id: projectId, folder_path: folderPath, locked_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-folder-locks', variables.projectId] });
      toast({ title: "Folder Locked", description: "Only you can see this folder now. Grant access to specific employees as needed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to lock folder", variant: "destructive" });
    },
  });
};

export const useUnlockFolder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, folderPath }: { projectId: string; folderPath: string }) => {
      // Delete the lock
      const { error: lockError } = await supabase
        .from('project_folder_locks')
        .delete()
        .eq('project_id', projectId)
        .eq('folder_path', folderPath);
      if (lockError) throw lockError;
      // Delete all grants for this folder
      const { error: grantsError } = await supabase
        .from('project_folder_access_grants')
        .delete()
        .eq('project_id', projectId)
        .eq('folder_path', folderPath);
      if (grantsError) throw grantsError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-folder-locks', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-folder-access-grants', variables.projectId] });
      toast({ title: "Folder Unlocked", description: "This folder is now visible to all team members." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to unlock folder", variant: "destructive" });
    },
  });
};

export const useGrantFolderAccess = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, folderPath, userId }: { projectId: string; folderPath: string; userId: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('project_folder_access_grants')
        .insert({ project_id: projectId, folder_path: folderPath, user_id: userId, granted_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-folder-access-grants', variables.projectId] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to grant access", variant: "destructive" });
    },
  });
};

export const useRevokeFolderAccess = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ projectId, folderPath, userId }: { projectId: string; folderPath: string; userId: string }) => {
      const { error } = await supabase
        .from('project_folder_access_grants')
        .delete()
        .eq('project_id', projectId)
        .eq('folder_path', folderPath)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-folder-access-grants', variables.projectId] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to revoke access", variant: "destructive" });
    },
  });
};
