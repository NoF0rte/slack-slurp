import { create } from 'zustand'
import { User } from '../types/api'
import { api } from '../utils/api'

interface UsersState {
  users: User[]
  isLoading: boolean
  error: string | null
  fetchUsers: () => Promise<void>
  clearError: () => void
}

export const useUsersStore = create<UsersState>((set) => ({
  users: [],
  isLoading: false,
  error: null,
  
  fetchUsers: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.get('/users')
      set({ 
        users: response.data, 
        isLoading: false,
        error: null 
      })
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error || error.message,
        isLoading: false 
      })
    }
  },
  
  clearError: () => set({ error: null })
}))