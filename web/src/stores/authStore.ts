import { create } from 'zustand'
import { Credentials, AuthTestResult } from '../types/api'
import { api } from '../utils/api'

interface AuthState {
  isAuthenticated: boolean
  credentials: Credentials | null
  currentUser: AuthTestResult | null
  testAuth: () => Promise<{ success: boolean; user?: AuthTestResult; error?: string }>
  setupAuth: (creds: Credentials, profileName: string) => Promise<{ success: boolean; user?: AuthTestResult; error?: string }>
}

export const useAuthStore = create<AuthState>()((set) => ({
  isAuthenticated: false,
  credentials: null,
  currentUser: null,
  
  testAuth: async () => {
    try {
      const response = await api.post('/auth/test')
      set({ 
        isAuthenticated: true, 
        currentUser: response.data,
      })
      return { success: true, user: response.data }
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.error || error.message 
      }
    }
  },
  
  setupAuth: async (creds: Credentials, profileName: string) => {
    try {
      const response = await api.post('/auth/setup', {
        ...creds,
        name: profileName,
      })
      set({ 
        isAuthenticated: true, 
        currentUser: response.data 
      })
      return { success: true, user: response.data }
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.error || error.message 
      }
    }
  },
}))