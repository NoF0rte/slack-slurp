import { create } from 'zustand'
import { api } from '../utils/api'
import { wsManager } from '../utils/websocket'
import { SearchRequest, SearchResponse, MessageResult, FileResult } from '../types/api'

interface SearchState {
  // Messages
  messages: MessageResult[]
  // Files
  files: FileResult[]
  // UI State
  isLoading: boolean
  isSearching: boolean
  error: string | null
  currentSearch: SearchResponse | null
  dismissComplete: boolean
  searchType: 'messages' | 'files' | 'both'
  
  // Actions
  search: (request: SearchRequest) => Promise<void>
  clearResults: () => void
  clearError: () => void
  stopSearch: () => void
  setDismissComplete: (dismiss: boolean) => void
  setSearchType: (type: 'messages' | 'files' | 'both') => void
}

export const useSearchStore = create<SearchState>((set, get) => ({
  messages: [],
  files: [],
  isLoading: false,
  isSearching: false,
  error: null,
  currentSearch: null,
  dismissComplete: false,
  searchType: 'both',

  search: async (request: SearchRequest) => {
    set({ isLoading: true, error: null, isSearching: true, messages: [], files: [] })
    
    try {
      // Start WebSocket connection if not already connected
      if (!wsManager.isConnected()) {
        await wsManager.connect()
      }
      
      // Set up WebSocket listeners
      const handleMessageResult = (data: MessageResult) => {
        set(state => ({
          messages: [...state.messages, data]
        }))
      }
      
      const handleFileResult = (data: FileResult) => {
        set(state => ({
          files: [...state.files, data]
        }))
      }
      
      const handleComplete = () => {
        const currentSearch = get().currentSearch
        set({
          isSearching: false,
          isLoading: false,
          currentSearch: currentSearch ? {
            ...currentSearch,
            status: 'completed' as const
          } : null
        })
        
        // Clean up listeners
        wsManager.off('message_result', handleMessageResult)
        wsManager.off('file_result', handleFileResult)
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
        wsManager.off('message_result', handleMessageResult)
        wsManager.off('file_result', handleFileResult)
        wsManager.off('complete', handleComplete)
        wsManager.off('error', handleError)
      }
      
      // Add listeners
      wsManager.on('message_result', handleMessageResult)
      wsManager.on('file_result', handleFileResult)
      wsManager.on('complete', handleComplete)
      wsManager.on('error', handleError)
      
      // Start the search
      const response = await api.post("/search", request)
      const searchResponse: SearchResponse = response.data
      
      set({
        currentSearch: searchResponse,
        searchType: request.search_type
      })
      
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Search failed',
        isLoading: false,
        isSearching: false
      })
    }
  },

  clearResults: () => {
    set({ messages: [], files: [], currentSearch: null })
  },

  clearError: () => {
    set({ error: null })
  },

  stopSearch: () => {
    set({ isSearching: false, isLoading: false })
    // TODO: Implement actual search cancellation
  },

  setDismissComplete: (dismiss: boolean) => {
    set({ dismissComplete: dismiss })
  },

  setSearchType: (type?: 'messages' | 'files' | 'both') => {
    set({ searchType: type })
  }
}))