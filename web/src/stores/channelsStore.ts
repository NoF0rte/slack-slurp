import { create } from 'zustand'
import { Channel, ChannelType } from '../types/api'
import { api } from '../utils/api'
import { wsManager } from '../utils/websocket'
import { useSearchChannelsStore } from './searchChannelsStore'

interface ChannelsState {
  channels: Channel[]
  selectedType: ChannelType
  isLoading: boolean
  isAsyncLoading: boolean
  error: string | null
  fetchChannels: (types?: string[]) => Promise<void>
  setSelectedType: (channelType: ChannelType) => void
  clearError: () => void
  stopLoading: () => void
  syncToSearchCache: () => void
}

export const useChannelsStore = create<ChannelsState>((set, get) => ({
  channels: [],
  selectedType: 'all' as ChannelType,
  isLoading: false,
  isAsyncLoading: false,
  error: null,
  
  fetchChannels: async (types?: string[]) => {
    // Prevent duplicate async loading
    const state = get()
    if (state.isAsyncLoading) {
      return // Already loading asynchronously, don't start another load
    }

    set({ isLoading: true, error: null })
    
    try {
      const params = new URLSearchParams()
      if (types && types.length > 0) {
        types.forEach(type => params.append('type', type))
      }

      set({ isLoading: false, isAsyncLoading: true, channels: [] })

      // Start WebSocket connection if not already connected
      if (!wsManager.isConnected()) {
        await wsManager.connect()
      }
      
      // Set up WebSocket listeners
      const handleChannelResult = (data: Channel) => {
        set(state => ({
          channels: [...state.channels, data]
        }))
      }
      
      const handleComplete = () => {
        set({
          isLoading: false,
          isAsyncLoading: false,
        })
        
        // Clean up listeners
        wsManager.off('channel_result', handleChannelResult)
        wsManager.off('complete', handleComplete)
        wsManager.off('error', handleError)
      }
      
      const handleError = (data: any) => {
        set({
          error: data.message || 'Channel loading failed',
          isLoading: false,
          isAsyncLoading: false,
        })
        
        // Clean up listeners
        wsManager.off('channel_result', handleChannelResult)
        wsManager.off('complete', handleComplete)
        wsManager.off('error', handleError)
      }
      
      // Add listeners
      wsManager.on('channel_result', handleChannelResult)
      wsManager.on('complete', handleComplete)
      wsManager.on('error', handleError)
      
      await api.get(`/channels/detailed?${params.toString()}`)
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error || error.message,
        isLoading: false 
      })
    }
  },

  setSelectedType: (channelType: ChannelType) => {
    set({selectedType: channelType})
  },

  clearError: () => set({ error: null }),

  stopLoading: () => {
    api.post(`/channels/detailed/stop`).catch(console.error)
    
    set({
      isLoading: false,
      isAsyncLoading: false,
    })
  },

  syncToSearchCache: () => {
    const searchStore = useSearchChannelsStore.getState()
    searchStore.updateChannels(get().channels)
  },
}))