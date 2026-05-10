import { create } from 'zustand'
import { login as apiLogin, register as apiRegister, getMe, type UserResponse } from '../api/auth'

const TOKEN_KEY = 'classycut_token'

interface AuthState {
  token: string | null
  user: UserResponse | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const { access_token } = await apiLogin(email, password)
      localStorage.setItem(TOKEN_KEY, access_token)
      const user = await getMe()
      set({ token: access_token, user, isLoading: false })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed'
      set({ error: message, isLoading: false })
      throw err
    }
  },

  register: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const { access_token } = await apiRegister(email, password)
      localStorage.setItem(TOKEN_KEY, access_token)
      const user = await getMe()
      set({ token: access_token, user, isLoading: false })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      set({ error: message, isLoading: false })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    set({ token: null, user: null, error: null })
  },

  loadUser: async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return
    try {
      const user = await getMe()
      set({ user, token })
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      set({ token: null, user: null })
    }
  },
}))
