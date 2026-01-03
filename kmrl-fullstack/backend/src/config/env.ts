import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000", 10),
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/kmrl",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-key",
  jwtExpire: process.env.JWT_EXPIRE || "7d",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:8080",
  maximoJobCardsCsvPath: process.env.MAXIMO_JOBCARDS_CSV_PATH || "C:/kmrl-imports/maximo/jobcards.csv",
  maximoJobCardsSchedule: process.env.MAXIMO_JOBCARDS_SCHEDULE || "21:30",
  fitnessJsonPath: process.env.FITNESS_JSON_PATH || "C:/kmrl-imports/fitness/fitness.json",
  fitnessSchedule: process.env.FITNESS_SCHEDULE || "21:35",
  unsIngestToken: process.env.UNS_INGEST_TOKEN || "dev-uns-token",
  unsSignatureMaxSkewMs: parseInt(process.env.UNS_SIGNATURE_MAX_SKEW_MS || "300000", 10),

  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: process.env.SMTP_PORT || "",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "",
  smtpSecure: process.env.SMTP_SECURE || "",

  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  twilioFrom: process.env.TWILIO_FROM || "",
};

export const isDev = env.nodeEnv === "development";
export const isProd = env.nodeEnv === "production";
