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
  isStopped: boolean
  
  // WebSocket handlers
  messageHandler?: (data: MessageResult) => void
  fileHandler?: (data: FileResult) => void
  completeHandler?: () => void
  errorHandler?: (data: any) => void
  
  // Actions
  search: (request: SearchRequest) => Promise<void>
  clearResults: () => void
  clearError: () => void
  stopSearch: () => void
  setSearchType: (type: 'messages' | 'files' | 'both') => void
  cleanupWebsocket: () => void
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
  isStopped: false,
  messageHandler: undefined,
  fileHandler: undefined,
  completeHandler: undefined,
  errorHandler: undefined,

  search: async (request: SearchRequest) => {
    set({ isLoading: true, error: null, isSearching: true, messages: [], files: [], isStopped: false })
    
    try {
      // Start WebSocket connection if not already connected
      if (!wsManager.isConnected()) {
        await wsManager.connect()
      }
      
      // Set up WebSocket listeners
      const handleMessageResult = (data: MessageResult) => {
        const state = get()
        if (state.isStopped) return // Don't process messages if search is stopped
        
        set(state => ({
          messages: [...state.messages, data]
        }))
      }
      
      const handleFileResult = (data: FileResult) => {
        const state = get()
        if (state.isStopped) return // Don't process messages if search is stopped
        
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
        const state = get()
        state.cleanupWebsocket()
      }
      
      const handleError = (data: any) => {
        set({
          error: data.message || 'Search failed',
          isLoading: false,
          isSearching: false
        })
        
        // Clean up listeners
        const state = get()
        state.cleanupWebsocket()
      }
      
      // Store handler references and add listeners
      set({
        messageHandler: handleMessageResult,
        fileHandler: handleFileResult,
        completeHandler: handleComplete,
        errorHandler: handleError
      })
      
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
    const state = get()
    const currentSearch = state.currentSearch
    if (currentSearch) {
      // Send stop request to backend
      api.post(`/search/stop/${currentSearch.search_id}`).catch(console.error)
    }
    
    // Set stopped flag to prevent processing any queued messages
    set({ isStopped: true })

    state.cleanupWebsocket()
    
    set({
      isSearching: false,
      isLoading: false,
      currentSearch: null,
    })
  },

  cleanupWebsocket() {
    const state = get()

    // Clean up all WebSocket listeners to stop processing messages
    if (state.messageHandler) wsManager.off('message_result', state.messageHandler)
    if (state.fileHandler) wsManager.off('file_result', state.fileHandler)
    if (state.completeHandler) wsManager.off('complete', state.completeHandler)
    if (state.errorHandler) wsManager.off('error', state.errorHandler)
    
    set({
      messageHandler: undefined,
      fileHandler: undefined,
      completeHandler: undefined,
      errorHandler: undefined
    })
  },

  setSearchType: (type?: 'messages' | 'files' | 'both') => {
    set({ searchType: type })
  }
}))