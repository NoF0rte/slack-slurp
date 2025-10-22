import { create } from 'zustand'
import { SecretScanRequest, SecretScanResult, SecretResult, CustomDetector, DetectorInfo } from '../types/api'
import { api } from '../utils/api'
import { wsManager } from '../utils/websocket'

interface SecretScanState {
  results: SecretResult[]
  isLoading: boolean
  isScanning: boolean
  error: string | null
  currentScan: SecretScanResult | null
  
  // Form state
  selectedChannels: string[]
  selectedUsers: string[]
  beforeDate: string
  afterDate: string
  selectedDetectors: string[]
  verify: boolean
  verifiedOnly: boolean
  
  // Detector management
  builtinDetectors: DetectorInfo[]
  customDetectors: CustomDetector[]
  isLoadingDetectors: boolean
  
  // Actions
  startScan: (request: SecretScanRequest) => Promise<void>
  clearResults: () => void
  clearError: () => void
  stopScan: () => void
  setSelectedChannels: (channels: string[]) => void
  setSelectedUsers: (users: string[]) => void
  setBeforeDate: (date: string) => void
  setAfterDate: (date: string) => void
  setSelectedDetectors: (detectors: string[]) => void
  setVerify: (verify: boolean) => void
  setVerifiedOnly: (verifiedOnly: boolean) => void
  clearForm: () => void
  
  // Detector management actions
  loadDetectors: () => Promise<void>
  createCustomDetector: (detector: Omit<CustomDetector, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateCustomDetector: (id: string, detector: Partial<CustomDetector>) => Promise<void>
  deleteCustomDetector: (id: string) => Promise<void>
}

export const useSecretScanStore = create<SecretScanState>((set, get) => ({
  results: [],
  isLoading: false,
  isScanning: false,
  error: null,
  currentScan: null,
  
  // Form state
  selectedChannels: [],
  selectedUsers: [],
  beforeDate: '',
  afterDate: '',
  selectedDetectors: [],
  verify: true,
  verifiedOnly: false,
  
  // Detector management
  builtinDetectors: [],
  customDetectors: [],
  isLoadingDetectors: false,
  
  startScan: async (request: SecretScanRequest) => {
    set({ isLoading: true, error: null, isScanning: true })
    
    try {
      // Clear previous results
      set({ results: [] })
      
      // Start WebSocket connection if not already connected
      if (!wsManager.isConnected()) {
        await wsManager.connect()
      }
      
      // Set up WebSocket listeners
      const handleSecretResult = (id: string, data: SecretResult) => {
        const state = get()
        const currentScan = state.currentScan
        if (!currentScan || currentScan.scan_id !== id) {
          return
        }

        set(state => ({
          results: [...state.results, data]
        }))
      }
      
      const handleComplete = (id: string) => {
        const state = get()
        const currentScan = state.currentScan
        if (!currentScan || currentScan.scan_id !== id) {
          return
        }
        
        set({
          isScanning: false,
          isLoading: false,
          currentScan: currentScan ? {
            ...currentScan,
            status: 'completed' as const
          } : null
        })
        
        // Clean up listeners
        wsManager.off('secret_result', handleSecretResult)
        wsManager.off('complete', handleComplete)
        wsManager.off('error', handleError)
      }
      
      const handleError = (id: string, data: any) => {
        const state = get()
        const currentScan = state.currentScan
        if (!currentScan || currentScan.scan_id !== id) {
          return
        }

        set({
          error: data.message || 'Scan failed',
          isLoading: false,
          isScanning: false
        })
        
        // Clean up listeners
        wsManager.off('secret_result', handleSecretResult)
        wsManager.off('complete', handleComplete)
        wsManager.off('error', handleError)
      }
      
      // Add listeners
      wsManager.on('secret_result', handleSecretResult)
      wsManager.on('complete', handleComplete)
      wsManager.on('error', handleError)
      
      // Start the scan
      const response = await api.post('/secrets/scan', request)
      const scanResponse: SecretScanResult = response.data
      
      set({
        currentScan: scanResponse,
      })
      
    } catch (error: any) {
      set({
        error: error.response?.data?.error || error.message,
        isLoading: false,
        isScanning: false
      })
    }
  },

  clearResults: () => {
    set({ results: [] })
  },

  clearError: () => {
    set({ error: null })
  },

  stopScan: () => {
    const currentScan = get().currentScan
    if (currentScan) {
      // Send stop request to backend
      api.post(`/secrets/scan/stop/${currentScan.scan_id}`).catch(console.error)
    }
    
    set({
      isScanning: false,
      isLoading: false
    })
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

  setSelectedDetectors: (detectors: string[]) => {
    set({ selectedDetectors: detectors })
  },

  setVerify: (verify: boolean) => {
    set({ verify })
  },

  setVerifiedOnly: (verifiedOnly: boolean) => {
    set({ verifiedOnly })
  },

  clearForm: () => {
    set({
      selectedChannels: [],
      selectedUsers: [],
      beforeDate: '',
      afterDate: '',
      selectedDetectors: [],
      verify: true,
      verifiedOnly: false
    })
  },

  loadDetectors: async () => {
    set({ isLoadingDetectors: true })
    
    try {
      // const [detectorsResponse, customResponse] = await Promise.all([
      //   api.get('/secrets/detectors'),
      //   api.get('/secrets/custom-detectors')
      // ])
      const detectorsResponse = await api.get('/secrets/detectors')
      
      set({
        builtinDetectors: detectorsResponse.data,
        isLoadingDetectors: false
      })
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to load detectors',
        isLoadingDetectors: false
      })
    }
  },

  createCustomDetector: async (detector: Omit<CustomDetector, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await api.post('/secrets/custom-detectors', detector)
      const newDetector = response.data
      
      set(state => ({
        customDetectors: [...state.customDetectors, newDetector]
      }))
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to create custom detector'
      })
    }
  },

  updateCustomDetector: async (id: string, detector: Partial<CustomDetector>) => {
    try {
      const response = await api.put(`/secrets/custom-detectors/${id}`, detector)
      const updatedDetector = response.data
      
      set(state => ({
        customDetectors: state.customDetectors.map(d => 
          d.id === id ? updatedDetector : d
        )
      }))
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to update custom detector'
      })
    }
  },

  deleteCustomDetector: async (id: string) => {
    try {
      await api.delete(`/secrets/custom-detectors/${id}`)
      
      set(state => ({
        customDetectors: state.customDetectors.filter(d => d.id !== id)
      }))
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to delete custom detector'
      })
    }
  },
}))