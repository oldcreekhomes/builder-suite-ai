-- Update RLS policy names and descriptions to use "owners" instead of "Users" or "home builders"

-- Update policies on companies table
DROP POLICY IF EXISTS "Home builders and their approved employees can access companies" ON public.companies;
CREATE POLICY "Owners and their approved employees can access companies" 
ON public.companies 
FOR ALL 
USING ((owner_id = auth.uid()) OR (owner_id IN ( SELECT employees.home_builder_id
   FROM employees
  WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true)))))
WITH CHECK ((owner_id = auth.uid()) OR (owner_id IN ( SELECT employees.home_builder_id
   FROM employees
  WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true)))));

-- Update policies on company_representatives table
DROP POLICY IF EXISTS "Home builders and employees can create representatives" ON public.company_representatives;
DROP POLICY IF EXISTS "Home builders and employees can delete representatives" ON public.company_representatives;
DROP POLICY IF EXISTS "Home builders and employees can update representatives" ON public.company_representatives;
DROP POLICY IF EXISTS "Home builders and employees can view representatives" ON public.company_representatives;

CREATE POLICY "Owners and employees can create representatives" 
ON public.company_representatives 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1
   FROM companies
  WHERE ((companies.id = company_representatives.company_id) AND ((companies.owner_id = auth.uid()) OR (companies.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))))))));

CREATE POLICY "Owners and employees can delete representatives" 
ON public.company_representatives 
FOR DELETE 
USING (EXISTS ( SELECT 1
   FROM companies
  WHERE ((companies.id = company_representatives.company_id) AND ((companies.owner_id = auth.uid()) OR (companies.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))))))));

CREATE POLICY "Owners and employees can update representatives" 
ON public.company_representatives 
FOR UPDATE 
USING (EXISTS ( SELECT 1
   FROM companies
  WHERE ((companies.id = company_representatives.company_id) AND ((companies.owner_id = auth.uid()) OR (companies.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))))))));

CREATE POLICY "Owners and employees can view representatives" 
ON public.company_representatives 
FOR SELECT 
USING (EXISTS ( SELECT 1
   FROM companies
  WHERE ((companies.id = company_representatives.company_id) AND ((companies.owner_id = auth.uid()) OR (companies.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))))))));

-- Update policies on cost_code_specifications table
DROP POLICY IF EXISTS "Home builders and their approved employees can create specifica" ON public.cost_code_specifications;
DROP POLICY IF EXISTS "Home builders and their approved employees can delete specifica" ON public.cost_code_specifications;
DROP POLICY IF EXISTS "Home builders and their approved employees can update specifica" ON public.cost_code_specifications;
DROP POLICY IF EXISTS "Home builders and their approved employees can view specificati" ON public.cost_code_specifications;

CREATE POLICY "Owners and their approved employees can create specifications" 
ON public.cost_code_specifications 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1
   FROM cost_codes
  WHERE ((cost_codes.id = cost_code_specifications.cost_code_id) AND ((cost_codes.owner_id = auth.uid()) OR (cost_codes.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))))))));

CREATE POLICY "Owners and their approved employees can delete specifications" 
ON public.cost_code_specifications 
FOR DELETE 
USING (EXISTS ( SELECT 1
   FROM cost_codes
  WHERE ((cost_codes.id = cost_code_specifications.cost_code_id) AND ((cost_codes.owner_id = auth.uid()) OR (cost_codes.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))))))));

CREATE POLICY "Owners and their approved employees can update specifications" 
ON public.cost_code_specifications 
FOR UPDATE 
USING (EXISTS ( SELECT 1
   FROM cost_codes
  WHERE ((cost_codes.id = cost_code_specifications.cost_code_id) AND ((cost_codes.owner_id = auth.uid()) OR (cost_codes.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))))))));

CREATE POLICY "Owners and their approved employees can view specifications" 
ON public.cost_code_specifications 
FOR SELECT 
USING (EXISTS ( SELECT 1
   FROM cost_codes
  WHERE ((cost_codes.id = cost_code_specifications.cost_code_id) AND ((cost_codes.owner_id = auth.uid()) OR (cost_codes.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))))))));

-- Update policies on cost_codes table
DROP POLICY IF EXISTS "Home builders and their approved employees can access cost code" ON public.cost_codes;
CREATE POLICY "Owners and their approved employees can access cost codes" 
ON public.cost_codes 
FOR ALL 
USING ((owner_id = auth.uid()) OR (owner_id IN ( SELECT employees.home_builder_id
   FROM employees
  WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true)))))
WITH CHECK ((owner_id = auth.uid()) OR (owner_id IN ( SELECT employees.home_builder_id
   FROM employees
  WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true)))));

-- Update policies on company_cost_codes table
DROP POLICY IF EXISTS "Users can create cost code associations for their companies" ON public.company_cost_codes;
DROP POLICY IF EXISTS "Users can delete cost code associations of their companies" ON public.company_cost_codes;
DROP POLICY IF EXISTS "Users can view cost codes of their companies" ON public.company_cost_codes;

CREATE POLICY "Owners can create cost code associations for their companies" 
ON public.company_cost_codes 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1
   FROM companies
  WHERE ((companies.id = company_cost_codes.company_id) AND (companies.owner_id = auth.uid()))));

CREATE POLICY "Owners can delete cost code associations of their companies" 
ON public.company_cost_codes 
FOR DELETE 
USING (EXISTS ( SELECT 1
   FROM companies
  WHERE ((companies.id = company_cost_codes.company_id) AND (companies.owner_id = auth.uid()))));

CREATE POLICY "Owners can view cost codes of their companies" 
ON public.company_cost_codes 
FOR SELECT 
USING (EXISTS ( SELECT 1
   FROM companies
  WHERE ((companies.id = company_cost_codes.company_id) AND (companies.owner_id = auth.uid()))));

-- Update policies on project_budgets table
DROP POLICY IF EXISTS "Home builders and their approved employees can access project b" ON public.project_budgets;
CREATE POLICY "Owners and their approved employees can access project budgets" 
ON public.project_budgets 
FOR ALL 
USING (project_id IN ( SELECT projects.id
   FROM projects
  WHERE ((projects.owner_id = auth.uid()) OR (projects.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true)))))))
WITH CHECK (project_id IN ( SELECT projects.id
   FROM projects
  WHERE ((projects.owner_id = auth.uid()) OR (projects.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true)))))));

-- Update policies on project_files table
DROP POLICY IF EXISTS "Home builders and their approved employees can access project f" ON public.project_files;
CREATE POLICY "Owners and their approved employees can access project files" 
ON public.project_files 
FOR ALL 
USING (project_id IN ( SELECT projects.id
   FROM projects
  WHERE ((projects.owner_id = auth.uid()) OR (projects.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true)))))))
WITH CHECK (project_id IN ( SELECT projects.id
   FROM projects
  WHERE ((projects.owner_id = auth.uid()) OR (projects.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true)))))));

-- Update policies on project_photos table
DROP POLICY IF EXISTS "Home builders and their approved employees can access project p" ON public.project_photos;
CREATE POLICY "Owners and their approved employees can access project photos" 
ON public.project_photos 
FOR ALL 
USING (project_id IN ( SELECT projects.id
   FROM projects
  WHERE ((projects.owner_id = auth.uid()) OR (projects.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true)))))))
WITH CHECK (project_id IN ( SELECT projects.id
   FROM projects
  WHERE ((projects.owner_id = auth.uid()) OR (projects.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true)))))));

-- Update policies on project_bid_packages table
DROP POLICY IF EXISTS "Users can create bid packages for their projects" ON public.project_bid_packages;
DROP POLICY IF EXISTS "Users can delete bid packages for their projects" ON public.project_bid_packages;
DROP POLICY IF EXISTS "Users can update bid packages for their projects" ON public.project_bid_packages;
DROP POLICY IF EXISTS "Users can view bid packages for their projects" ON public.project_bid_packages;

CREATE POLICY "Owners can create bid packages for their projects" 
ON public.project_bid_packages 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.id = project_bid_packages.project_id) AND (projects.owner_id = auth.uid()))));

CREATE POLICY "Owners can delete bid packages for their projects" 
ON public.project_bid_packages 
FOR DELETE 
USING (EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.id = project_bid_packages.project_id) AND (projects.owner_id = auth.uid()))));

CREATE POLICY "Owners can update bid packages for their projects" 
ON public.project_bid_packages 
FOR UPDATE 
USING (EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.id = project_bid_packages.project_id) AND (projects.owner_id = auth.uid()))));

CREATE POLICY "Owners can view bid packages for their projects" 
ON public.project_bid_packages 
FOR SELECT 
USING (EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.id = project_bid_packages.project_id) AND (projects.owner_id = auth.uid()))));

-- Update policies on project_bid_package_companies table
DROP POLICY IF EXISTS "Users can create bid package companies for their projects" ON public.project_bid_package_companies;
DROP POLICY IF EXISTS "Users can delete bid package companies for their projects" ON public.project_bid_package_companies;
DROP POLICY IF EXISTS "Users can update bid package companies for their projects" ON public.project_bid_package_companies;
DROP POLICY IF EXISTS "Users can view bid package companies for their projects" ON public.project_bid_package_companies;

CREATE POLICY "Owners can create bid package companies for their projects" 
ON public.project_bid_package_companies 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1
   FROM (project_bid_packages bp
     JOIN projects p ON ((bp.project_id = p.id)))
  WHERE ((bp.id = project_bid_package_companies.bid_package_id) AND (p.owner_id = auth.uid()))));

CREATE POLICY "Owners can delete bid package companies for their projects" 
ON public.project_bid_package_companies 
FOR DELETE 
USING (EXISTS ( SELECT 1
   FROM (project_bid_packages bp
     JOIN projects p ON ((bp.project_id = p.id)))
  WHERE ((bp.id = project_bid_package_companies.bid_package_id) AND (p.owner_id = auth.uid()))));

CREATE POLICY "Owners can update bid package companies for their projects" 
ON public.project_bid_package_companies 
FOR UPDATE 
USING (EXISTS ( SELECT 1
   FROM (project_bid_packages bp
     JOIN projects p ON ((bp.project_id = p.id)))
  WHERE ((bp.id = project_bid_package_companies.bid_package_id) AND (p.owner_id = auth.uid()))));

CREATE POLICY "Owners can view bid package companies for their projects" 
ON public.project_bid_package_companies 
FOR SELECT 
USING (EXISTS ( SELECT 1
   FROM (project_bid_packages bp
     JOIN projects p ON ((bp.project_id = p.id)))
  WHERE ((bp.id = project_bid_package_companies.bid_package_id) AND (p.owner_id = auth.uid()))));

-- Update policies on project_schedule_tasks table
DROP POLICY IF EXISTS "Users can create schedule tasks for accessible projects" ON public.project_schedule_tasks;
DROP POLICY IF EXISTS "Users can delete schedule tasks for accessible projects" ON public.project_schedule_tasks;
DROP POLICY IF EXISTS "Users can update schedule tasks for accessible projects" ON public.project_schedule_tasks;
DROP POLICY IF EXISTS "Users can view schedule tasks for their projects" ON public.project_schedule_tasks;

CREATE POLICY "Owners can create schedule tasks for accessible projects" 
ON public.project_schedule_tasks 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.id = project_schedule_tasks.project_id) AND ((projects.owner_id = auth.uid()) OR (projects.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))))))));

CREATE POLICY "Owners can delete schedule tasks for accessible projects" 
ON public.project_schedule_tasks 
FOR DELETE 
USING (EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.id = project_schedule_tasks.project_id) AND ((projects.owner_id = auth.uid()) OR (projects.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))))))));

CREATE POLICY "Owners can update schedule tasks for accessible projects" 
ON public.project_schedule_tasks 
FOR UPDATE 
USING (EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.id = project_schedule_tasks.project_id) AND ((projects.owner_id = auth.uid()) OR (projects.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))))))));

CREATE POLICY "Owners can view schedule tasks for their projects" 
ON public.project_schedule_tasks 
FOR SELECT 
USING (EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.id = project_schedule_tasks.project_id) AND ((projects.owner_id = auth.uid()) OR (projects.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))))))));

-- Update policies on employee_chat_rooms table
DROP POLICY IF EXISTS "Users can create chat rooms" ON public.employee_chat_rooms;
DROP POLICY IF EXISTS "Users can update chat rooms they created" ON public.employee_chat_rooms;
DROP POLICY IF EXISTS "Users can view chat rooms they created" ON public.employee_chat_rooms;
DROP POLICY IF EXISTS "Users can view direct message rooms where they are a participan" ON public.employee_chat_rooms;

CREATE POLICY "Owners can create chat rooms" 
ON public.employee_chat_rooms 
FOR INSERT 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owners can update chat rooms they created" 
ON public.employee_chat_rooms 
FOR UPDATE 
USING (created_by = auth.uid());

CREATE POLICY "Owners can view chat rooms they created" 
ON public.employee_chat_rooms 
FOR SELECT 
USING (created_by = auth.uid());

CREATE POLICY "Owners can view direct message rooms where they are a participant" 
ON public.employee_chat_rooms 
FOR SELECT 
USING ((is_direct_message = true) AND is_room_participant(id, auth.uid()));

-- Update policies on employee_chat_participants table
DROP POLICY IF EXISTS "Users can add chat participants" ON public.employee_chat_participants;
DROP POLICY IF EXISTS "Users can update their own participant records" ON public.employee_chat_participants;
DROP POLICY IF EXISTS "Users can view participants in rooms they have access to" ON public.employee_chat_participants;

CREATE POLICY "Owners can add chat participants" 
ON public.employee_chat_participants 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1
   FROM employee_chat_rooms
  WHERE ((employee_chat_rooms.id = employee_chat_participants.room_id) AND (employee_chat_rooms.created_by = auth.uid()))));

CREATE POLICY "Owners can update their own participant records" 
ON public.employee_chat_participants 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Owners can view participants in rooms they have access to" 
ON public.employee_chat_participants 
FOR SELECT 
USING ((user_id = auth.uid()) OR (room_id IN ( SELECT employee_chat_rooms.id
   FROM employee_chat_rooms
  WHERE (employee_chat_rooms.created_by = auth.uid()))));

-- Update policies on employee_chat_messages table
DROP POLICY IF EXISTS "Users can send messages to their chat rooms" ON public.employee_chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.employee_chat_messages;
DROP POLICY IF EXISTS "Users can view messages in their chat rooms" ON public.employee_chat_messages;

CREATE POLICY "Owners can send messages to their chat rooms" 
ON public.employee_chat_messages 
FOR INSERT 
WITH CHECK ((sender_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM employee_chat_participants
  WHERE ((employee_chat_participants.room_id = employee_chat_messages.room_id) AND (employee_chat_participants.user_id = auth.uid())))));

CREATE POLICY "Owners can update their own messages" 
ON public.employee_chat_messages 
FOR UPDATE 
USING (sender_id = auth.uid());

CREATE POLICY "Owners can view messages in their chat rooms" 
ON public.employee_chat_messages 
FOR SELECT 
USING (EXISTS ( SELECT 1
   FROM employee_chat_participants
  WHERE ((employee_chat_participants.room_id = employee_chat_messages.room_id) AND (employee_chat_participants.user_id = auth.uid()))));