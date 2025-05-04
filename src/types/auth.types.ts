import { Request } from "express";

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordWithTokenRequest {
  password: string;
  token: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface UserResponse {
  id: string;
  email: string;
  roles: string[];
  created_at?: string;
  last_sign_in_at?: string;
  avatar_url?: string;
  bio?: string;
}

export interface AuthResponse {
  message: string;
  user?: UserResponse;
  session?: SessionResponse;
}

export interface SessionResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

// Custom type to extend Express Request
export interface AuthenticatedRequest extends Request {
  user?: UserResponse;
}
