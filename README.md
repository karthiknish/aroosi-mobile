# Aroosi Mobile

React Native/Expo mobile app for the Aroosi Afghan matrimony platform.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`

4. Start the development server:
```bash
npm start
```

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Start the app on Android
- `npm run ios` - Start the app on iOS 
- `npm run convex:dev` - Start Convex development environment
- `npm run convex:deploy` - Deploy Convex functions

## Technologies

- **React Native** - Mobile app framework
- **Expo** - Development platform and tools
- **TypeScript** - Type safety
- **Convex** - Real-time backend database
- **React Query** - Server state management
- **React Hook Form** - Form handling
- **Zod** - Schema validation

## Architecture

- `/components` - Reusable UI components
- `/constants` - App constants and configuration
- `/hooks` - Custom React hooks
- `/services` - External service integrations
- `/types` - TypeScript type definitions
- `/utils` - Utility functions
- `/convex` - Backend database functions

## Development

This is a standalone mobile app that connects to the same Convex backend as the web application but operates independently with its own mobile-optimized UI and navigation.