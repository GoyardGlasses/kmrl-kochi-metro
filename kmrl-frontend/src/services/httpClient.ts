import { appEnv } from "@/config/env";
import { logApiRequest, logApiResponse, logApiError } from "@/lib/logger";

export interface HttpClientOptions {
  baseURL?: string;
  headers?: Record<string, string>;
}

export class HttpClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(options?: HttpClientOptions) {
    this.baseURL = options?.baseURL ?? appEnv.apiBaseUrl;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...options?.headers,
    };
  }

  private buildUrl(path: string) {
    return `${this.baseURL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  }

  private getAuthHeaders() {
    const token = localStorage.getItem("auth_token");
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }

  private shouldSkipAuth(path: string): boolean {
    return path.includes('/ingestion/run-now/');
  }

  async get<T>(path: string, init?: RequestInit): Promise<T> {
    const url = this.buildUrl(path);
    logApiRequest("GET", path);
    try {
      const response = await fetch(url, {
        ...init,
        headers: { ...this.defaultHeaders, ...this.getAuthHeaders(), ...init?.headers },
      });
      if (!response.ok) {
        let errorMessage = `GET ${path} failed with ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // If response is not JSON, use default error message
        }
        logApiError("GET", path, { status: response.status, error: errorMessage });
        throw new Error(errorMessage);
      }
      const data = await response.json() as T;
      logApiResponse("GET", path, response.status, data);
      return data;
    } catch (error) {
      logApiError("GET", path, error);
      throw error;
    }
  }

  async post<T, B = unknown>(path: string, body?: B, init?: RequestInit): Promise<T> {
    const url = this.buildUrl(path);
    logApiRequest("POST", path, body);
    try {
      const response = await fetch(url, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
        ...init,
        headers: { 
          ...this.defaultHeaders, 
          ...(this.shouldSkipAuth(path) ? {} : this.getAuthHeaders()), 
          ...init?.headers 
        },
      });
      if (!response.ok) {
        let errorMessage = `POST ${path} failed with ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.errors && Array.isArray(errorData.errors)) {
            errorMessage = errorData.errors.map((e: any) => e.msg || e.message || String(e)).join(", ");
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.details) {
            errorMessage = errorData.details;
          }
        } catch {
          // If response is not JSON, use default error message
        }
        logApiError("POST", path, { status: response.status, error: errorMessage });
        throw new Error(errorMessage);
      }
      const data = await response.json() as T;
      logApiResponse("POST", path, response.status, data);
      return data;
    } catch (error) {
      logApiError("POST", path, error);
      throw error;
    }
  }

  async patch<T, B = unknown>(path: string, body?: B, init?: RequestInit): Promise<T> {
    const url = this.buildUrl(path);
    logApiRequest("PATCH", path, body);
    try {
      const response = await fetch(url, {
        method: "PATCH",
        body: body ? JSON.stringify(body) : undefined,
        ...init,
        headers: { ...this.defaultHeaders, ...this.getAuthHeaders(), ...init?.headers },
      });
      if (!response.ok) {
        let errorMessage = `PATCH ${path} failed with ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // If response is not JSON, use default error message
        }
        logApiError("PATCH", path, { status: response.status, error: errorMessage });
        throw new Error(errorMessage);
      }
      const data = await response.json() as T;
      logApiResponse("PATCH", path, response.status, data);
      return data;
    } catch (error) {
      logApiError("PATCH", path, error);
      throw error;
    }
  }

  async put<T, B = unknown>(path: string, body?: B, init?: RequestInit): Promise<T> {
    const url = this.buildUrl(path);
    logApiRequest("PUT", path, body);
    try {
      const response = await fetch(url, {
        method: "PUT",
        body: body ? JSON.stringify(body) : undefined,
        ...init,
        headers: { ...this.defaultHeaders, ...this.getAuthHeaders(), ...init?.headers },
      });
      if (!response.ok) {
        let errorMessage = `PUT ${path} failed with ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // If response is not JSON, use default error message
        }
        logApiError("PUT", path, { status: response.status, error: errorMessage });
        throw new Error(errorMessage);
      }
      const data = await response.json() as T;
      logApiResponse("PUT", path, response.status, data);
      return data;
    } catch (error) {
      logApiError("PUT", path, error);
      throw error;
    }
  }

  async delete<T>(path: string, init?: RequestInit): Promise<T> {
    const url = this.buildUrl(path);
    logApiRequest("DELETE", path);
    try {
      const response = await fetch(url, {
        method: "DELETE",
        ...init,
        headers: { ...this.defaultHeaders, ...this.getAuthHeaders(), ...init?.headers },
      });
      if (!response.ok) {
        let errorMessage = `DELETE ${path} failed with ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // If response is not JSON, use default error message
        }
        logApiError("DELETE", path, { status: response.status, error: errorMessage });
        throw new Error(errorMessage);
      }
      const data = await response.json() as T;
      logApiResponse("DELETE", path, response.status, data);
      return data;
    } catch (error) {
      logApiError("DELETE", path, error);
      throw error;
    }
  }
}

export const httpClient = new HttpClient();
