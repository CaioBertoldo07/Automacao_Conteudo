import "dotenv/config";

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
} as const;
