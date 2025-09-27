import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Credentials, AuthTestResult } from '../types/api'
import { api } from '../utils/api'

interface AuthState {
  isAuthenticated: boolean
  credentials: Credentials | null
  currentUser: AuthTestResult | null
  testAuth: () => Promise<{ success: boolean; user?: AuthTestResult; error?: string }>
  setupAuth: (creds: Credentials) => Promise<{ success: boolean; user?: AuthTestResult; error?: string }>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
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
      
      setupAuth: async (creds: Credentials) => {
        try {
          const response = await api.post('/auth/setup', creds)
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
      
      logout: () => {
        set({ 
          isAuthenticated: false, 
          credentials: null, 
          currentUser: null 
        })
      }
    }),
    {
      name: 'slack-slurp-auth',
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated,
        credentials: state.credentials,
        currentUser: state.currentUser 
      }),
    }
  )
)