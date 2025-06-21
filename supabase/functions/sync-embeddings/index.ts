import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RecipeData {
  id: string;
  title: string;
  ingredients: string;
  steps: string;
}

interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  description?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting embedding synchronization...')

    // Check if dataset feature is enabled
    const isDatasetEnabled = await checkDatasetFeature(supabase)
    if (!isDatasetEnabled) {
      console.log('Dataset feature is disabled, but sync will continue for maintenance')
      // Note: We still allow sync to run for maintenance purposes
      // The frontend will respect the feature flag for user access
    }

    // Get recipes that don't have embeddings yet
    const { data: existingEmbeddings, error: embeddingError } = await supabase
      .from('recipe_embeddings')
      .select('recipe_id')

    if (embeddingError) {
      throw new Error(`Failed to fetch existing embeddings: ${embeddingError.message}`)
    }

    const existingRecipeIds = new Set(existingEmbeddings?.map(e => e.recipe_id) || [])

    // Get popular recipes that need embeddings
    const { data: recipes, error: recipesError } = await supabase
      .from('dataset_recipes')
      .select('id, title, ingredients, steps')
      .is('user_id', null)
      .gte('loves_count', 50)
      .order('loves_count', { ascending: false })
      .limit(500) // Process up to 500 recipes per run

    if (recipesError) {
      throw new Error(`Failed to fetch recipes: ${recipesError.message}`)
    }

    if (!recipes || recipes.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No recipes found to process',
          processed: 0,
          datasetEnabled: isDatasetEnabled
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Filter out recipes that already have embeddings
    const recipesToProcess = recipes.filter(recipe => !existingRecipeIds.has(recipe.id))

    if (recipesToProcess.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'All recipes already have embeddings',
          processed: 0,
          total: recipes.length,
          datasetEnabled: isDatasetEnabled
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing ${recipesToProcess.length} recipes without embeddings...`)

    // Process recipes in batches to avoid timeouts
    const batchSize = 20
    let totalProcessed = 0
    const errors: string[] = []

    for (let i = 0; i < recipesToProcess.length; i += batchSize) {
      const batch = recipesToProcess.slice(i, i + batchSize)
      
      try {
        const batchResults = await processBatch(batch, supabase)
        totalProcessed += batchResults.processed
        errors.push(...batchResults.errors)
        
        // Add small delay between batches to avoid overwhelming the system
        if (i + batchSize < recipesToProcess.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`Error processing batch ${i}-${i + batchSize}:`, error)
        errors.push(`Batch ${i}-${i + batchSize}: ${error.message}`)
      }
    }

    const response = {
      success: true,
      message: `Embedding synchronization completed`,
      totalRecipes: recipes.length,
      recipesNeedingEmbeddings: recipesToProcess.length,
      processed: totalProcessed,
      datasetEnabled: isDatasetEnabled,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    }

    console.log('Sync completed:', response)

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function checkDatasetFeature(supabase: any): Promise<boolean> {
  try {
    // Check feature flag from database
    const { data: featureFlags, error } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('name', 'dataset')
      .single()

    if (error) {
      console.warn('Could not fetch dataset feature flag:', error.message)
      return true // Default to enabled for sync operations
    }

    const isEnabled = featureFlags?.enabled ?? true
    console.log(`Dataset feature flag: ${isEnabled ? 'enabled' : 'disabled'}`)
    return isEnabled
  } catch (error) {
    console.warn('Error checking dataset feature flag:', error)
    return true // Default to enabled for sync operations
  }
}

async function processBatch(
  recipes: RecipeData[], 
  supabase: any
): Promise<{ processed: number; errors: string[] }> {
  const embeddingsToInsert = []
  const errors: string[] = []

  for (const recipe of recipes) {
    try {
      const content = createRecipeContent(recipe)
      const embedding = await generateEmbedding(content)
      
      embeddingsToInsert.push({
        recipe_id: recipe.id,
        embedding: embedding,
        content: content
      })
    } catch (error) {
      console.error(`Error processing recipe ${recipe.id}:`, error)
      errors.push(`Recipe ${recipe.id}: ${error.message}`)
    }
  }

  // Insert embeddings into database
  if (embeddingsToInsert.length > 0) {
    const { error } = await supabase
      .from('recipe_embeddings')
      .upsert(embeddingsToInsert, { 
        onConflict: 'recipe_id',
        ignoreDuplicates: false 
      })

    if (error) {
      console.error('Database insertion error:', error)
      errors.push(`Database insertion: ${error.message}`)
      return { processed: 0, errors }
    }

    console.log(`Successfully inserted ${embeddingsToInsert.length} embeddings`)
  }

  return { 
    processed: embeddingsToInsert.length, 
    errors 
  }
}

function createRecipeContent(recipe: RecipeData): string {
  const parts = [
    recipe.title || '',
    recipe.ingredients || '',
    recipe.steps || '',
  ]
  
  return parts
    .filter(part => part && part.length > 0)
    .join(' ')
    .substring(0, 2000) // Limit total content length
}

async function generateEmbedding(text: string): Promise<number[]> {
  const EMBEDDING_DIMENSION = 384
  const words = text.toLowerCase().split(/\s+/)
  const embedding = new Array(EMBEDDING_DIMENSION).fill(0)
  
  // Create features based on text characteristics
  words.forEach((word, index) => {
    if (word.length > 2) {
      // Hash-based positioning
      const hash = simpleHash(word)
      const position = Math.abs(hash) % EMBEDDING_DIMENSION
      
      // Weight by position and word frequency
      embedding[position] += 1 / (index + 1)
      
      // Add character-level features
      for (let i = 0; i < word.length - 1; i++) {
        const bigramHash = simpleHash(word.substring(i, i + 2))
        const bigramPos = Math.abs(bigramHash) % EMBEDDING_DIMENSION
        embedding[bigramPos] += 0.5 / (index + 1)
      }
    }
  })

  // Add text-level features
  embedding[0] = words.length / 100 // Text length feature
  embedding[1] = (text.match(/[a-zA-Z]/g) || []).length / text.length // Letter ratio
  embedding[2] = (text.match(/\d/g) || []).length / text.length // Digit ratio
  
  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
  if (magnitude > 0) {
    return embedding.map(val => val / magnitude)
  }
  
  return embedding
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash
}