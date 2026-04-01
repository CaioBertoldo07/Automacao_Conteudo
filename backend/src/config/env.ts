import "dotenv/config";
import path from "path";

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória não definida: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  secretKey: required("SECRET_KEY"),
  accessTokenExpireMinutes: parseInt(optional("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"), 10),

  appEnv: optional("APP_ENV", "development"),
  appPort: parseInt(optional("APP_PORT", "8000"), 10),
  corsOrigins: optional("CORS_ORIGINS", "http://localhost:5173").split(",").map((o) => o.trim()),

  redisUrl: optional("REDIS_URL", "redis://localhost:6379"),

  anthropicApiKey: optional("ANTHROPIC_API_KEY", ""),
  googleApiKey: optional("GOOGLE_API_KEY", ""),
  googleImageModel: optional("GOOGLE_IMAGE_MODEL", "gemini-2.5-flash-image"),
  veoApiKey: optional("VEO_API_KEY", ""),

  // Local filesystem storage for generated media (Phase 5).
  // MEDIA_DIR: absolute or relative path to the uploads folder.
  // Relative paths are resolved from the current working directory (project root).
  mediaDir: path.resolve(optional("MEDIA_DIR", "uploads")),
} as const;
