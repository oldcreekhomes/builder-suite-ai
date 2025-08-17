-- Fix search path for existing functions to address security warning
ALTER FUNCTION public.add_task_above_atomic SET search_path = '';
ALTER FUNCTION public.create_project_task SET search_path = '';
ALTER FUNCTION public.delete_project_task SET search_path = '';
ALTER FUNCTION public.get_project_tasks SET search_path = '';
ALTER FUNCTION public.update_project_task SET search_path = '';
ALTER FUNCTION public.reorder_project_tasks SET search_path = '';
ALTER FUNCTION public.approve_employee SET search_path = '';
ALTER FUNCTION public.get_pending_employee_approvals SET search_path = '';
ALTER FUNCTION public.get_home_builders SET search_path = '';
ALTER FUNCTION public.get_current_user_company SET search_path = '';
ALTER FUNCTION public.get_user_role_and_home_builder SET search_path = '';
ALTER FUNCTION public.get_current_user_home_builder_id SET search_path = '';
ALTER FUNCTION public.get_current_user_home_builder_info SET search_path = '';
ALTER FUNCTION public.get_conversation_unread_count SET search_path = '';
ALTER FUNCTION public.mark_conversation_as_read SET search_path = '';
ALTER FUNCTION public.mark_message_as_read SET search_path = '';