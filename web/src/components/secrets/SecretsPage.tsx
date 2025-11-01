import { useState, useEffect } from 'react'
import { useSecretScanStore } from '../../stores/secretScanStore'
import { SearchOptions } from '../common/SearchOptions'
import { SecretResultCard } from './SecretResultCard'
import { DetectorSelector } from './DetectorSelector'
import { DetectorFilter } from './DetectorFilter'
import { downloadJSON, generateFilename, getCurrentTimestamp } from '../../utils/export'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { 
  MagnifyingGlassIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  StopIcon,
  ShieldCheckIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'

export function SecretsPage() {
  const { 
    results, 
    isLoading, 
    isScanning, 
    error, 
    startScan, 
    clearResults, 
    clearError, 
    stopScan,
    selectedChannels,
    selectedUsers,
    beforeDate,
    afterDate,
    selectedDetectors,
    verify,
    verifiedOnly,
    setSelectedChannels,
    setSelectedUsers,
    setBeforeDate,
    setAfterDate,
    setSelectedDetectors,
    setVerify,
    setVerifiedOnly,
    clearForm,
    builtinDetectors: availableDetectors,
    customDetectors,
    loadDetectors,
    isLoadingDetectors,
    hideFalsePositives,
    toggleFalsePositive,
    setHideFalsePositives
  } = useSecretScanStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDetectorFilters, setSelectedDetectorFilters] = useState<string[]>([])
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportData, setExportData] = useState<{ filename: string; data: any; timestamp: number } | null>(null)

  useEffect(() => {
    loadDetectors()
  }, [loadDetectors])

  const handleScan = async () => {
    if (selectedDetectors.length === 0) {
      clearError()
      return
    }

    const request: any = {
      channels: selectedChannels,
      detectors: selectedDetectors,
      verify,
      verified_only: verifiedOnly
    }

    if (selectedUsers.length > 0) {
      request.users = selectedUsers
    }
    if (beforeDate) {
      request.before = beforeDate
    }
    if (afterDate) {
      request.after = afterDate
    }
    
    await startScan(request)
  }

  const handleStop = () => {
    stopScan()
  }

  const handleExportResults = () => {
    const timestamp = getCurrentTimestamp()
    const filename = generateFilename('secrets', timestamp)
    
    // Check if there are any false positives
    const hasFalsePositives = results.some(result => result.false_positive)
    
    if (hasFalsePositives) {
      // Show dialog to ask about including false positives
      setExportData({
        filename,
        data: results,
        timestamp
      })
      setShowExportDialog(true)
    } else {
      // No false positives, export all results directly
      downloadJSON({
        filename,
        data: results,
        timestamp
      })
    }
  }


  // Filter results based on search query, detector filters, and false positives
  const filteredResults = results.filter(result => {
    // Filter by false positives
    if (hideFalsePositives && result.false_positive) {
      return false
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = (
        result.context.toLowerCase().includes(query) ||
        result.channel.toLowerCase().includes(query) ||
        result.user.toLowerCase().includes(query) ||
        result.secrets.some(secret => 
          secret.raw.toLowerCase().includes(query)
        )
      )
      if (!matchesSearch) return false
    }
    
    // Filter by detector filters
    if (selectedDetectorFilters.length > 0) {
      if (!selectedDetectorFilters.includes(result.detector.toLowerCase())) return false
    }
    
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Secret Scanning</h1>
          <p className="text-gray-400">Scan Slack messages for exposed secrets and sensitive data</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportResults}
            disabled={isLoading || results.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-slack-blue text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>Export Results</span>
          </button>
          
          <button
            onClick={clearResults}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>Clear Results</span>
          </button>
        </div>
      </div>

      {/* Stats and Scan Status */}
      {results.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 inline-block">
              <div className="flex items-center">
                <ShieldCheckIcon className="w-8 h-8 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-400">Total Secrets</p>
                  <p className="text-2xl font-bold text-white">{results.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Scan Status */}
          {isScanning && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <ArrowPathIcon className="w-5 h-5 text-blue-400 animate-spin" />
                <span className="text-blue-400 text-sm">Scanning for secrets...</span>
              </div>
              <button
                onClick={handleStop}
                className="flex items-center space-x-2 px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 cursor-pointer"
              >
                <StopIcon className="w-4 h-4" />
                <span>Stop</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detector Selection */}
      <DetectorSelector
        availableDetectors={availableDetectors}
        customDetectors={customDetectors}
        selectedDetectors={selectedDetectors}
        onDetectorsChange={setSelectedDetectors}
        isLoading={isLoadingDetectors}
      />

      {/* Search Options */}
      <SearchOptions
        selectedChannels={selectedChannels}
        selectedUsers={selectedUsers}
        beforeDate={beforeDate}
        afterDate={afterDate}
        isSearching={isScanning}
        onChannelsChange={setSelectedChannels}
        onUsersChange={setSelectedUsers}
        onBeforeDateChange={setBeforeDate}
        onAfterDateChange={setAfterDate}
      />

      {/* Scan Options */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Scan Options</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="verify"
              checked={verify}
              onChange={(e) => setVerify(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="verify" className="text-sm text-gray-300">
              Verify secrets (attempts to validate if secrets are real)
            </label>
          </div>
          
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="verifiedOnly"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="verifiedOnly" className="text-sm text-gray-300">
              Only show verified secrets
            </label>
          </div>
          
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={handleScan}
            disabled={isLoading || isScanning || selectedDetectors.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isScanning ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <PlayIcon className="w-4 h-4" />
            )}
            <span>{isScanning ? 'Scanning...' : 'Start Scan'}</span>
          </button>
          
          <button
            onClick={clearForm}
            disabled={isLoading || isScanning}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>Clear Form</span>
          </button>
        </div>
      </div>


      {/* Error State */}
      {error && (
        <div className="bg-red-900 border border-red-700 rounded-md p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-200">Scan Error</h3>
              <p className="text-sm text-red-300 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={clearError}
            className="mt-3 text-sm text-red-300 hover:text-red-200 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !isScanning && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-400" />
            <span className="text-gray-400">Starting scan...</span>
          </div>
        </div>
      )}


      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-white">
                Scan Results
              </h2>
              <span className="text-sm text-gray-400">
                {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex space-x-4">
            {/* Search Filter */}
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter results by secret, context, user, or channel..."
                className="w-full px-3 py-2 pl-10 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            </div>
            
            {/* Detector Filter */}
            <div className="w-80">
              <DetectorFilter
                availableDetectors={selectedDetectors}
                selectedDetectors={selectedDetectorFilters}
                onDetectorsChange={setSelectedDetectorFilters}
                placeholder="Filter by detectors..."
              />
            </div>
            
            {/* Hide False Positives Toggle */}
            <div className="flex items-center space-x-3 bg-gray-800 rounded-lg border border-gray-700 px-4 py-2">
              <span className="text-sm text-gray-300 whitespace-nowrap">Hide false positives</span>
              <button
                onClick={() => setHideFalsePositives(!hideFalsePositives)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                  hideFalsePositives ? 'bg-blue-600' : 'bg-gray-600'
                }`}
                role="switch"
                aria-checked={hideFalsePositives}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    hideFalsePositives ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
          
          {filteredResults.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredResults.map((result, index) => (
                <SecretResultCard 
                  key={`${result.timestamp}-${index}`} 
                  result={result}
                  onToggleFalsePositive={() => toggleFalsePositive(result.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                <MagnifyingGlassIcon className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No results found</h3>
              <p className="text-gray-400">
                {searchQuery 
                  ? `No secrets match your filter "${searchQuery}"`
                  : 'No secrets found in the scanned messages'
                }
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Empty State */}
      {!isLoading && !isScanning && results.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <ShieldCheckIcon className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No scan performed</h3>
          <p className="text-gray-400">
            Select detectors and channels above, then click "Start Scan" to begin scanning for secrets.
          </p>
        </div>
      )}
      
      {/* Export Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showExportDialog}
        onClose={() => {
          setShowExportDialog(false)
          setExportData(null)
        }}
        onConfirm={() => {
          if (exportData) {
            downloadJSON(exportData)
          }
          setShowExportDialog(false)
          setExportData(null)
        }}
        onDecline={() => {
          if (exportData) {
            const filteredResults = results.filter(result => !result.false_positive)
            downloadJSON({
              ...exportData,
              data: filteredResults
            })
          }
          setShowExportDialog(false)
          setExportData(null)
        }}
        onCancel={() => {
          setShowExportDialog(false)
          setExportData(null)
        }}
        title="Export Results"
        message={`Found ${results.filter(result => result.false_positive).length} false positive(s). Do you want to include them in the export?`}
        confirmText="Yes"
        declineText="No"
        cancelText="Cancel"
        confirmButtonColor="blue"
        declineButtonColor="gray"
        showCancelButton={true}
      />
    </div>
  )
}