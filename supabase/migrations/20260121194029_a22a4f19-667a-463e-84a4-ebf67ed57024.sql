ALTER TABLE check_print_settings
DROP COLUMN IF EXISTS micr_check_number_x,
DROP COLUMN IF EXISTS micr_check_number_y,
DROP COLUMN IF EXISTS micr_routing_x,
DROP COLUMN IF EXISTS micr_routing_y,
DROP COLUMN IF EXISTS micr_account_x,
DROP COLUMN IF EXISTS micr_account_y;