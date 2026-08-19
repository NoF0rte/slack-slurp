import { create } from 'zustand'
import { DomainResult, DomainSearchRequest, DomainSearchResponse } from '../types/api'
import { api } from '../utils/api'
import { wsManager } from '../utils/websocket'

interface DomainsState {
  results: DomainResult[]
  isLoading: boolean
  isSearching: boolean
  dismissComplete: boolean
  error: string | null
  currentSearch: DomainSearchResponse | null
  
  // Form state
  domainsInput: string
  selectedChannels: string[]
  selectedUsers: string[]
  beforeDate: string
  afterDate: string
  
  // Actions
  searchDomains: (request: DomainSearchRequest) => Promise<void>
  clearResults: () => void
  clearError: () => void
  stopSearch: () => void
  setDomainsInput: (input: string) => void
  setSelectedChannels: (channels: string[]) => void
  setSelectedUsers: (users: string[]) => void
  setBeforeDate: (date: string) => void
  setAfterDate: (date: string) => void
  clearForm: () => void
}

export const useDomainsStore = create<DomainsState>((set, get) => ({
  results: [],
  isLoading: false,
  isSearching: false,
  error: null,
  currentSearch: null,
  dismissComplete: false,
  
  // Form state
  domainsInput: '',
  selectedChannels: [],
  selectedUsers: [],
  beforeDate: '',
  afterDate: '',

  searchDomains: async (request: DomainSearchRequest) => {
    set({ isLoading: true, error: null, isSearching: true })
    
    try {
      // Clear previous results
      set({ results: [] })
      
      // Start WebSocket connection if not already connected
      if (!wsManager.isConnected()) {
        await wsManager.connect()
      }
      
      // Set up WebSocket listeners
      const handleDomainResult = (id: string, data: DomainResult) => {
        const state = get()
        const currentSearch = state.currentSearch
        if (!currentSearch || currentSearch.searchId != id) {
          return
        }

        set(state => ({
          results: [...state.results, data]
        }))
      }
      
      const handleComplete = (id: string) => {
        const state = get()
        const currentSearch = state.currentSearch
        if (!currentSearch || currentSearch.searchId != id) {
          return
        }
        
        set({
          isSearching: false,
          isLoading: false,
          currentSearch: currentSearch ? {
            searchId: currentSearch.searchId,
            status: 'completed' as const,
            totalFound: state.results.length,
            domainsSearched: currentSearch.domainsSearched
          } : null
        })
        
        // Clean up listeners
        wsManager.off('domainResult', handleDomainResult)
        wsManager.off('complete', handleComplete)
        wsManager.off('error', handleError)
      }
      
      const handleError = (id: string, data: any) => {
        const state = get()
        const currentSearch = state.currentSearch
        if (!currentSearch || currentSearch.searchId != id) {
          return
        }

        set({
          error: data.message || 'Search failed',
          isLoading: false,
          isSearching: false
        })
        
        // Clean up listeners
        wsManager.off('domainResult', handleDomainResult)
        wsManager.off('complete', handleComplete)
        wsManager.off('error', handleError)
      }
      
      // Add listeners
      wsManager.on('domainResult', handleDomainResult)
      wsManager.on('complete', handleComplete)
      wsManager.on('error', handleError)
      
      // Start the search
      const response = await api.post('/search/domains', request)
      const searchResponse: DomainSearchResponse = response.data
      
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
      api.post(`/search/stop/${currentSearch.searchId}`).catch(console.error)
    }
    
    set({
      isSearching: false,
      isLoading: false
    })
  },

  setDomainsInput: (input: string) => {
    set({ domainsInput: input })
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

  clearForm: () => {
    set({
      domainsInput: '',
      selectedChannels: [],
      selectedUsers: [],
      beforeDate: '',
      afterDate: ''
    })
  },
}))