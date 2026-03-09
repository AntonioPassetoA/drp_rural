import { User } from '@/types/database'

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignUpData {
  email: string
  password: string
  full_name: string
}

export interface ResetPasswordData {
  email: string
}

export interface UpdatePasswordData {
  password: string
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
}

export interface AuthResponse {
  success: boolean
  error?: string
  user?: User
}
