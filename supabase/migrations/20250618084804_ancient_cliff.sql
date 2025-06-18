/*
  # Create recipe embeddings table with pgvector support

  1. New Tables
    - `recipe_embeddings`
      - `id` (uuid, primary key)
      - `recipe_id` (uuid, foreign key to dataset_recipes)
      - `embedding` (vector(384) for storing embeddings)
      - `content` (text, the original content that was embedded)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `recipe_embeddings` table
    - Add policy for authenticated users to read embeddings

  3. Indexes
    - Create vector similarity index for efficient similarity search
    - Create index on recipe_id for fast lookups

  4. Extensions
    - Enable pgvector extension for vector operations
*/

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the recipe_embeddings table
CREATE TABLE IF NOT EXISTS recipe_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES dataset_recipes(id) ON DELETE CASCADE,
  embedding vector(384) NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create unique index to prevent duplicate embeddings for the same recipe
CREATE UNIQUE INDEX IF NOT EXISTS recipe_embeddings_recipe_id_idx 
  ON recipe_embeddings (recipe_id);

-- Create vector similarity index for efficient similarity search
CREATE INDEX IF NOT EXISTS recipe_embeddings_embedding_idx 
  ON recipe_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Enable Row Level Security
ALTER TABLE recipe_embeddings ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read embeddings
CREATE POLICY "Authenticated users can read recipe embeddings"
  ON recipe_embeddings
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for service role to manage embeddings
CREATE POLICY "Service role can manage recipe embeddings"
  ON recipe_embeddings
  FOR ALL
  TO service_role
  USING (true);