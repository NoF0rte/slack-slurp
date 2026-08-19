import { useState } from 'react'
import { useURLsStore } from '../../stores/urlsStore'
import { URLCard } from './URLCard'
import { SearchOptions } from '../common/SearchOptions'
import { downloadJSON, generateFilename, getCurrentTimestamp } from '../../utils/export'
import { 
  MagnifyingGlassIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  PlayIcon,
  StopIcon,
  LinkIcon
} from '@heroicons/react/24/outline'

export function URLsPage() {
  const { 
    results, 
    isLoading, 
    isSearching, 
    error, 
    searchURLs, 
    clearResults, 
    clearError, 
    stopSearch,
    selectedChannels,
    selectedUsers,
    beforeDate,
    afterDate,
    setSelectedChannels,
    setSelectedUsers,
    setBeforeDate,
    setAfterDate,
    clearForm
  } = useURLsStore()

  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = async () => {
    const request: any = {}
    
    if (selectedChannels.length > 0) {
      request.channels = selectedChannels
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
    
    await searchURLs(request)
  }

  const handleStop = () => {
    stopSearch()
  }

  const handleExportResults = () => {
    const timestamp = getCurrentTimestamp()
    const filename = generateFilename('urls', timestamp)
    
    downloadJSON({
      filename,
      data: results,
      timestamp
    })
  }

  const filteredResults = results.filter(result => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      result.toLowerCase().includes(query)
    )
  })


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">URL Search</h1>
          <p className="text-gray-400">Search Slack for URLs in messages</p>
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


      {/* Stats Card and Search Status */}
      {results.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 inline-block">
            <div className="flex items-center">
              <LinkIcon className="w-8 h-8 text-blue-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-400">URLs Found</p>
                <p className="text-2xl font-bold text-white">{results.length}</p>
              </div>
            </div>
          </div>

          {/* Search Status */}
          {isSearching && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <ArrowPathIcon className="w-5 h-5 text-blue-400 animate-spin" />
                <span className="text-blue-400 text-sm">Searching Slack for URLs...</span>
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

      {/* Search Options */}
      <SearchOptions
        selectedChannels={selectedChannels}
        selectedUsers={selectedUsers}
        beforeDate={beforeDate}
        afterDate={afterDate}
        isSearching={isSearching}
        onChannelsChange={setSelectedChannels}
        onUsersChange={setSelectedUsers}
        onBeforeDateChange={setBeforeDate}
        onAfterDateChange={setAfterDate}
      />

      {/* Search Button */}
      <div className="flex items-center space-x-3">
        <button
          onClick={handleSearch}
          disabled={isLoading || isSearching}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <PlayIcon className="w-4 h-4" />
          <span>Start Search</span>
        </button>
        
        <button
          onClick={clearForm}
          disabled={isLoading || isSearching}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <ArrowPathIcon className="w-4 h-4" />
          <span>Clear Form</span>
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-900 border border-red-700 rounded-md p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-200">Search Error</h3>
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
      {isLoading && !isSearching && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-400" />
            <span className="text-gray-400">Starting search...</span>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Search Results
            </h2>
            <span className="text-sm text-gray-400">
              {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {/* Search Filter */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter URLs by content..."
              className="w-full px-3 py-2 pl-10 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          </div>
          
          {filteredResults.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredResults.map((result, index) => (
                <URLCard key={`${index}`} result={result} />
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
                  ? `No URLs match your filter "${searchQuery}"`
                  : 'No URLs found in Slack messages'
                }
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Empty State */}
      {!isLoading && !isSearching && results.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <LinkIcon className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No search performed</h3>
          <p className="text-gray-400">
            Configure your search parameters above and click "Start Search" to begin searching Slack for URLs.
          </p>
        </div>
      )}
    </div>
  )
}