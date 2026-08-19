import { useState, useEffect } from 'react'
import { useSecretScanStore } from '../../stores/secretScanStore'
import { useProfileStore, Profile } from '../../stores/profileStore'
import { CustomDetector } from '../../types/api'
import { ConfirmDialog } from '../common/ConfirmDialog'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

interface DetectorFormData {
  name: string
  description: string
  keywords: string[]
  patterns: string[]
}

export function SettingsPage() {
  const {
    customDetectors,
    isLoadingDetectors,
    error,
    loadDetectors,
    createCustomDetector,
    updateCustomDetector,
    deleteCustomDetector,
    clearError,
  } = useSecretScanStore()

  const {
    profiles,
    selectedProfile,
    isLoading: isLoadingProfiles,
    error: profileError,
    loadProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    selectProfile,
    clearError: clearProfileError,
  } = useProfileStore()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingDetector, setEditingDetector] = useState<CustomDetector | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Profile management state
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [deleteProfileId, setDeleteProfileId] = useState<number | null>(null)
  const [profileFormData, setProfileFormData] = useState({
    name: '',
    apiToken: '',
    dCookie: '',
    dsCookie: '',
  })
  const [profileFormError, setProfileFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState<DetectorFormData>({
    name: '',
    description: '',
    keywords: [],
    patterns: [],
  })
  const [keywordInput, setKeywordInput] = useState('')
  const [patternInput, setPatternInput] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'profiles' | 'detectors' | 'global'>('profiles')
  const [concurrentGoroutines, setConcurrentGoroutines] = useState(10)
  const [isLoadingSettings, setIsLoadingSettings] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)

  useEffect(() => {
    loadDetectors()
    loadProfiles()
    loadGlobalSettings()
  }, [loadDetectors, loadProfiles])

  const loadGlobalSettings = async () => {
    setIsLoadingSettings(true)
    setSettingsError(null)
    try {
      const response = await fetch('/api/settings/global')
      if (!response.ok) {
        throw new Error('Failed to load settings')
      }
      const data = await response.json()
      setConcurrentGoroutines(data.concurrentGoroutines || 10)
    } catch (error: any) {
      setSettingsError(error.message || 'Failed to load global settings')
    } finally {
      setIsLoadingSettings(false)
    }
  }

  const saveGlobalSettings = async () => {
    setIsLoadingSettings(true)
    setSettingsError(null)
    try {
      const response = await fetch('/api/settings/global', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          concurrentGoroutines: concurrentGoroutines,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save settings')
      }
      const data = await response.json()
      setConcurrentGoroutines(data.concurrentGoroutines)
    } catch (error: any) {
      setSettingsError(error.message || 'Failed to save global settings')
    } finally {
      setIsLoadingSettings(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      keywords: [],
      patterns: [],
    })
    setKeywordInput('')
    setPatternInput('')
    setFormError(null)
  }

  const handleOpenCreate = () => {
    resetForm()
    setShowCreateModal(true)
    setEditingDetector(null)
  }

  const handleOpenEdit = (detector: CustomDetector) => {
    setFormData({
      name: detector.name,
      description: detector.description,
      keywords: [...detector.keywords],
      patterns: [...detector.patterns],
    })
    setEditingDetector(detector)
    setShowCreateModal(true)
    setFormError(null)
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setEditingDetector(null)
    resetForm()
  }

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      setFormData({
        ...formData,
        keywords: [...formData.keywords, keywordInput.trim()],
      })
      setKeywordInput('')
    }
  }

  const removeKeyword = (index: number) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter((_, i) => i !== index),
    })
  }

  const addPattern = () => {
    if (patternInput.trim()) {
      // Validate regex
      try {
        new RegExp(patternInput.trim())
        if (!formData.patterns.includes(patternInput.trim())) {
          setFormData({
            ...formData,
            patterns: [...formData.patterns, patternInput.trim()],
          })
          setPatternInput('')
          setFormError(null)
        } else {
          setFormError('Pattern already exists')
        }
      } catch (e) {
        setFormError(`Invalid regex pattern: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    }
  }

  const removePattern = (index: number) => {
    setFormData({
      ...formData,
      patterns: formData.patterns.filter((_, i) => i !== index),
    })
  }

  const handleSubmit = async () => {
    setFormError(null)

    // Validation
    if (!formData.name.trim()) {
      setFormError('Name is required')
      return
    }
    if (formData.keywords.length === 0) {
      setFormError('At least one keyword is required')
      return
    }
    if (formData.patterns.length === 0) {
      setFormError('At least one pattern is required')
      return
    }

    try {
      const detector = {
          name: formData.name,
          description: formData.description,
          keywords: formData.keywords,
          patterns: formData.patterns,
      }

      if (editingDetector) {
        await updateCustomDetector(editingDetector.id, detector)
      } else {
        await createCustomDetector(detector)
      }
      handleCloseModal()
    } catch (error: any) {
      setFormError(
        error.response?.data?.error || 
        (editingDetector ? 'Failed to update detector' : 'Failed to create detector')
      )
    }
  }

  const handleDelete = async () => {
    if (deleteConfirmId) {
      try {
        await deleteCustomDetector(deleteConfirmId)
        setDeleteConfirmId(null)
      } catch (error) {
        // Error already set in store
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400">Manage profiles and custom secret detectors</p>
        </div>
      </div>

      {/* Error States */}
      {(error || profileError) && (
        <div className="bg-red-900 border border-red-700 rounded-md p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-red-200">Error</h3>
                <p className="text-sm text-red-300 mt-1">{error || profileError}</p>
              </div>
            </div>
            <button
              onClick={() => {
                clearError()
                clearProfileError()
              }}
              className="text-sm text-red-300 hover:text-red-200 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="border-b border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('profiles')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === 'profiles'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
              }`}
            >
              Profiles
            </button>
            <button
              onClick={() => setActiveTab('detectors')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === 'detectors'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
              }`}
            >
              Custom Detectors
            </button>
            <button
              onClick={() => setActiveTab('global')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === 'global'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
              }`}
            >
              Global Search Options
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Management Section */}
          {activeTab === 'profiles' && (
            <div>
              <p className="text-base text-gray-300 mb-6">Manage Slack authentication profiles to switch between different workspaces and accounts.</p>
              <div className="flex items-center justify-between mb-4">
                <div></div>
                <button
                  onClick={() => {
                    setProfileFormData({ name: '', apiToken: '', dCookie: '', dsCookie: '' })
                    setEditingProfile(null)
                    setProfileFormError(null)
                    setShowProfileModal(true)
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 cursor-pointer"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Create Profile</span>
                </button>
              </div>

              {isLoadingProfiles ? (
                <div className="flex items-center justify-center py-8">
                  <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-400" />
                </div>
              ) : profiles.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>No profiles found. Create your first profile to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {profiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between p-4 bg-gray-700 rounded-md border border-gray-600"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-medium text-white">{profile.name}</h3>
                          {profile.isSelected && (
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          API Token: {profile.apiToken ? profile.apiToken.substring(0, 10) + '...' : 'Not set'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingProfile(profile)
                            setProfileFormData({
                              name: profile.name,
                              apiToken: profile.apiToken || '',
                              dCookie: profile.dCookie || '',
                              dsCookie: profile.dsCookie || '',
                            })
                            setProfileFormError(null)
                            setShowProfileModal(true)
                          }}
                          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-600 rounded transition-colors"
                          title="Edit profile"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setDeleteProfileId(profile.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded transition-colors"
                          title="Delete profile"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Custom Detectors Section */}
          {activeTab === 'detectors' && (
            <div>
              <p className="text-base text-gray-300 mb-6">Create and manage custom secret detection patterns with keywords and regex patterns to scan for specific types of sensitive data.</p>
              <div className="flex items-center justify-between mb-4">
                <div></div>
                <button
                  onClick={handleOpenCreate}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 cursor-pointer"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Create Detector</span>
                </button>
              </div>

              {/* Loading State */}
              {isLoadingDetectors && (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center space-x-2">
                    <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-400" />
                    <span className="text-gray-400">Loading detectors...</span>
                  </div>
                </div>
              )}

              {/* Detector List */}
              {!isLoadingDetectors && (
                <div className="space-y-4">
                  {customDetectors.length === 0 ? (
                    <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-gray-500 mb-4">
                        <PlusIcon className="w-12 h-12 mx-auto" />
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">No custom detectors</h3>
                      <p className="text-gray-400 mb-4">
                        Create your first custom detector to scan for specific secrets
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {customDetectors.map((detector) => (
                        <div
                          key={detector.id}
                          className="bg-gray-800 rounded-lg border border-gray-700 p-6"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-white mb-2">
                                {detector.name}
                              </h3>
                              {detector.description && (
                                <p className="text-gray-300 mb-4">{detector.description}</p>
                              )}

                              <div className="space-y-3">
                                {/* Keywords */}
                                <div>
                                  <h4 className="text-sm font-medium text-gray-400 mb-2">Keywords</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {detector.keywords.map((keyword, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs"
                                      >
                                        {keyword}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                {/* Patterns */}
                                <div>
                                  <h4 className="text-sm font-medium text-gray-400 mb-2">Patterns</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {detector.patterns.map((pattern, idx) => (
                                      <code
                                        key={idx}
                                        className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs font-mono"
                                      >
                                        {pattern}
                                      </code>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() => handleOpenEdit(detector)}
                                className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded transition-colors"
                                title="Edit detector"
                              >
                                <PencilIcon className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(detector.id)}
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                                title="Delete detector"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Global Search Options Section */}
          {activeTab === 'global' && (
            <div>
              <p className="text-base text-gray-300 mb-6">Configure global settings that affect all search operations across the application.</p>

              {settingsError && (
                <div className="mb-4 bg-red-900 border border-red-700 rounded p-3">
                  <p className="text-sm text-red-300">{settingsError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="concurrentGoroutines" className="block text-sm font-medium text-gray-300 mb-2">
                    Concurrent Go Routines (Threads)
                  </label>
                  <p className="text-xs text-gray-400 mb-3">
                    Number of concurrent goroutines to use when searching Slack. Higher values may improve performance but increase resource usage. Default: 10
                  </p>
                  <div className="flex items-center space-x-4">
                    <input
                      type="number"
                      id="concurrentGoroutines"
                      min="1"
                      max="100"
                      value={concurrentGoroutines}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10)
                        if (!isNaN(value) && value >= 1 && value <= 100) {
                          setConcurrentGoroutines(value)
                        }
                      }}
                      className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isLoadingSettings}
                    />
                    <button
                      onClick={saveGlobalSettings}
                      disabled={isLoadingSettings}
                      className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isLoadingSettings ? (
                        <span className="flex items-center">
                          <ArrowPathIcon className="w-4 h-4 animate-spin mr-2" />
                          Saving...
                        </span>
                      ) : (
                        'Save Settings'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black opacity-50" onClick={handleCloseModal} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative bg-gray-800 rounded-lg border border-gray-700 shadow-xl max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">
                  {editingDetector ? 'Edit Custom Detector' : 'Create Custom Detector'}
                </h3>
              </div>

              {/* Body */}
              <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                {formError && (
                  <div className="mb-4 bg-red-900 border border-red-700 rounded p-3">
                    <p className="text-sm text-red-300">{formError}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="My Custom Detector"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Description of what this detector finds"
                    />
                  </div>

                  {/* Keywords */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Keywords *
                    </label>
                    <div className="flex space-x-2 mb-2">
                      <input
                        type="text"
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyUp={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter keyword and press Enter"
                      />
                      <button
                        onClick={addKeyword}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.keywords.map((keyword, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm"
                        >
                          {keyword}
                          <button
                            onClick={() => removeKeyword(idx)}
                            className="ml-2 text-gray-400 hover:text-red-400"
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Patterns */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Regex Patterns *
                    </label>
                    <div className="flex space-x-2 mb-2">
                      <input
                        type="text"
                        value={patternInput}
                        onChange={(e) => setPatternInput(e.target.value)}
                        onKeyUp={(e) => e.key === 'Enter' && (e.preventDefault(), addPattern())}
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        placeholder="Enter regex pattern and press Enter"
                      />
                      <button
                        onClick={addPattern}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.patterns.map((pattern, idx) => (
                        <code
                          key={idx}
                          className="inline-flex items-center px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm font-mono"
                        >
                          {pattern}
                          <button
                            onClick={() => removePattern(idx)}
                            className="ml-2 text-gray-400 hover:text-red-400"
                          >
                            x
                          </button>
                        </code>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Patterns are validated as valid regex before being added
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-700 rounded-b-lg flex justify-end space-x-3">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
                >
                  {editingDetector ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Create/Edit Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowProfileModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative bg-gray-800 rounded-lg border border-gray-700 shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">
                  {editingProfile ? 'Edit Profile' : 'Create Profile'}
                </h3>
              </div>

              <div className="px-6 py-4">
                {profileFormError && (
                  <div className="mb-4 bg-red-900 border border-red-700 rounded p-3">
                    <p className="text-sm text-red-300">{profileFormError}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Profile Name *
                    </label>
                    <input
                      type="text"
                      value={profileFormData.name}
                      onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="My Workspace"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      API Token *
                    </label>
                    <input
                      type="password"
                      value={profileFormData.apiToken}
                      onChange={(e) => setProfileFormData({ ...profileFormData, apiToken: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="xoxb- or xoxc-"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      D Cookie (Optional)
                    </label>
                    <input
                      type="password"
                      value={profileFormData.dCookie}
                      onChange={(e) => setProfileFormData({ ...profileFormData, dCookie: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="xoxd-"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      D-S Cookie (Optional)
                    </label>
                    <input
                      type="password"
                      value={profileFormData.dsCookie}
                      onChange={(e) => setProfileFormData({ ...profileFormData, dsCookie: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="d-s-cookie"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-700 rounded-b-lg flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowProfileModal(false)
                    setEditingProfile(null)
                    setProfileFormData({ name: '', apiToken: '', dCookie: '', dsCookie: '' })
                    setProfileFormError(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setProfileFormError(null)
                    if (!profileFormData.name.trim()) {
                      setProfileFormError('Profile name is required')
                      return
                    }
                    if (!profileFormData.apiToken.trim()) {
                      setProfileFormError('API token is required')
                      return
                    }

                    try {
                      if (editingProfile) {
                        await updateProfile(editingProfile.id, {
                          name: profileFormData.name,
                          apiToken: profileFormData.apiToken,
                          dCookie: profileFormData.dCookie,
                          dsCookie: profileFormData.dsCookie,
                        })
                      } else {
                        await createProfile({
                          name: profileFormData.name,
                          apiToken: profileFormData.apiToken,
                          dCookie: profileFormData.dCookie,
                          dsCookie: profileFormData.dsCookie,
                        })
                      }
                      setShowProfileModal(false)
                      setEditingProfile(null)
                      setProfileFormData({ name: '', apiToken: '', dCookie: '', dsCookie: '' })
                    } catch (error: any) {
                      setProfileFormError(
                        error.response?.data?.error ||
                        (editingProfile ? 'Failed to update profile' : 'Failed to create profile')
                      )
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
                >
                  {editingProfile ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDelete}
        title="Delete Custom Detector"
        message="Are you sure you want to delete this custom detector? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="red"
        showCancelButton={true}
      />

      <ConfirmDialog
        isOpen={deleteProfileId !== null}
        onClose={() => setDeleteProfileId(null)}
        onConfirm={async () => {
          if (deleteProfileId) {
            try {
              const isDeletingSelected = selectedProfile?.id === deleteProfileId
              // Get remaining profiles before deletion
              const remainingProfiles = profiles.filter(p => p.id !== deleteProfileId)
              
              await deleteProfile(deleteProfileId)
              setDeleteProfileId(null)
              
              // If we deleted the selected profile, select the next one
              if (isDeletingSelected && remainingProfiles.length > 0) {
                // Select the first remaining profile
                await selectProfile(remainingProfiles[0].id)
                // Reload the page to refresh with new credentials
                window.location.reload()
              } else if (isDeletingSelected && remainingProfiles.length === 0) {
                // No profiles left, just reload
                window.location.reload()
              }
            } catch (error) {
              // Error already set in store
            }
          }
        }}
        title="Delete Profile"
        message="Are you sure you want to delete this profile? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="red"
        showCancelButton={true}
      />
    </div>
  )
}
