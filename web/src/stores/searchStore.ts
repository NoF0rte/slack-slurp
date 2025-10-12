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
  
  // Form state
  searchQuery: string
  selectedChannels: string[]
  selectedUsers: string[]
  beforeDate: string
  afterDate: string
  fileTypes: string
  
  // WebSocket handlers
  messageHandler?: (id: string, data: MessageResult) => void
  fileHandler?: (id: string, data: FileResult) => void
  completeHandler?: (id: string) => void
  errorHandler?: (id: string, data: any) => void
  
  // Actions
  search: (request: SearchRequest) => Promise<void>
  clearResults: () => void
  clearError: () => void
  stopSearch: () => void
  setSearchType: (type: 'messages' | 'files' | 'both') => void
  cleanupWebsocket: () => void
  setSearchQuery: (query: string) => void
  setSelectedChannels: (channels: string[]) => void
  setSelectedUsers: (users: string[]) => void
  setBeforeDate: (date: string) => void
  setAfterDate: (date: string) => void
  setFileTypes: (types: string) => void
  clearForm: () => void
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
  
  // Form state
  searchQuery: '',
  selectedChannels: [],
  selectedUsers: [],
  beforeDate: '',
  afterDate: '',
  fileTypes: '',

  search: async (request: SearchRequest) => {
    set({ isLoading: true, error: null, isSearching: true, messages: [], files: [], isStopped: false })
    
    try {
      // Start WebSocket connection if not already connected
      if (!wsManager.isConnected()) {
        await wsManager.connect()
      }
      
      // Set up WebSocket listeners
      const handleMessageResult = (id: string, data: MessageResult) => {
        const state = get()
        const currentSearch = state.currentSearch
        if (!currentSearch || currentSearch.search_id != id || state.isStopped) {
          return
        }

        set(state => ({
          messages: [...state.messages, data]
        }))
      }
      
      const handleFileResult = (id: string, data: FileResult) => {
        const state = get()
        const currentSearch = state.currentSearch
        if (!currentSearch || currentSearch.search_id != id || state.isStopped) {
          return
        }
        
        set(state => ({
          files: [...state.files, data]
        }))
      }
      
      const handleComplete = (id: string) => {
        const state = get()
        const currentSearch = state.currentSearch
        if (!currentSearch || currentSearch.search_id != id || state.isStopped) {
          return
        }
        
        set({
          isSearching: false,
          isLoading: false,
          currentSearch: currentSearch ? {
            ...currentSearch,
            status: 'completed' as const
          } : null
        })
        
        // Clean up listeners
        state.cleanupWebsocket()
      }
      
      const handleError = (id: string, data: any) => {
        const state = get()
        const currentSearch = state.currentSearch
        if (!currentSearch || currentSearch.search_id != id || state.isStopped) {
          return
        }

        set({
          error: data.message || 'Search failed',
          isLoading: false,
          isSearching: false
        })
        
        // Clean up listeners
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
      isLoading: false
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
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
  },

  setSelectedChannels: (channels: string[]) => {
    set({ selectedChannels: channels })
  },

  setSelectedUsers: (users: string[]) => {
    set({ selectedUsers: users })
  },

  setBeforeDate: (date: string) => {
    set({ beforeDate: date })
  },

  setAfterDate: (date: string) => {
    set({ afterDate: date })
  },

  setFileTypes: (types: string) => {
    set({ fileTypes: types })
  },

  clearForm: () => {
    set({
      searchQuery: '',
      selectedChannels: [],
      selectedUsers: [],
      beforeDate: '',
      afterDate: '',
      fileTypes: ''
    })
  }
}))