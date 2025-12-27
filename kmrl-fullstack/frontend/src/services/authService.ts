import type { AdminCredentials, AuthResponse } from "@/types";
import type { AuthService } from "./types";
import { httpClient } from "./httpClient";

export class AuthService implements AuthService {
  async login(credentials: AdminCredentials): Promise<AuthResponse> {
    const response = await httpClient.post<AuthResponse>("/auth/login", credentials);
    localStorage.setItem("auth_token", response.token);
    return response;
  }

  async signup(credentials: AdminCredentials): Promise<AuthResponse> {
    const response = await httpClient.post<AuthResponse>("/auth/signup", credentials);
    localStorage.setItem("auth_token", response.token);
    return response;
  }

  async logout(): Promise<void> {
    localStorage.removeItem("auth_token");
  }

  async refresh(): Promise<AuthResponse | null> {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        return null;
      }
      const response = await httpClient.post<AuthResponse>("/auth/refresh", {});
      localStorage.setItem("auth_token", response.token);
      return response;
    } catch {
      localStorage.removeItem("auth_token");
      return null;
    }
  }
}
