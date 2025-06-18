# Cook Assistant - Smart Recipe Application

A smart cooking assistant application built with React, TypeScript, and Supabase that helps users manage ingredients, discover recipes, and get AI-powered recommendations.

## Features

### 🥘 Core Features
- **Ingredient Management**: Track your available ingredients with quantities, units, and expiry dates
- **Recipe Collection**: Create, edit, and manage your personal recipe collection
- **Weekly Meal Planning**: Plan your meals for the week and generate shopping lists

### 🤖 AI-Powered Features
- **AI Recipe Suggestions**: Get personalized recipe suggestions using Google's Gemini AI
- **Dataset Recommendations**: Discover popular recipes from a curated dataset
- **RAG (Retrieval-Augmented Generation)**: Advanced semantic search using vector embeddings

### 🔍 Smart Search
- **Semantic Search**: Find recipes based on meaning, not just keywords
- **Vector Similarity**: Uses pgvector for efficient similarity search
- **Background Sync**: Embeddings are generated and updated automatically via cron jobs

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI/ML**: Google Gemini AI, pgvector for embeddings
- **Icons**: Lucide React
- **Build Tool**: Vite

## Database Schema

### Core Tables
- `ingredients` - User's ingredient inventory
- `recipes` - User's personal recipes
- `recipe_ingredients` - Recipe ingredient relationships
- `weekly_plans` - Weekly meal planning
- `daily_meals` - Daily meal assignments

### Dataset & AI Tables
- `dataset_recipes` - Curated recipe dataset
- `recipe_embeddings` - Vector embeddings for semantic search

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- Supabase account
- Google AI API key (for Gemini)

### Environment Variables
Create a `.env` file with:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_AI_API_KEY=your_google_ai_api_key
```

### Installation
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Database Setup
The application includes Supabase migrations that will:
1. Create all necessary tables
2. Set up Row Level Security (RLS) policies
3. Enable pgvector extension
4. Create vector similarity functions

## Background Embedding Sync

The application uses a background cron job to generate and sync recipe embeddings:

### Edge Function: `sync-embeddings`
- Processes recipes without embeddings
- Generates vector embeddings for semantic search
- Runs automatically via cron job
- Can be triggered manually for testing

### Cron Job Setup
Set up a cron job to call the sync function regularly:
```bash
# Run every 6 hours
0 */6 * * * curl -X POST "https://your-project.supabase.co/functions/v1/sync-embeddings" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Features Overview

### 1. Ingredient Manager
- Add ingredients with quantities, units, and categories
- Track expiry dates
- Organize by categories (vegetables, meat, dairy, etc.)

### 2. Recipe Manager
- Create detailed recipes with ingredients and instructions
- Set cooking times, difficulty levels, and serving sizes
- Add tags for easy categorization

### 3. AI Recipe Suggestions
- Uses Google Gemini AI to generate recipes based on available ingredients
- Provides Indonesian-style recipes with local ingredients
- Saves generated recipes to your collection

### 4. Dataset Recommendations
- Recommends recipes from a curated dataset of popular recipes
- Filters by ingredient availability and popularity
- Shows match scores and reasons for recommendations

### 5. RAG Recipe Intelligence
- Advanced semantic search using vector embeddings
- Understands context and meaning beyond keyword matching
- Background processing ensures fast response times
- Confidence scoring for recommendation quality

### 6. Weekly Meal Planner
- Plan meals for the entire week
- Automatically generate shopping lists
- Track what ingredients you already have

## Architecture Highlights

### Vector Search Implementation
- Uses pgvector extension for efficient similarity search
- 384-dimensional embeddings for recipe content
- Cosine similarity for finding related recipes
- Background sync prevents user-facing delays

### Row Level Security
- Comprehensive RLS policies for data protection
- Users can only access their own data
- Service role for background operations
- Public access for dataset recipes

### Performance Optimizations
- Background embedding generation
- Efficient vector indexing
- Caching strategies for embeddings
- Fallback mechanisms for reliability

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.