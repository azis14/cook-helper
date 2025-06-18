/*
  # Fix dataset_recipes table - Make user_id optional for dataset imports

  1. Changes
    - Make user_id nullable to allow dataset imports without user association
    - Add public access policy for dataset recipes without user_id
    - Keep existing user-specific policies for user-owned recipes

  2. Security
    - Dataset recipes (user_id IS NULL) are publicly readable
    - User-owned recipes follow existing RLS policies
    - Only authenticated users can insert/update/delete their own recipes
*/

-- Make user_id nullable for dataset imports
ALTER TABLE dataset_recipes ALTER COLUMN user_id DROP NOT NULL;

-- Create policy for public dataset recipes (where user_id is NULL)
CREATE POLICY "Anyone can read public dataset recipes"
  ON dataset_recipes
  FOR SELECT
  TO authenticated
  USING (user_id IS NULL);

-- Update existing policies to handle both cases
DROP POLICY IF EXISTS "Users can read own dataset recipes" ON dataset_recipes;
CREATE POLICY "Users can read own dataset recipes"
  ON dataset_recipes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Keep insert/update/delete policies for user-owned recipes only
-- (Dataset imports would be done via admin/bulk import, not through app)