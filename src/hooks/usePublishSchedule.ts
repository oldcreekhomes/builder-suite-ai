import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PublishScheduleData {
  daysFromToday: string;
  message?: string;
}

// Convert weeks to days for calculation
const convertWeeksToDays = (weeks: string): number => {
  const weeksNum = parseInt(weeks);
  return weeksNum * 7;
};

// Parse resources string to extract individual names
const parseResources = (resourcesText: string): string[] => {
  if (!resourcesText) return [];
  
  return resourcesText
    .split(',')
    .map(name => name.trim())
    .filter(name => name.length > 0);
};

// Match resource names to users by combining first_name and last_name
const matchResourceToUser = (resourceName: string, users: any[]): any | null => {
  const normalizedResourceName = resourceName.toLowerCase().trim();
  
  return users.find(user => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().trim();
    return fullName === normalizedResourceName;
  });
};

export const usePublishSchedule = (projectId: string) => {
  const queryClient = useQueryClient();

  const publishSchedule = useMutation({
    mutationFn: async (data: PublishScheduleData) => {
      console.log('Publishing schedule with data:', data);
      
      const daysFromToday = convertWeeksToDays(data.daysFromToday);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + daysFromToday);
      
      console.log('Looking for tasks starting within', daysFromToday, 'days from today (until', cutoffDate.toISOString(), ')');

      // 1. Get all tasks for this project that start within the specified time frame
      const { data: tasks, error: tasksError } = await supabase
        .rpc('get_project_tasks', { project_id_param: projectId });

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        throw new Error('Failed to fetch project tasks');
      }

      console.log('All project tasks:', tasks);

      // Filter tasks that overlap with the specified date range
      const upcomingTasks = tasks.filter((task: any) => {
        const taskStartDate = new Date(task.start_date);
        const taskEndDate = new Date(task.end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        
        // Task overlaps with the date range if:
        // 1. Task starts within the range, OR
        // 2. Task ends within the range, OR  
        // 3. Task spans the entire range
        return (
          (taskStartDate >= today && taskStartDate <= cutoffDate) ||
          (taskEndDate >= today && taskEndDate <= cutoffDate) ||
          (taskStartDate <= today && taskEndDate >= cutoffDate)
        );
      });

      console.log('Upcoming tasks within timeframe:', upcomingTasks);

      if (upcomingTasks.length === 0) {
        return {
          success: true,
          message: `No tasks found starting in the next ${data.daysFromToday} weeks`,
          notifiedUsers: []
        };
      }

      // 2. Extract all unique resource names from upcoming tasks
      const allResourceNames = new Set<string>();
      upcomingTasks.forEach((task: any) => {
        if (task.resources) {
          const resourceNames = parseResources(task.resources);
          resourceNames.forEach(name => allResourceNames.add(name));
        }
      });

      console.log('Unique resource names found:', Array.from(allResourceNames));

      if (allResourceNames.size === 0) {
        return {
          success: true,
          message: 'No resources assigned to upcoming tasks',
          notifiedUsers: []
        };
      }

      // 3. Get all users to match against resource names
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, company_name');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw new Error('Failed to fetch users');
      }

      console.log('All users:', users);

      // 4. Match resource names to actual users
      const matchedUsers = [];
      const unmatchedResources = [];

      for (const resourceName of allResourceNames) {
        const matchedUser = matchResourceToUser(resourceName, users);
        if (matchedUser) {
          matchedUsers.push({ resourceName, user: matchedUser });
        } else {
          unmatchedResources.push(resourceName);
        }
      }

      console.log('Matched users:', matchedUsers);
      console.log('Unmatched resources:', unmatchedResources);

      // 5. Check notification preferences for matched users
      const usersToNotify = [];
      
      if (matchedUsers.length > 0) {
        const userIds = matchedUsers.map(mu => mu.user.id);
        
        // Check company representatives for notification preferences
        const { data: representatives, error: repsError } = await supabase
          .from('company_representatives')
          .select('*')
          .in('id', userIds); // This might not work directly, we need to match by user info

        if (repsError) {
          console.error('Error fetching representatives:', repsError);
        } else {
          console.log('Representatives:', representatives);
        }

        // For now, let's check all matched users and assume they want notifications
        // In a real implementation, you'd need to link users to representatives or add
        // notification preferences directly to the users table
        for (const matchedUser of matchedUsers) {
          usersToNotify.push({
            user: matchedUser.user,
            resourceName: matchedUser.resourceName,
            tasksAssigned: upcomingTasks.filter((task: any) => 
              task.resources && parseResources(task.resources).includes(matchedUser.resourceName)
            )
          });
        }
      }

      console.log('Users to notify:', usersToNotify);

      return {
        success: true,
        message: `Found ${usersToNotify.length} users to notify about upcoming tasks`,
        notifiedUsers: usersToNotify,
        unmatchedResources,
        totalTasks: upcomingTasks.length
      };
    },

    onSuccess: (result) => {
      console.log('Publish schedule result:', result);
      
      let toastMessage = result.message;
      
      if (result.notifiedUsers.length > 0) {
        const usersList = result.notifiedUsers
          .map((nu: any) => nu.user.first_name + ' ' + nu.user.last_name)
          .join(', ');
        
        toastMessage += `\n\nUsers to notify: ${usersList}`;
      }
      
      if (result.unmatchedResources && result.unmatchedResources.length > 0) {
        toastMessage += `\n\nUnmatched resources: ${result.unmatchedResources.join(', ')}`;
      }

      toast({
        title: "Schedule Analysis Complete",
        description: toastMessage,
      });
    },

    onError: (error) => {
      console.error('Publish schedule error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to analyze schedule",
      });
    },
  });

  return {
    publishSchedule: publishSchedule.mutate,
    isLoading: publishSchedule.isPending,
  };
};