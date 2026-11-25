import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: (() => {
    const value = process.env.JWT_SECRET;
    if (process.env.NODE_ENV === "production" && (!value || value.length < 32)) {
      throw new Error("JWT_SECRET must be set to a random value of at least 32 characters in production");
    }
    return value ?? "local-development-only-secret-not-for-production";
  })(),
};
