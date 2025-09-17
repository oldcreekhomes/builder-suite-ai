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

// Match resource names to company representatives
const matchResourceToRepresentative = (resourceName: string, representatives: any[]): any | null => {
  const normalizedResourceName = resourceName.toLowerCase().trim();
  
  return representatives.find(rep => {
    const fullName = `${rep.first_name || ''} ${rep.last_name || ''}`.toLowerCase().trim();
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

        // Send emails to each user
        for (const userToNotify of usersToNotify) {
          try {
            console.log(`Sending email to ${userToNotify.user.email}...`);
            
            const emailData = {
              recipientEmail: userToNotify.user.email,
              recipientName: `${userToNotify.user.first_name} ${userToNotify.user.last_name}`.trim() || userToNotify.user.email,
              projectName: projectName,
              projectAddress: projectAddress,
              projectManagerName: projectManagerName,
              projectManagerPhone: projectManagerPhone,
              projectManagerEmail: projectManagerEmail,
              senderCompanyName: manager?.company_name || 'BuilderSuite AI',
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

            if (emailError) {
              console.error('Email sending error:', emailError);
              emailResults.push({
                user: userToNotify.user.email,
                success: false,
                error: emailError.message
              });
            } else {
              console.log('Email sent successfully:', emailResponse);
              emailResults.push({
                user: userToNotify.user.email,
                success: true,
                messageId: emailResponse.messageId
              });
            }
          } catch (emailError) {
            console.error('Error sending email to', userToNotify.user.email, ':', emailError);
            emailResults.push({
              user: userToNotify.user.email,
              success: false,
              error: emailError.message
            });
          }
        }
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
      
      let toastMessage = result.message;
      
      if (result.notifiedUsers.length > 0) {
        const usersList = result.notifiedUsers
          .map((nu: any) => nu.user.first_name + ' ' + nu.user.last_name)
          .join(', ');
        
        toastMessage += `\n\nNotified users: ${usersList}`;
        
        // Add email sending results
        if (result.emailResults && result.emailResults.length > 0) {
          const successfulEmails = result.emailResults.filter((er: any) => er.success).length;
          const failedEmails = result.emailResults.filter((er: any) => !er.success).length;
          
          if (successfulEmails > 0) {
            toastMessage += `\n✅ Emails sent: ${successfulEmails}`;
          }
          if (failedEmails > 0) {
            toastMessage += `\n❌ Email failures: ${failedEmails}`;
          }
        }
      }
      
      if (result.unmatchedResources && result.unmatchedResources.length > 0) {
        toastMessage += `\n\nUnmatched resources: ${result.unmatchedResources.join(', ')}`;
      }

      toast({
        title: "Schedule Notifications Sent",
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