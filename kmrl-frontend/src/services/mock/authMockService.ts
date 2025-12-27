import type { AdminCredentials, AuthResponse } from "@/types";
import type { AuthService } from "../types";

const STORAGE_KEY = "mock_admin_user";
const TOKEN_KEY = "mock_admin_token";

const generateToken = (email: string) =>
  btoa(`${email}:${Date.now()}:${Math.random().toString(36).slice(2)}`);

const toAuthResponse = (email: string): AuthResponse => ({
  token: generateToken(email),
  user: {
    id: email,
    email,
  },
});

export class AuthMockService implements AuthService {
  async login(credentials: AdminCredentials): Promise<AuthResponse> {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      throw new Error("No admin account exists");
    }
    const admin: AdminCredentials = JSON.parse(stored);
    if (admin.email !== credentials.email || admin.password !== credentials.password) {
      throw new Error("Invalid credentials");
    }
    const response = toAuthResponse(credentials.email);
    localStorage.setItem(TOKEN_KEY, response.token);
    return response;
  }

  async signup(credentials: AdminCredentials): Promise<AuthResponse> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
    const response = toAuthResponse(credentials.email);
    localStorage.setItem(TOKEN_KEY, response.token);
    return response;
  }

  async logout(): Promise<void> {
    localStorage.removeItem(TOKEN_KEY);
  }

  async refresh(): Promise<AuthResponse | null> {
    const token = localStorage.getItem(TOKEN_KEY);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!token || !stored) {
      return null;
    }
    const admin: AdminCredentials = JSON.parse(stored);
    return {
      token,
      user: {
        id: admin.email,
        email: admin.email,
      },
    };
  }
}
