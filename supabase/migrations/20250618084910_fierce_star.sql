/*
  # Create vector search functions for recipe recommendations

  1. Functions
    - `find_similar_recipes` - Find recipes similar to user ingredients
    - `search_recipes_by_text` - Search recipes by text query using embeddings

  2. These functions use pgvector's cosine similarity for efficient vector search
*/

-- Function to find similar recipes based on ingredient embeddings
CREATE OR REPLACE FUNCTION find_similar_recipes(
  query_embedding vector(384),
  min_loves integer DEFAULT 50,
  similarity_threshold float DEFAULT 0.3,
  match_count integer DEFAULT 12
)
RETURNS TABLE (
  id uuid,
  title text,
  ingredients text,
  steps text,
  loves_count integer,
  url text,
  similarity_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dr.id,
    dr.title,
    dr.ingredients,
    dr.steps,
    dr.loves_count,
    dr.url,
    1 - (re.embedding <=> query_embedding) as similarity_score
  FROM dataset_recipes dr
  JOIN recipe_embeddings re ON dr.id = re.recipe_id
  WHERE dr.user_id IS NULL
    AND dr.loves_count >= min_loves
    AND 1 - (re.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY re.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to search recipes by text query
CREATE OR REPLACE FUNCTION search_recipes_by_text(
  query_embedding vector(384),
  similarity_threshold float DEFAULT 0.4,
  match_count integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  ingredients text,
  steps text,
  loves_count integer,
  url text,
  similarity_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dr.id,
    dr.title,
    dr.ingredients,
    dr.steps,
    dr.loves_count,
    dr.url,
    1 - (re.embedding <=> query_embedding) as similarity_score
  FROM dataset_recipes dr
  JOIN recipe_embeddings re ON dr.id = re.recipe_id
  WHERE dr.user_id IS NULL
    AND 1 - (re.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY re.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION find_similar_recipes TO authenticated;
GRANT EXECUTE ON FUNCTION search_recipes_by_text TO authenticated;