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

// Parse resources from the new JSON format or legacy comma-separated format
interface ParsedResources {
  companies: {
    companyId: string;
    companyName: string;
    selectedRepIds: string[];
  }[];
  internalUsers: string[];
}

const parseResourcesValue = (resourcesText: string): ParsedResources => {
  if (!resourcesText) {
    return { companies: [], internalUsers: [] };
  }

  // Try to parse as JSON first (new format)
  try {
    const parsed = JSON.parse(resourcesText);
    if (parsed.companies || parsed.internalUsers) {
      return parsed as ParsedResources;
    }
  } catch {
    // Not JSON, handle as legacy comma-separated format
  }

  // Legacy format: "Tom Koo, Josefina An"
  return { companies: [], internalUsers: [] };
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
        today.setHours(0, 0, 0, 0);
        
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

      // 2. Collect all unique company IDs and rep IDs, plus internal user IDs from tasks
      const companyRepMap = new Map<string, Set<string>>(); // companyId -> Set of repIds
      const internalUserIds = new Set<string>();

      upcomingTasks.forEach((task: any) => {
        if (task.resources) {
          const parsed = parseResourcesValue(task.resources);
          
          // Collect company and their selected reps
          parsed.companies.forEach(company => {
            if (!companyRepMap.has(company.companyId)) {
              companyRepMap.set(company.companyId, new Set());
            }
            const repSet = companyRepMap.get(company.companyId)!;
            company.selectedRepIds.forEach(repId => repSet.add(repId));
          });

          // Collect internal users
          parsed.internalUsers.forEach(userId => internalUserIds.add(userId));
        }
      });

      console.log('Companies to notify:', Array.from(companyRepMap.entries()));
      console.log('Internal users to notify:', Array.from(internalUserIds));

      if (companyRepMap.size === 0 && internalUserIds.size === 0) {
        return {
          success: true,
          message: 'No resources assigned to upcoming tasks',
          notifiedUsers: []
        };
      }

      // 3. Fetch representative details for those that should be notified
      const usersToNotify: any[] = [];

      // Fetch representatives by ID
      if (companyRepMap.size > 0) {
        const allRepIds: string[] = [];
        companyRepMap.forEach((repIds) => {
          repIds.forEach(repId => allRepIds.push(repId));
        });

        if (allRepIds.length > 0) {
          const { data: representatives, error: repError } = await supabase
            .from('company_representatives')
            .select('id, first_name, last_name, email, company_id, receive_schedule_notifications')
            .in('id', allRepIds);

          if (repError) {
            console.error('Error fetching representatives:', repError);
          } else if (representatives) {
            // For each representative that was explicitly selected, notify them
            representatives.forEach(rep => {
              // Get the tasks this rep's company is assigned to
              const repTasks = upcomingTasks.filter((task: any) => {
                if (!task.resources) return false;
                const parsed = parseResourcesValue(task.resources);
                return parsed.companies.some(c => 
                  c.companyId === rep.company_id && c.selectedRepIds.includes(rep.id)
                );
              });

              if (repTasks.length > 0) {
                usersToNotify.push({
                  user: {
                    email: rep.email,
                    first_name: rep.first_name,
                    last_name: rep.last_name
                  },
                  resourceName: `${rep.first_name} ${rep.last_name}`.trim(),
                  type: 'representative',
                  representativeId: rep.id,
                  companyId: rep.company_id,
                  tasksAssigned: repTasks
                });
              }
            });
          }
        }

        // Also check for companies where no specific reps were selected (use default)
        for (const [companyId, selectedRepIds] of companyRepMap.entries()) {
          if (selectedRepIds.size === 0) {
            // No specific reps selected, notify those with receive_schedule_notifications = true
            const { data: defaultReps } = await supabase
              .from('company_representatives')
              .select('id, first_name, last_name, email, company_id')
              .eq('company_id', companyId)
              .eq('receive_schedule_notifications', true);

            if (defaultReps) {
              defaultReps.forEach(rep => {
                const repTasks = upcomingTasks.filter((task: any) => {
                  if (!task.resources) return false;
                  const parsed = parseResourcesValue(task.resources);
                  return parsed.companies.some(c => c.companyId === companyId);
                });

                if (repTasks.length > 0) {
                  usersToNotify.push({
                    user: {
                      email: rep.email,
                      first_name: rep.first_name,
                      last_name: rep.last_name
                    },
                    resourceName: `${rep.first_name} ${rep.last_name}`.trim(),
                    type: 'representative',
                    representativeId: rep.id,
                    companyId: rep.company_id,
                    tasksAssigned: repTasks
                  });
                }
              });
            }
          }
        }
      }

      // Fetch internal users by ID
      if (internalUserIds.size > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .in('id', Array.from(internalUserIds));

        if (usersError) {
          console.error('Error fetching users:', usersError);
        } else if (users) {
          users.forEach(user => {
            const userTasks = upcomingTasks.filter((task: any) => {
              if (!task.resources) return false;
              const parsed = parseResourcesValue(task.resources);
              return parsed.internalUsers.includes(user.id);
            });

            if (userTasks.length > 0) {
              usersToNotify.push({
                user: {
                  email: user.email,
                  first_name: user.first_name,
                  last_name: user.last_name
                },
                resourceName: `${user.first_name} ${user.last_name}`.trim(),
                type: 'user',
                tasksAssigned: userTasks
              });
            }
          });
        }
      }

      console.log('Users to notify:', usersToNotify);

      // 4. Send email notifications
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
              tasks: userToNotify.tasksAssigned.map((task: any) => ({
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
        totalTasks: upcomingTasks.length,
        emailResults
      };
    },

    onSuccess: (result) => {
      console.log('Publish schedule result:', result);
      
      let toastMessage = result.message;
      
      if (result.notifiedUsers && result.notifiedUsers.length > 0) {
        const usersList = result.notifiedUsers
          .map((nu: any) => `${nu.user.first_name} ${nu.user.last_name}`.trim())
          .join(', ');
        
        toastMessage += `\n\nNotified: ${usersList}`;
        
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
