import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000", 10),
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/kmrl",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-key",
  jwtExpire: process.env.JWT_EXPIRE || "7d",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:8081",
};

export const isDev = env.nodeEnv === "development";
export const isProd = env.nodeEnv === "production";
