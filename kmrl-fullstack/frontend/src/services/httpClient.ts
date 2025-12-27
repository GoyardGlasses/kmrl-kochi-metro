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

  async get<T>(path: string, init?: RequestInit): Promise<T> {
    const url = this.buildUrl(path);
    logApiRequest("GET", path);
    try {
      const response = await fetch(url, {
        ...init,
        headers: { ...this.defaultHeaders, ...this.getAuthHeaders(), ...init?.headers },
      });
      if (!response.ok) {
        const error = `GET ${path} failed with ${response.status}`;
        logApiError("GET", path, { status: response.status });
        throw new Error(error);
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
        headers: { ...this.defaultHeaders, ...this.getAuthHeaders(), ...init?.headers },
      });
      if (!response.ok) {
        const error = `POST ${path} failed with ${response.status}`;
        logApiError("POST", path, { status: response.status });
        throw new Error(error);
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
        const error = `PATCH ${path} failed with ${response.status}`;
        logApiError("PATCH", path, { status: response.status });
        throw new Error(error);
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
        const error = `PUT ${path} failed with ${response.status}`;
        logApiError("PUT", path, { status: response.status });
        throw new Error(error);
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
        const error = `DELETE ${path} failed with ${response.status}`;
        logApiError("DELETE", path, { status: response.status });
        throw new Error(error);
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
