import { create } from 'zustand'
import { api } from '../utils/api'

export interface Profile {
  id: number
  name: string
  apiToken: string
  dCookie: string
  dsCookie: string
  isSelected: boolean
  createdAt: string
  updatedAt: string
}

interface CreateProfileRequest {
  name: string
  apiToken: string
  dCookie: string
  dsCookie: string
}

interface ProfileState {
  profiles: Profile[]
  selectedProfile: Profile | null
  isLoading: boolean
  error: string | null
  loadProfiles: () => Promise<void>
  createProfile: (profile: CreateProfileRequest) => Promise<void>
  updateProfile: (id: number, profile: Partial<Profile>) => Promise<void>
  deleteProfile: (id: number) => Promise<void>
  selectProfile: (id: number) => Promise<void>
  getProfilesCount: () => Promise<number>
  clearError: () => void
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  selectedProfile: null,
  isLoading: false,
  error: null,

  loadProfiles: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get('/profiles')
      const profiles = response.data
      const selected = profiles.find((p: Profile) => p.isSelected) || null
      set({
        profiles,
        selectedProfile: selected,
        isLoading: false,
      })
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to load profiles',
        isLoading: false,
      })
    }
  },

  getProfilesCount: async () => {
    try {
      const response = await api.get('/profiles/count')
      return response.data.count || 0
    } catch (error: any) {
      return 0
    }
  },

  createProfile: async (profile) => {
    try {
      const response = await api.post('/profiles', {
        name: profile.name,
        apiToken: profile.apiToken,
        dCookie: profile.dCookie,
        dsCookie: profile.dsCookie,
      })
      const newProfile = response.data
      set((state) => ({
        profiles: [...state.profiles, newProfile],
        selectedProfile: newProfile.isSelected ? newProfile : state.selectedProfile,
      }))
      await get().loadProfiles() // Reload to ensure sync
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to create profile',
      })
      throw error
    }
  },

  updateProfile: async (id, profile) => {
    try {
      const response = await api.put(`/profiles/${id}`, profile)
      const updatedProfile = response.data
      set((state) => ({
        profiles: state.profiles.map((p) => (p.id === id ? updatedProfile : p)),
        selectedProfile: updatedProfile.isSelected ? updatedProfile : state.selectedProfile,
      }))
      await get().loadProfiles() // Reload to ensure sync
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to update profile',
      })
      throw error
    }
  },

  deleteProfile: async (id) => {
    try {
      await api.delete(`/profiles/${id}`)
      set((state) => ({
        profiles: state.profiles.filter((p) => p.id !== id),
        selectedProfile:
          state.selectedProfile?.id === id ? null : state.selectedProfile,
      }))
      await get().loadProfiles() // Reload to ensure sync
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to delete profile',
      })
      throw error
    }
  },

  selectProfile: async (id) => {
    try {
      const response = await api.post(`/profiles/${id}/select`)
      const selectedProfile = response.data
      set((state) => ({
        profiles: state.profiles.map((p) => ({
          ...p,
          isSelected: p.id === id,
        })),
        selectedProfile,
      }))
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to select profile',
      })
      throw error
    }
  },

  clearError: () => set({ error: null }),
}))
