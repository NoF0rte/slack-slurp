import { create } from 'zustand'
import { DomainResult, DomainSearchRequest, DomainSearchResponse } from '../types/api'
import { api } from '../utils/api'
import { wsManager } from '../utils/websocket'

interface DomainsState {
  results: DomainResult[]
  isLoading: boolean
  isSearching: boolean
  error: string | null
  currentSearch: DomainSearchResponse | null
  
  // Actions
  searchDomains: (domains: string[]) => Promise<void>
  clearResults: () => void
  clearError: () => void
  stopSearch: () => void
}

export const useDomainsStore = create<DomainsState>((set, get) => ({
  results: [],
  isLoading: false,
  isSearching: false,
  error: null,
  currentSearch: null,
  progress: {
    domainsProcessed: 0,
    totalDomains: 0,
    messagesScanned: 0
  },

  searchDomains: async (domains: string[]) => {
    set({ isLoading: true, error: null, isSearching: true })
    
    try {
      // Clear previous results
      set({ results: [] })
      
      // Start WebSocket connection if not already connected
      if (!wsManager.isConnected()) {
        await wsManager.connect()
      }
      
      // Set up WebSocket listeners
      const handleDomainResult = (data: DomainResult) => {
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
            total_found: get().results.length,
            domains_searched: currentSearch.domains_searched
          } : null
        })
        
        // Clean up listeners
        wsManager.off('domain_result', handleDomainResult)
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
        wsManager.off('domain_result', handleDomainResult)
        wsManager.off('complete', handleComplete)
        wsManager.off('error', handleError)
      }
      
      // Add listeners
      wsManager.on('domain_result', handleDomainResult)
      wsManager.on('complete', handleComplete)
      wsManager.on('error', handleError)
      
      // Start the search
      const request: DomainSearchRequest = { domains }
      const response = await api.post('/domains/search', request)
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
      api.post(`/domains/stop/${currentSearch.search_id}`).catch(console.error)
    }
    
    set({
      isSearching: false,
      isLoading: false,
      currentSearch: null
    })
  }
}))