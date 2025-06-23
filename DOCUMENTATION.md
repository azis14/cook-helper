# Cook Helper - Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [Feature Flags System](#feature-flags-system)
6. [Authentication & Security](#authentication--security)
7. [AI Integration](#ai-integration)
8. [Development Setup](#development-setup)
9. [Deployment](#deployment)
10. [API Reference](#api-reference)
11. [Component Structure](#component-structure)
12. [Services & Utilities](#services--utilities)
13. [Troubleshooting](#troubleshooting)
14. [Contributing Guidelines](#contributing-guidelines)

## Project Overview

Cook Helper is a smart cooking assistant application built for Indonesian families. It helps users manage ingredients, discover recipes, and get AI-powered cooking recommendations.

### Key Features
- **Ingredient Management**: Track available ingredients with quantities, units, and expiry dates
- **Recipe Collection**: Create, edit, and manage personal recipe collections
- **AI Recipe Suggestions**: Get personalized recipe suggestions using Google's Gemini AI
- **RAG (Retrieval-Augmented Generation)**: Advanced semantic search using vector embeddings
- **Weekly Meal Planning**: Plan meals for the week and generate shopping lists
- **User Profiles**: Manage user accounts with customizable profiles
- **Feedback System**: Beta feedback collection for continuous improvement

## Architecture

### Frontend Architecture
```
src/
├── components/          # React components
├── hooks/              # Custom React hooks
├── lib/                # Core libraries and utilities
├── services/           # External service integrations
├── types/              # TypeScript type definitions
└── main.tsx           # Application entry point
```

### Backend Architecture
```
supabase/
├── functions/          # Edge functions
│   ├── generate-embedding/
│   └── sync-embeddings/
└── migrations/         # Database migrations
```

### Data Flow
1. **User Authentication**: Supabase Auth handles user registration/login
2. **Data Storage**: PostgreSQL with Row Level Security (RLS)
3. **AI Processing**: Google Gemini AI for recipe generation
4. **Vector Search**: pgvector for semantic recipe recommendations
5. **Background Jobs**: Edge functions for embedding synchronization

## Technology Stack

### Frontend
- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Fast build tool and development server
- **Lucide React**: Icon library

### Backend
- **Supabase**: Backend-as-a-Service platform
  - PostgreSQL database with pgvector extension
  - Authentication and authorization
  - Edge functions for serverless computing
  - Real-time subscriptions

### AI & ML
- **Google Gemini AI**: Recipe generation and content processing
- **pgvector**: Vector similarity search for RAG functionality
- **Custom Embedding Service**: Text-to-vector conversion

### Development Tools
- **ESLint**: Code linting
- **TypeScript**: Static type checking
- **PostCSS**: CSS processing
- **Autoprefixer**: CSS vendor prefixing

## Database Schema

### Core Tables

#### `ingredients`
User's ingredient inventory
```sql
- id (uuid, PK)
- name (text) - Ingredient name
- quantity (numeric) - Amount available
- unit (text) - Measurement unit
- category (text) - Ingredient category
- expiry_date (date, nullable) - Expiration date
- user_id (uuid, FK) - Owner reference
- created_at, updated_at (timestamps)
```

#### `recipes`
User's personal recipe collection
```sql
- id (uuid, PK)
- name (text) - Recipe name
- description (text) - Recipe description
- prep_time (integer) - Preparation time in minutes
- cook_time (integer) - Cooking time in minutes
- servings (integer) - Number of servings
- difficulty (enum) - easy, medium, hard
- instructions (text[]) - Step-by-step instructions
- tags (text[]) - Recipe tags
- user_id (uuid, FK) - Owner reference
- created_at, updated_at (timestamps)
```

#### `recipe_ingredients`
Ingredients required for recipes
```sql
- id (uuid, PK)
- recipe_id (uuid, FK) - Recipe reference
- name (text) - Ingredient name
- quantity (numeric) - Required amount
- unit (text) - Measurement unit
- created_at (timestamp)
```

#### `dataset_recipes`
Community recipe dataset
```sql
- id (uuid, PK)
- title (text) - Recipe title
- ingredients (text) - Raw ingredients data
- steps (text) - Raw cooking steps
- loves_count (integer) - Popularity score
- url (text, nullable) - Source URL
- user_id (uuid, nullable) - NULL for dataset recipes
- created_at, updated_at (timestamps)
```

#### `recipe_embeddings`
Vector embeddings for semantic search
```sql
- id (uuid, PK)
- recipe_id (uuid, FK) - Recipe reference
- embedding (vector(384)) - Vector representation
- content (text) - Original content
- created_at (timestamp)
```

### User Management

#### `user_profiles`
Extended user information
```sql
- id (uuid, PK)
- user_id (uuid, FK) - Auth user reference
- username (text, nullable, unique) - Display name
- full_name (text, nullable) - Full name
- avatar_url (text, nullable) - Profile picture
- created_at, updated_at (timestamps)
```

#### `user_feedback`
Beta feedback collection
```sql
- id (uuid, PK)
- user_id (uuid, FK, nullable) - User reference
- feedback_text (text) - Feedback content
- user_email (text, nullable) - Contact email
- page_url (text, nullable) - Source page
- user_agent (text, nullable) - Browser info
- is_read (boolean) - Admin read status
- created_at (timestamp)
```

### Planning System

#### `weekly_plans`
Weekly meal planning
```sql
- id (uuid, PK)
- week_start (date) - Week starting date
- user_id (uuid, FK) - Owner reference
- created_at, updated_at (timestamps)
```

#### `daily_meals`
Daily meal assignments
```sql
- id (uuid, PK)
- weekly_plan_id (uuid, FK) - Week reference
- date (date) - Meal date
- breakfast_recipe_id (uuid, FK, nullable)
- lunch_recipe_id (uuid, FK, nullable)
- dinner_recipe_id (uuid, FK, nullable)
- created_at (timestamp)
```

### System Configuration

#### `feature_flags`
Feature toggle system
```sql
- id (uuid, PK)
- name (text, unique) - Feature identifier
- enabled (boolean) - Feature status
- description (text, nullable) - Feature description
- created_at, updated_at (timestamps)
```

## Feature Flags System

The application uses a dynamic feature flag system to control feature availability:

### Available Features
- `dataset`: Recipe dataset access
- `suggestions`: AI recipe suggestions
- `rag`: RAG-based recommendations
- `weeklyPlanner`: Weekly meal planning

### Usage
```typescript
import { isFeatureEnabled, isFeatureEnabledSync } from './lib/featureFlags';

// Async check (loads from database)
const isEnabled = await isFeatureEnabled('dataset');

// Sync check (uses cached config)
const isEnabled = isFeatureEnabledSync('dataset');
```

### Management
Feature flags can be updated via:
1. Direct database updates
2. Admin interface (future enhancement)
3. Environment-based configuration

## Authentication & Security

### Row Level Security (RLS)
All tables implement RLS policies ensuring users can only access their own data:

```sql
-- Example policy
CREATE POLICY "Users can read own ingredients"
  ON ingredients
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

### Authentication Flow
1. **Sign Up/Sign In**: Email/password or Google OAuth
2. **Session Management**: Automatic token refresh
3. **Profile Creation**: Automatic profile creation on first login
4. **Password Reset**: Email-based password recovery

### Security Best Practices
- All API calls require authentication
- Sensitive operations use service role
- Input validation on all forms
- SQL injection prevention via parameterized queries

## AI Integration

### Google Gemini AI
Used for recipe generation and content processing.

#### Setup
```typescript
const geminiService = new GeminiService(apiKey);
const recipes = await geminiService.generateRecipeSuggestions(ingredients);
```

#### Features
- Recipe generation from available ingredients
- Indonesian cuisine focus
- Structured JSON responses
- Error handling and fallbacks

### RAG (Retrieval-Augmented Generation)
Combines vector search with AI processing for enhanced recommendations.

#### Components
1. **Embedding Generation**: Convert text to vectors
2. **Vector Storage**: pgvector database storage
3. **Similarity Search**: Find related recipes
4. **AI Enhancement**: Improve results with Gemini

#### Background Sync
Embeddings are generated via cron jobs:
```bash
# Trigger manual sync
curl -X POST "https://your-project.supabase.co/functions/v1/sync-embeddings"
```

## Development Setup

### Prerequisites
- Node.js 18+
- Supabase account
- Google AI API key (optional, for AI features)

### Environment Variables
Create `.env` file:
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

# Preview production build
npm run preview
```

### Database Setup
1. Create Supabase project
2. Run migrations: `supabase db push`
3. Enable pgvector extension
4. Set up authentication providers

## Deployment

### Frontend Deployment
The application is configured for deployment on:
- Netlify (primary)
- Vercel
- Static hosting services

### Build Configuration
```bash
# Production build
npm run build

# Output directory
dist/
```

### Environment Setup
1. Set environment variables in hosting platform
2. Configure domain settings
3. Enable HTTPS
4. Set up redirects for SPA routing

### Supabase Configuration
1. Configure authentication providers
2. Set up edge functions
3. Configure database policies
4. Set up cron jobs for background tasks

## API Reference

### Supabase Client
```typescript
import { supabase } from './lib/supabase';

// Example usage
const { data, error } = await supabase
  .from('ingredients')
  .select('*')
  .eq('user_id', userId);
```

### Edge Functions

#### `generate-embedding`
Generates vector embeddings for text content.
```typescript
const { data } = await supabase.functions.invoke('generate-embedding', {
  body: { text: 'recipe content' }
});
```

#### `sync-embeddings`
Background job to sync recipe embeddings.
```bash
curl -X POST "https://project.supabase.co/functions/v1/sync-embeddings"
```

### Vector Search Functions

#### `find_similar_recipes`
```sql
SELECT * FROM find_similar_recipes(
  query_embedding := vector_array,
  min_loves := 50,
  similarity_threshold := 0.3,
  match_count := 12
);
```

#### `search_recipes_by_text`
```sql
SELECT * FROM search_recipes_by_text(
  query_embedding := vector_array,
  similarity_threshold := 0.4,
  match_count := 10
);
```

## Component Structure

### Core Components

#### `App.tsx`
Main application component handling:
- Authentication state
- Feature flag loading
- Route management
- Global state

#### `Navigation.tsx`
Dynamic navigation based on feature flags:
- Tab visibility control
- Active state management
- Responsive design

#### `AuthForm.tsx`
Authentication interface:
- Email/password login
- Google OAuth integration
- Password reset flow
- Form validation

### Feature Components

#### `IngredientManager.tsx`
Ingredient inventory management:
- CRUD operations
- Category grouping
- Expiry date tracking
- Search and filtering

#### `RecipeManager.tsx`
Personal recipe collection:
- Recipe creation/editing
- Ingredient management
- Instruction handling
- Tag system

#### `RecipeSuggestions.tsx`
AI-powered recipe suggestions:
- Gemini AI integration
- Ingredient-based generation
- Recipe saving functionality
- Error handling

#### `RAGRecommendations.tsx`
Advanced AI recommendations:
- Vector similarity search
- AI-enhanced results
- Confidence scoring
- Semantic search

#### `WeeklyPlanner.tsx`
Meal planning interface:
- Weekly view
- Recipe assignment
- Shopping list generation
- Drag-and-drop functionality

### Utility Components

#### `Toast.tsx`
Notification system:
- Success/error messages
- Auto-dismiss functionality
- Animation support

#### `DeleteConfirmationModal.tsx`
Confirmation dialogs:
- Destructive action confirmation
- Loading states
- Accessibility support

#### `RecipeDetailModal.tsx`
Recipe viewing interface:
- Full recipe display
- Ingredient lists
- Step-by-step instructions
- Nutritional information

## Services & Utilities

### Core Services

#### `GeminiService`
Google AI integration:
```typescript
class GeminiService {
  async generateRecipeSuggestions(ingredients: Ingredient[]): Promise<Recipe[]>
  async generateShoppingList(recipes: Recipe[]): Promise<string[]>
  async getCookingTips(recipeName: string): Promise<string[]>
}
```

#### `RAGRecipeService`
Vector-based recommendations:
```typescript
class RAGRecipeService {
  async getRecommendations(ingredients: Ingredient[]): Promise<RAGRecipeRecommendation[]>
  async semanticSearch(query: string): Promise<RAGRecipeRecommendation[]>
  async triggerBackgroundSync(): Promise<{success: boolean; message: string}>
}
```

#### `SupabaseDatasetService`
Dataset recipe management:
```typescript
class SupabaseDatasetService {
  async getRecommendations(ingredients: Ingredient[]): Promise<RecipeRecommendation[]>
  async searchRecipes(query: string): Promise<DatasetRecipe[]>
  async getRecipeStats(): Promise<{total: number; avgLoves: number}>
}
```

### Custom Hooks

#### `useAuth`
Authentication state management:
```typescript
const { user, loading } = useAuth();
```

#### `useIngredients`
Ingredient data management:
```typescript
const { 
  ingredients, 
  loading, 
  addIngredient, 
  updateIngredient, 
  deleteIngredient 
} = useIngredients(userId);
```

#### `useRecipes`
Recipe data management:
```typescript
const { 
  recipes, 
  loading, 
  addRecipe, 
  updateRecipe, 
  deleteRecipe 
} = useRecipes(userId);
```

#### `useToast`
Notification management:
```typescript
const { showSuccess, showError, hideToast } = useToast();
```

### Utility Libraries

#### `featureFlags.ts`
Feature flag management:
```typescript
// Check feature availability
const isEnabled = await isFeatureEnabled('dataset');

// Preload for sync access
await preloadFeatureFlags();
const isEnabled = isFeatureEnabledSync('dataset');
```

#### `supabase.ts`
Database client and auth helpers:
```typescript
// Auth functions
await signUp(email, password);
await signIn(email, password);
await signOut();

// Database client
const { data } = await supabase.from('table').select('*');
```

## Troubleshooting

### Common Issues

#### 1. Authentication Problems
```typescript
// Check user session
const { data: { session } } = await supabase.auth.getSession();

// Refresh session
await supabase.auth.refreshSession();
```

#### 2. Database Connection Issues
```typescript
// Test connection
const { data, error } = await supabase
  .from('ingredients')
  .select('count(*)', { count: 'exact', head: true });
```

#### 3. AI Service Failures
```typescript
// Check API key
const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;
if (!apiKey) {
  console.error('Google AI API key not configured');
}

// Fallback handling
try {
  const result = await geminiService.generateRecipeSuggestions(ingredients);
} catch (error) {
  // Use fallback or show error message
}
```

#### 4. Vector Search Issues
```sql
-- Check embeddings exist
SELECT COUNT(*) FROM recipe_embeddings;

-- Test vector function
SELECT * FROM find_similar_recipes(
  ARRAY[0.1, 0.2, ...]::vector(384),
  50, 0.3, 5
);
```

### Performance Optimization

#### 1. Database Queries
- Use appropriate indexes
- Limit result sets
- Implement pagination
- Cache frequently accessed data

#### 2. Frontend Performance
- Lazy load components
- Implement virtual scrolling for large lists
- Optimize image loading
- Use React.memo for expensive components

#### 3. AI Service Optimization
- Batch AI requests
- Implement request caching
- Use background processing
- Set appropriate timeouts

### Debugging Tools

#### 1. Browser DevTools
- Network tab for API calls
- Console for error messages
- Application tab for local storage

#### 2. Supabase Dashboard
- Real-time logs
- Database explorer
- Authentication logs
- Edge function logs

#### 3. Feature Flag Testing
```typescript
// Override feature flags for testing
localStorage.setItem('feature-flags-override', JSON.stringify({
  dataset: true,
  rag: false
}));
```

## Contributing Guidelines

### Code Style
- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for formatting
- Write descriptive commit messages

### Component Guidelines
- Keep components under 300 lines
- Use functional components with hooks
- Implement proper error boundaries
- Add loading states for async operations

### Database Guidelines
- Always use RLS policies
- Create migrations for schema changes
- Add appropriate indexes
- Document complex queries

### Testing Guidelines
- Write unit tests for utilities
- Test component rendering
- Validate API integrations
- Test error scenarios

### Security Guidelines
- Validate all user inputs
- Use parameterized queries
- Implement proper authentication
- Regular security audits

### Performance Guidelines
- Optimize database queries
- Implement proper caching
- Monitor bundle size
- Use performance profiling tools

---

## Quick Start Checklist

### For New Developers
- [ ] Clone repository
- [ ] Install dependencies (`npm install`)
- [ ] Set up environment variables
- [ ] Run development server (`npm run dev`)
- [ ] Familiarize with component structure
- [ ] Review database schema
- [ ] Test authentication flow

### For Feature Development
- [ ] Check feature flags
- [ ] Review related components
- [ ] Understand data flow
- [ ] Test with real data
- [ ] Implement error handling
- [ ] Add loading states
- [ ] Update documentation

### For Deployment
- [ ] Run production build
- [ ] Test all features
- [ ] Verify environment variables
- [ ] Check database migrations
- [ ] Monitor performance
- [ ] Set up monitoring
- [ ] Document deployment process

---

This documentation should be updated as the project evolves. For questions or clarifications, please refer to the code comments or reach out to the development team.