-- Update existing owner preferences to have all permissions enabled
UPDATE user_notification_preferences 
SET 
  can_access_accounting = true,
  can_access_manage_bills = true,
  can_access_transactions = true,
  can_access_reports = true,
  can_access_employees = true,
  can_close_books = true,
  can_lock_budgets = true,
  can_undo_reconciliation = true,
  can_edit_projects = true,
  can_access_pm_dashboard = true,
  can_access_owner_dashboard = true,
  can_access_estimate = true
WHERE user_id IN (
  SELECT user_id FROM user_roles WHERE role = 'owner'
);