import { useState } from 'react'
import { SearchOptions } from '../common/SearchOptions'
import { 
  MagnifyingGlassIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

export function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [beforeDate, setBeforeDate] = useState('')
  const [afterDate, setAfterDate] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query')
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      // TODO: Implement actual search functionality
      console.log('Search query:', searchQuery)
      console.log('Selected channels:', selectedChannels)
      console.log('Selected users:', selectedUsers)
      console.log('Date range:', { before: beforeDate, after: afterDate })
      
      // Simulate search delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
    } catch (err) {
      setError('Search failed. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const clearError = () => {
    setError(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Message Search</h1>
          <p className="text-gray-400">Search Slack messages and files</p>
        </div>
      </div>

      {/* Search Query Form */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search Query
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter your search query..."
                disabled={isSearching}
                className="w-full px-3 py-2 pl-10 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Use Slack's search syntax. Examples: "from:@username", "in:#channel", "has:link", "before:2024-01-01"
            </p>
          </div>
        </div>
      </div>

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
          disabled={isSearching || !searchQuery.trim()}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <PlayIcon className="w-4 h-4" />
          <span>Start Search</span>
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
      {isSearching && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-400" />
            <span className="text-gray-400">Searching...</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isSearching && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <DocumentTextIcon className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No search performed</h3>
          <p className="text-gray-400">
            Enter a search query above and click "Start Search" to begin searching Slack messages and files.
          </p>
        </div>
      )}
    </div>
  )
}