/*
  # Create dataset_recipes table for recipe dataset

  1. New Tables
    - `dataset_recipes`
      - `id` (uuid, primary key)
      - `title` (text, recipe title)
      - `ingredients_raw` (text, raw ingredients data)
      - `steps_raw` (text, raw cooking steps)
      - `loves_count` (integer, number of loves/likes)
      - `url` (text, source URL, nullable)
      - `category` (text, recipe category, nullable)
      - `title_cleaned` (text, cleaned title, nullable)
      - `total_ingredients` (integer, count of ingredients)
      - `ingredients_cleaned` (text, cleaned ingredients data, nullable)
      - `total_steps` (integer, count of steps)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `dataset_recipes` table
    - Add policies for authenticated users to manage their own dataset recipes

  3. Indexes
    - Index on `user_id` for performance
    - Index on `category` for filtering
    - Index on `loves_count` for sorting by popularity
    - Index on `total_ingredients` and `total_steps` for filtering

  4. Constraints
    - Check constraints to ensure non-negative values for counts
*/

-- Create dataset_recipes table
CREATE TABLE IF NOT EXISTS dataset_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  ingredients_raw text NOT NULL,
  steps_raw text NOT NULL,
  loves_count integer NOT NULL DEFAULT 0 CHECK (loves_count >= 0),
  url text,
  category text,
  title_cleaned text,
  total_ingredients integer NOT NULL DEFAULT 0 CHECK (total_ingredients >= 0),
  ingredients_cleaned text,
  total_steps integer NOT NULL DEFAULT 0 CHECK (total_steps >= 0),
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
CREATE INDEX IF NOT EXISTS dataset_recipes_category_idx ON dataset_recipes(category);
CREATE INDEX IF NOT EXISTS dataset_recipes_loves_count_idx ON dataset_recipes(loves_count DESC);
CREATE INDEX IF NOT EXISTS dataset_recipes_total_ingredients_idx ON dataset_recipes(total_ingredients);
CREATE INDEX IF NOT EXISTS dataset_recipes_total_steps_idx ON dataset_recipes(total_steps);
CREATE INDEX IF NOT EXISTS dataset_recipes_title_idx ON dataset_recipes USING gin(to_tsvector('english', title));

-- Create trigger for updated_at
CREATE TRIGGER update_dataset_recipes_updated_at 
  BEFORE UPDATE ON dataset_recipes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();