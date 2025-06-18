/*
  # Fix Recipe Embeddings RLS Policy

  1. Security Changes
    - Add policy to allow authenticated users to insert recipe embeddings for dataset recipes
    - This enables the RAG service to generate and store embeddings for public dataset recipes
    - Maintains security by only allowing embeddings for recipes that don't belong to specific users

  2. Policy Details
    - Allow INSERT operations for authenticated users
    - Only for recipes where the source recipe has user_id IS NULL (dataset recipes)
    - Ensures users can't create embeddings for other users' personal recipes
*/

-- Add policy to allow authenticated users to insert embeddings for dataset recipes
CREATE POLICY "Authenticated users can insert embeddings for dataset recipes"
  ON recipe_embeddings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dataset_recipes 
      WHERE dataset_recipes.id = recipe_embeddings.recipe_id 
      AND dataset_recipes.user_id IS NULL
    )
  );