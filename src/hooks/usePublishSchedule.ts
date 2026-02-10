import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { today as getTodayString, addDays } from "@/utils/dateOnly";
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

// Match resource names to company representatives
const matchResourceToRepresentative = (resourceName: string, representatives: any[]): any | null => {
  const normalizedResourceName = resourceName.toLowerCase().trim();
  
  return representatives.find(rep => {
    const fullName = `${rep.first_name || ''} ${rep.last_name || ''}`.toLowerCase().trim();
    return fullName === normalizedResourceName;
  });
};

// Delay helper to avoid rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const usePublishSchedule = (projectId: string) => {
  const queryClient = useQueryClient();

  const publishSchedule = useMutation({
    mutationFn: async (data: PublishScheduleData) => {
      console.log('Publishing schedule with data:', data);
      
      const daysFromToday = convertWeeksToDays(data.daysFromToday);
      
      // Use string-only date comparison - no Date objects, no timezone issues
      const todayStr = getTodayString(); // "YYYY-MM-DD"
      const cutoffStr = addDays(todayStr, daysFromToday - 1); // 21 days = today + 20 more days
      
      console.log(`Date range: ${todayStr} to ${cutoffStr} (${daysFromToday} days)`);

      // 1. Get all tasks for this project directly from the table
      const { data: tasks, error: tasksError } = await supabase
        .from('project_schedule_tasks')
        .select('id, task_name, start_date, end_date, resources, progress')
        .eq('project_id', projectId);

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        throw new Error(`Failed to fetch project tasks: ${tasksError.message}`);
      }

      console.log('All project tasks:', tasks?.length || 0, 'tasks found');

      // Filter tasks: start_date within range AND progress < 100
      // Direct string comparison on YYYY-MM-DD format - no timezone issues
      const upcomingTasks = (tasks || []).filter((task: any) => {
        // Skip tasks that are 100% complete
        if (task.progress === 100) {
          console.log(`Skipping task "${task.task_name}" - 100% complete`);
          return false;
        }
        
        // Skip tasks without a start_date
        if (!task.start_date) {
          return false;
        }
        
        // Strip timestamp from task.start_date (e.g., "2026-01-28 00:00:00+00" → "2026-01-28")
        const taskStart = task.start_date?.split(' ')[0]?.split('T')[0] || '';
        const isInRange = taskStart >= todayStr && taskStart <= cutoffStr;
        
        console.log(`Task "${task.task_name}" starts ${taskStart}, in range [${todayStr} to ${cutoffStr}]: ${isInRange}`);
        
        return isInRange;
      });

      console.log('Upcoming tasks within timeframe:', upcomingTasks.length);

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

      // 3. Get all users and company representatives to match against resource names
      const [usersResult, representativesResult] = await Promise.all([
        supabase
          .from('users')
          .select('id, first_name, last_name, email, company_name'),
        supabase
          .from('company_representatives')
          .select('id, first_name, last_name, email, receive_schedule_notifications, company_id')
      ]);

      if (usersResult.error) {
        console.error('Error fetching users:', usersResult.error);
        throw new Error('Failed to fetch users');
      }

      if (representativesResult.error) {
        console.error('Error fetching representatives:', representativesResult.error);
        throw new Error('Failed to fetch company representatives');
      }

      const users = usersResult.data || [];
      const representatives = representativesResult.data || [];

      console.log('All users:', users);
      console.log('All company representatives:', representatives);

      // 4. Match resource names to both users and representatives
      const matchedUsers = [];
      const matchedRepresentatives = [];
      const unmatchedResources = [];

      for (const resourceName of allResourceNames) {
        // First try to match to users
        const matchedUser = matchResourceToUser(resourceName, users);
        if (matchedUser) {
          matchedUsers.push({ resourceName, user: matchedUser, type: 'user' });
          continue;
        }

        // Then try to match to company representatives
        const matchedRep = matchResourceToRepresentative(resourceName, representatives);
        if (matchedRep) {
          matchedRepresentatives.push({ resourceName, representative: matchedRep, type: 'representative' });
          continue;
        }

        // If no match found in either table
        unmatchedResources.push(resourceName);
      }

      console.log('Matched users:', matchedUsers);
      console.log('Matched representatives:', matchedRepresentatives);
      console.log('Unmatched resources:', unmatchedResources);

      // 5. Prepare notifications for both users and representatives
      const usersToNotify = [];
      
      // Add matched users (assuming they want notifications - could add preference check later)
      for (const matchedUser of matchedUsers) {
        usersToNotify.push({
          user: matchedUser.user,
          resourceName: matchedUser.resourceName,
          type: 'user',
          tasksAssigned: upcomingTasks.filter((task: any) => 
            task.resources && parseResources(task.resources).includes(matchedUser.resourceName)
          )
        });
      }

      // Add matched representatives who have notifications enabled
      for (const matchedRep of matchedRepresentatives) {
        if (matchedRep.representative.receive_schedule_notifications) {
          usersToNotify.push({
            user: {
              email: matchedRep.representative.email,
              first_name: matchedRep.representative.first_name,
              last_name: matchedRep.representative.last_name
            },
            resourceName: matchedRep.resourceName,
            type: 'representative',
            representativeId: matchedRep.representative.id,
            companyId: matchedRep.representative.company_id,
            tasksAssigned: upcomingTasks.filter((task: any) => 
              task.resources && parseResources(task.resources).includes(matchedRep.resourceName)
            )
          });
        } else {
          console.log(`Representative ${matchedRep.representative.first_name} ${matchedRep.representative.last_name} has notifications disabled`);
        }
      }

      console.log('Users to notify:', usersToNotify);

      // Send email notifications to users who should be notified
      const emailResults = [];
      if (usersToNotify.length > 0) {
        // Get project details for the email
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('address, construction_manager')
          .eq('id', projectId)
          .single();

        if (projectError) {
          console.error('Error fetching project details:', projectError);
        }

        const projectName = project?.address || 'Your Project';
        const projectAddress = project?.address || 'Project Address';
        
        // Get project manager details
        let projectManagerName = 'Project Manager';
        let projectManagerPhone = 'N/A';
        let projectManagerEmail = 'N/A';
        let manager = null;
        
        if (project?.construction_manager) {
          const { data: managerData, error: managerError } = await supabase
            .from('users')
            .select('first_name, last_name, phone_number, email, company_name')
            .eq('id', project.construction_manager)
            .single();
            
          if (managerData && !managerError) {
            manager = managerData;
            projectManagerName = `${manager.first_name || ''} ${manager.last_name || ''}`.trim() || 'Project Manager';
            projectManagerPhone = manager.phone_number || 'N/A';
            projectManagerEmail = manager.email || 'N/A';
          }
        }

        // Send emails to each user with delay between each to avoid rate limits
        for (let i = 0; i < usersToNotify.length; i++) {
          const userToNotify = usersToNotify[i];
          try {
            console.log(`Sending email ${i + 1}/${usersToNotify.length} to ${userToNotify.user.email}...`);
            
            const emailData = {
              recipientEmail: userToNotify.user.email,
              recipientName: `${userToNotify.user.first_name} ${userToNotify.user.last_name}`.trim() || userToNotify.user.email,
              projectName: projectName,
              projectAddress: projectAddress,
              projectManagerName: projectManagerName,
              projectManagerPhone: projectManagerPhone,
              projectManagerEmail: projectManagerEmail,
              senderCompanyName: manager?.company_name || 'BuilderSuite ML',
              tasks: userToNotify.tasksAssigned.map(task => ({
                id: task.id,
                task_name: task.task_name,
                start_date: task.start_date,
                end_date: task.end_date,
                resources: task.resources
              })),
              timeframe: `${data.daysFromToday} weeks`,
              customMessage: data.message,
              companyId: userToNotify.type === 'representative' ? userToNotify.companyId || '' : '',
              representativeId: userToNotify.type === 'representative' ? userToNotify.representativeId || '' : ''
            };

            const { data: emailResponse, error: emailError } = await supabase.functions.invoke(
              'send-schedule-notification',
              { body: emailData }
            );

            // Check BOTH the invoke error AND the response body for failures
            if (emailError || emailResponse?.success === false) {
              const errorMessage = emailError?.message || emailResponse?.error || 'Unknown error';
              console.error(`Failed to send email to ${userToNotify.user.email}:`, errorMessage);
              emailResults.push({
                user: userToNotify.user.email,
                success: false,
                error: errorMessage
              });
            } else {
              console.log('Email sent successfully:', emailResponse);
              emailResults.push({
                user: userToNotify.user.email,
                success: true,
                messageId: emailResponse?.messageId
              });
            }
            
            // Wait 600ms between emails to avoid Resend rate limits
            if (i < usersToNotify.length - 1) {
              await delay(600);
            }
          } catch (emailError: any) {
            console.error('Error sending email to', userToNotify.user.email, ':', emailError);
            emailResults.push({
              user: userToNotify.user.email,
              success: false,
              error: emailError.message
            });
          }
        }
      }

      // Update project's last_schedule_published_at timestamp
      const { error: updateError } = await supabase
        .from('projects')
        .update({ last_schedule_published_at: new Date().toISOString() })
        .eq('id', projectId);

      if (updateError) {
        console.error('Error updating last_schedule_published_at:', updateError);
      }

      return {
        success: true,
        message: `Found ${usersToNotify.length} users to notify about upcoming tasks`,
        notifiedUsers: usersToNotify,
        unmatchedResources,
        totalTasks: upcomingTasks.length,
        emailResults
      };
    },

    onSuccess: (result) => {
      console.log('Publish schedule result:', result);
      
      const successfulEmails = result.emailResults?.filter((er: any) => er.success) || [];
      const failedEmails = result.emailResults?.filter((er: any) => !er.success) || [];
      
      let toastTitle = "Schedule Notifications Sent";
      let toastParts: string[] = [];
      
      if (successfulEmails.length > 0) {
        const userWord = successfulEmails.length === 1 ? 'user' : 'users';
        toastParts.push(`✅ Sent to ${successfulEmails.length} ${userWord}`);
      }
      
      if (failedEmails.length > 0) {
        const failedList = failedEmails.map((e: any) => `${e.user}: ${e.error}`).join(', ');
        toastParts.push(`❌ Failed: ${failedList}`);
        toastTitle = "Schedule Notifications (Some Failed)";
      }
      
      if (result.unmatchedResources && result.unmatchedResources.length > 0) {
        toastParts.push(`⚠️ Unmatched: ${result.unmatchedResources.join(', ')}`);
      }
      
      if (toastParts.length === 0) {
        toastParts.push(result.message);
      }

      toast({
        title: toastTitle,
        description: toastParts.join('\n\n'),
        duration: failedEmails.length > 0 ? 15000 : 5000,
      });
    },

    onError: (error) => {
      console.error('Publish schedule error:', error);
      toast({
        variant: "destructive",
        title: "Schedule Publish Failed",
        description: error.message || "Failed to send schedule notifications",
        duration: 10000,
      });
    },
  });

  return {
    publishSchedule: publishSchedule.mutate,
    isLoading: publishSchedule.isPending,
  };
};