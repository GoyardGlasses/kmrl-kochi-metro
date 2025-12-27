export interface AdminCredentials {
  email: string;
  password: string;
}

export interface AdminUser {
  id: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: AdminUser;
}
