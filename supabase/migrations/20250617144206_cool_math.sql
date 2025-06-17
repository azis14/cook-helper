/*
  # Schema untuk Asisten Dapur - Aplikasi Resep Pintar

  1. Tabel Baru
    - `ingredients`
      - `id` (uuid, primary key)
      - `name` (text, nama bahan)
      - `quantity` (numeric, jumlah)
      - `unit` (text, satuan)
      - `category` (text, kategori bahan)
      - `expiry_date` (date, tanggal kadaluarsa, opsional)
      - `user_id` (uuid, referensi ke auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `recipes`
      - `id` (uuid, primary key)
      - `name` (text, nama resep)
      - `description` (text, deskripsi resep)
      - `prep_time` (integer, waktu persiapan dalam menit)
      - `cook_time` (integer, waktu memasak dalam menit)
      - `servings` (integer, jumlah porsi)
      - `difficulty` (text, tingkat kesulitan)
      - `instructions` (text[], langkah-langkah memasak)
      - `tags` (text[], tag resep)
      - `user_id` (uuid, referensi ke auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `recipe_ingredients`
      - `id` (uuid, primary key)
      - `recipe_id` (uuid, referensi ke recipes)
      - `name` (text, nama bahan)
      - `quantity` (numeric, jumlah)
      - `unit` (text, satuan)
      - `created_at` (timestamp)

    - `weekly_plans`
      - `id` (uuid, primary key)
      - `week_start` (date, tanggal mulai minggu)
      - `user_id` (uuid, referensi ke auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `daily_meals`
      - `id` (uuid, primary key)
      - `weekly_plan_id` (uuid, referensi ke weekly_plans)
      - `date` (date, tanggal)
      - `breakfast_recipe_id` (uuid, referensi ke recipes, opsional)
      - `lunch_recipe_id` (uuid, referensi ke recipes, opsional)
      - `dinner_recipe_id` (uuid, referensi ke recipes, opsional)
      - `created_at` (timestamp)

  2. Keamanan
    - Enable RLS pada semua tabel
    - Kebijakan untuk pengguna yang terautentikasi hanya dapat mengakses data mereka sendiri
*/

-- Create ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL,
  category text NOT NULL,
  expiry_date date,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  prep_time integer NOT NULL DEFAULT 0,
  cook_time integer NOT NULL DEFAULT 0,
  servings integer NOT NULL DEFAULT 1,
  difficulty text NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  instructions text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create recipe_ingredients table
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create weekly_plans table
CREATE TABLE IF NOT EXISTS weekly_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create daily_meals table
CREATE TABLE IF NOT EXISTS daily_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_plan_id uuid REFERENCES weekly_plans(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  breakfast_recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  lunch_recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  dinner_recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_meals ENABLE ROW LEVEL SECURITY;

-- Create policies for ingredients
CREATE POLICY "Users can read own ingredients"
  ON ingredients
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ingredients"
  ON ingredients
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ingredients"
  ON ingredients
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ingredients"
  ON ingredients
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for recipes
CREATE POLICY "Users can read own recipes"
  ON recipes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipes"
  ON recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes"
  ON recipes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes"
  ON recipes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for recipe_ingredients
CREATE POLICY "Users can read recipe ingredients for own recipes"
  ON recipe_ingredients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_ingredients.recipe_id 
      AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert recipe ingredients for own recipes"
  ON recipe_ingredients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_ingredients.recipe_id 
      AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update recipe ingredients for own recipes"
  ON recipe_ingredients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_ingredients.recipe_id 
      AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete recipe ingredients for own recipes"
  ON recipe_ingredients
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_ingredients.recipe_id 
      AND recipes.user_id = auth.uid()
    )
  );

-- Create policies for weekly_plans
CREATE POLICY "Users can read own weekly plans"
  ON weekly_plans
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly plans"
  ON weekly_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly plans"
  ON weekly_plans
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly plans"
  ON weekly_plans
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for daily_meals
CREATE POLICY "Users can read daily meals for own weekly plans"
  ON daily_meals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_plans 
      WHERE weekly_plans.id = daily_meals.weekly_plan_id 
      AND weekly_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert daily meals for own weekly plans"
  ON daily_meals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weekly_plans 
      WHERE weekly_plans.id = daily_meals.weekly_plan_id 
      AND weekly_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update daily meals for own weekly plans"
  ON daily_meals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_plans 
      WHERE weekly_plans.id = daily_meals.weekly_plan_id 
      AND weekly_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete daily meals for own weekly plans"
  ON daily_meals
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_plans 
      WHERE weekly_plans.id = daily_meals.weekly_plan_id 
      AND weekly_plans.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS ingredients_user_id_idx ON ingredients(user_id);
CREATE INDEX IF NOT EXISTS ingredients_category_idx ON ingredients(category);
CREATE INDEX IF NOT EXISTS recipes_user_id_idx ON recipes(user_id);
CREATE INDEX IF NOT EXISTS recipe_ingredients_recipe_id_idx ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS weekly_plans_user_id_idx ON weekly_plans(user_id);
CREATE INDEX IF NOT EXISTS daily_meals_weekly_plan_id_idx ON daily_meals(weekly_plan_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_ingredients_updated_at 
  BEFORE UPDATE ON ingredients 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at 
  BEFORE UPDATE ON recipes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_plans_updated_at 
  BEFORE UPDATE ON weekly_plans 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();