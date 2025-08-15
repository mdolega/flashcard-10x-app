import type { User, Session } from "@supabase/supabase-js";

// DTO Types for API requests
export interface RegisterDTO {
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordDTO {
  email: string;
}

export interface UpdatePasswordDTO {
  token: string;
  newPassword: string;
}

// API Response Types
export interface AuthResponse {
  user: User;
  session: Session;
}

export interface ErrorResponse {
  status: number;
  message: string;
}

// Form validation types
export interface AuthFormErrors {
  email?: string;
  password?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

// Form state types
export interface LoginFormState {
  email: string;
  password: string;
  errors: AuthFormErrors;
  isLoading: boolean;
}

export interface RegisterFormState {
  email: string;
  password: string;
  confirmPassword: string;
  errors: AuthFormErrors;
  isLoading: boolean;
}

export interface ChangePasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  errors: AuthFormErrors;
  isLoading: boolean;
}

export interface ResetPasswordFormState {
  email: string;
  errors: AuthFormErrors;
  isLoading: boolean;
  isSuccess: boolean;
}

export interface UpdatePasswordFormState {
  newPassword: string;
  confirmPassword: string;
  errors: AuthFormErrors;
  isLoading: boolean;
}

// User context types
export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}
