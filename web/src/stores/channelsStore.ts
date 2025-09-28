import { create } from 'zustand'
import { Channel } from '../types/api'
import { api } from '../utils/api'

interface ChannelsState {
  channels: Channel[]
  isLoading: boolean
  error: string | null
  fetchChannels: (types?: string[]) => Promise<void>
  clearError: () => void
}

export const useChannelsStore = create<ChannelsState>((set) => ({
  channels: [],
  isLoading: false,
  error: null,
  
  fetchChannels: async (types?: string[]) => {
    set({ isLoading: true, error: null })
    
    try {
      const params = new URLSearchParams()
      if (types && types.length > 0) {
        types.forEach(type => params.append('type', type))
      }
      
      const response = await api.get(`/channels?${params.toString()}`)
      set({ 
        channels: response.data, 
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