// Keys come from .env (see .env.example). Never commit real keys to git.

export const GOOGLE_PLACES_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_API_KEY ?? '';

export const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
