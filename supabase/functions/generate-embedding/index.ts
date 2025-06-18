import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text } = await req.json()

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text parameter is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Simple embedding generation using text features
    // In a real implementation, you would use a proper embedding model
    const embedding = generateSimpleEmbedding(text)

    return new Response(
      JSON.stringify({ embedding }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error generating embedding:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate embedding' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function generateSimpleEmbedding(text: string): number[] {
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