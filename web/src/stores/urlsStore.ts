import { create } from 'zustand'
import { URLSearchRequest, URLSearchResponse } from '../types/api'
import { api } from '../utils/api'
import { wsManager } from '../utils/websocket'

interface URLsState {
  results: string[]
  isLoading: boolean
  isSearching: boolean
  dismissComplete: boolean
  error: string | null
  currentSearch: URLSearchResponse | null
  
  // Actions
  searchURLs: (request: URLSearchRequest) => Promise<void>
  clearResults: () => void
  clearError: () => void
  stopSearch: () => void
}

export const useURLsStore = create<URLsState>((set, get) => ({
  results: [],
  isLoading: false,
  isSearching: false,
  error: null,
  currentSearch: null,
  dismissComplete: false,

  searchURLs: async (request: URLSearchRequest) => {
    set({ isLoading: true, error: null, isSearching: true })
    
    try {
      // Clear previous results
      set({ results: [] })
      
      // Start WebSocket connection if not already connected
      if (!wsManager.isConnected()) {
        await wsManager.connect()
      }
      
      // Set up WebSocket listeners
      const handleURLResult = (data: string) => {
        set(state => ({
          results: [...state.results, data]
        }))
      }
      
      const handleComplete = () => {
        const currentSearch = get().currentSearch
        set({
          isSearching: false,
          isLoading: false,
          currentSearch: currentSearch ? {
            search_id: currentSearch.search_id,
            status: 'completed' as const,
            total_found: get().results.length
          } : null
        })
        
        // Clean up listeners
        wsManager.off('url_result', handleURLResult)
        wsManager.off('complete', handleComplete)
        wsManager.off('error', handleError)
      }
      
      const handleError = (data: any) => {
        set({
          error: data.message || 'Search failed',
          isLoading: false,
          isSearching: false
        })
        
        // Clean up listeners
        wsManager.off('url_result', handleURLResult)
        wsManager.off('complete', handleComplete)
        wsManager.off('error', handleError)
      }
      
      // Add listeners
      wsManager.on('url_result', handleURLResult)
      wsManager.on('complete', handleComplete)
      wsManager.on('error', handleError)
      
      // Start the search
      const response = await api.post('/search/urls', request)
      const searchResponse: URLSearchResponse = response.data
      
      set({
        currentSearch: searchResponse,
      })
      
    } catch (error: any) {
      set({
        error: error.response?.data?.error || error.message,
        isLoading: false,
        isSearching: false
      })
    }
  },

  clearResults: () => {
    set({ results: [] })
  },

  clearError: () => {
    set({ error: null })
  },

  stopSearch: () => {
    const currentSearch = get().currentSearch
    if (currentSearch) {
      // Send stop request to backend
      api.post(`/search/stop/${currentSearch.search_id}`).catch(console.error)
    }
    
    set({
      isSearching: false,
      isLoading: false,
      currentSearch: null
    })
  },
}))