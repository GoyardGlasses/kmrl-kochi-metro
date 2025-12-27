type EnvKey = "VITE_APP_NAME" | "VITE_API_BASE_URL" | "VITE_ENABLE_MOCK_API";

const getEnv = (key: EnvKey, fallback?: string) => {
  const value = import.meta.env[key];
  if (value === undefined || value === "") {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const appEnv = {
  appName: getEnv("VITE_APP_NAME", "KMRL Decision Support"),
  apiBaseUrl: getEnv("VITE_API_BASE_URL", "http://localhost:3000/api"),
  enableMockApi: getEnv("VITE_ENABLE_MOCK_API", "false") !== "false",
};

export type AppEnv = typeof appEnv;
