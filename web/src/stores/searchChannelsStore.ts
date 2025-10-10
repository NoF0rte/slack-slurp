import { create } from 'zustand'
import { Channel } from '../types/api'
import { api } from '../utils/api'

interface SearchChannelsState {
  channels: Channel[]
  isLoading: boolean
  error: string | null
  lastLoaded: number | null
  fetchChannels: () => Promise<void>
  clearError: () => void
  updateChannels: (channels: Channel[]) => void
}

export const useSearchChannelsStore = create<SearchChannelsState>((set) => ({
  channels: [],
  isLoading: false,
  error: null,
  lastLoaded: null,
  
  fetchChannels: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.get('/channels')
      set({ 
        channels: response.data, 
        isLoading: false,
        error: null,
        lastLoaded: Date.now()
      })
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error || error.message,
        isLoading: false 
      })
    }
  },
  
  clearError: () => set({ error: null }),
  
  updateChannels: (channels: Channel[]) => {
    set({ 
      channels,
      lastLoaded: Date.now()
    })
  }
}))