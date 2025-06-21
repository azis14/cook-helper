/*
  # Create feature flags table

  1. New Tables
    - `feature_flags`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Feature name identifier
      - `enabled` (boolean) - Whether the feature is enabled
      - `description` (text, nullable) - Description of the feature
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `feature_flags` table
    - Add policy for public read access (features need to be readable by all users)
    - Add policy for service role to manage feature flags

  3. Initial Data
    - Insert default feature flags with current settings
*/

CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Allow public read access to feature flags (needed for frontend and backend)
CREATE POLICY "Anyone can read feature flags"
  ON feature_flags
  FOR SELECT
  TO public
  USING (true);

-- Allow service role to manage feature flags
CREATE POLICY "Service role can manage feature flags"
  ON feature_flags
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default feature flags
INSERT INTO feature_flags (name, enabled, description) VALUES
  ('dataset', false, 'Enable/disable access to the recipe dataset and related features'),
  ('suggestions', true, 'Enable/disable AI-powered recipe suggestions using Gemini'),
  ('rag', true, 'Enable/disable RAG-based recipe recommendations'),
  ('weeklyPlanner', true, 'Enable/disable weekly meal planning functionality')
ON CONFLICT (name) DO NOTHING;