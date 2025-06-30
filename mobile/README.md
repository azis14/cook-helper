# Cook Helper Mobile App

A React Native mobile application built with Expo for the Cook Helper cooking assistant.

## Features

- **Ingredient Management**: Add, edit, and manage your ingredients
- **Recipe Collection**: Create and manage your personal recipes
- **AI Recipe Suggestions**: Get AI-powered recipe suggestions based on available ingredients
- **Weekly Meal Planning**: Plan your meals for the week

## Getting Started

### Prerequisites

- Node.js (version 16 or later)
- Expo CLI (`npm install -g @expo/cli`)
- Expo Go app on your mobile device (for testing)

### Installation

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Supabase:
   - Open `src/lib/supabase.ts`
   - Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` with your actual Supabase credentials

### Running the App

1. Start the Expo development server:
   ```bash
   npm start
   ```

2. Use the Expo Go app to scan the QR code and run the app on your device

### Building for Production

1. For Android:
   ```bash
   expo build:android
   ```

2. For iOS:
   ```bash
   expo build:ios
   ```

## Project Structure

```
mobile/
├── src/
│   ├── components/          # Reusable UI components
│   ├── contexts/           # React contexts for state management
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility libraries and configurations
│   └── screens/            # Main app screens
├── App.tsx                 # Main app component
├── app.json               # Expo configuration
└── package.json           # Dependencies and scripts
```

## Key Components

- **AuthScreen**: User authentication (login/signup)
- **IngredientsScreen**: Ingredient management
- **RecipesScreen**: Recipe collection management
- **SuggestionsScreen**: AI-powered recipe suggestions
- **WeeklyPlannerScreen**: Weekly meal planning

## Configuration

The app uses the same Supabase backend as the web application. Make sure to:

1. Set up your Supabase project
2. Configure the database schema (use the same migrations as the web app)
3. Update the Supabase credentials in `src/lib/supabase.ts`

## Notes

- This mobile app shares the same backend and database with the web application
- All features are designed to work offline-first where possible
- The UI is optimized for mobile devices with touch-friendly interactions
- Uses React Navigation for navigation between screens
- Implements proper authentication flow with Supabase Auth