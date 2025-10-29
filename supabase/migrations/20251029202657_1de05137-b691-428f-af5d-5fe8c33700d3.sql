-- Create budget_warning_rules table
CREATE TABLE budget_warning_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  rule_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  threshold_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, rule_type)
);

-- Enable Row Level Security
ALTER TABLE budget_warning_rules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own warning rules"
  ON budget_warning_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own warning rules"
  ON budget_warning_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own warning rules"
  ON budget_warning_rules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own warning rules"
  ON budget_warning_rules FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_budget_warning_rules_user_id ON budget_warning_rules(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_budget_warning_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_budget_warning_rules_updated_at
BEFORE UPDATE ON budget_warning_rules
FOR EACH ROW
EXECUTE FUNCTION update_budget_warning_rules_updated_at();