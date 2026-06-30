export interface Bindings {
  DB: D1Database;
  IMAGES: R2Bucket;
  AI: Ai;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SENTRY_DSN: string;
  OPENAI_API_KEY: string;
  DEV_LOGIN?: string;
}

export interface AppEnv {
  Bindings: Bindings;
  Variables: {
    userId?: string;
  };
}
