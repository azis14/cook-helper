/*
  # Update dataset_recipes table for simplified structure

  1. New Tables
    - `dataset_recipes` (updated structure)
      - `id` (uuid, primary key)
      - `title` (text, recipe title)
      - `ingredients` (text, ingredients data)
      - `steps` (text, cooking steps)
      - `loves_count` (integer, number of loves/likes)
      - `url` (text, source URL)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `dataset_recipes` table
    - Add policies for authenticated users to manage their own data

  3. Performance
    - Add indexes for common queries
    - Full-text search capability on title
    - Optimized for popularity sorting
*/

-- Drop existing table if it exists (to recreate with new structure)
DROP TABLE IF EXISTS dataset_recipes;

-- Create simplified dataset_recipes table
CREATE TABLE IF NOT EXISTS dataset_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  ingredients text NOT NULL,
  steps text NOT NULL,
  loves_count integer NOT NULL DEFAULT 0 CHECK (loves_count >= 0),
  url text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE dataset_recipes ENABLE ROW LEVEL SECURITY;

-- Create policies for dataset_recipes
CREATE POLICY "Users can read own dataset recipes"
  ON dataset_recipes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dataset recipes"
  ON dataset_recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dataset recipes"
  ON dataset_recipes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own dataset recipes"
  ON dataset_recipes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS dataset_recipes_user_id_idx ON dataset_recipes(user_id);
CREATE INDEX IF NOT EXISTS dataset_recipes_loves_count_idx ON dataset_recipes(loves_count DESC);
CREATE INDEX IF NOT EXISTS dataset_recipes_title_idx ON dataset_recipes USING gin(to_tsvector('english', title));

-- Create trigger for updated_at
CREATE TRIGGER update_dataset_recipes_updated_at 
  BEFORE UPDATE ON dataset_recipes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();