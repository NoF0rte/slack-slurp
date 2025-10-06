import { useState } from 'react'
import { useSearchStore } from '../../stores/searchStore'
import { SearchOptions } from '../common/SearchOptions'
import { MessageCard } from './MessageCard'
import { FileCard } from './FileCard'
import { downloadJSON, generateFilename, getCurrentTimestamp } from '../../utils/export'
import { 
  MagnifyingGlassIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  StopIcon,
  DocumentTextIcon,
  ChatBubbleLeftIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

export function SearchPage() {
  const { 
    messages,
    files,
    isSearching, 
    dismissComplete,
    error, 
    currentSearch, 
    searchType,
    search,
    clearResults, 
    clearError, 
    stopSearch,
    setDismissComplete,
    setSearchType
  } = useSearchStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [beforeDate, setBeforeDate] = useState('')
  const [afterDate, setAfterDate] = useState('')
  const [fileTypes, setFileTypes] = useState('')
  const [showMessages, setShowMessages] = useState(true)
  const [showFiles, setShowFiles] = useState(true)

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      clearError()
      return
    }

    const request = {
      search_type: searchType,
      query: searchQuery,
      channels: selectedChannels,
      users: selectedUsers,
      before: beforeDate,
      after: afterDate,
      file_types: fileTypes ? fileTypes.split(',').map(type => type.trim()).filter(type => type.length > 0) : undefined
    }

    // Reset dismiss state for new search
    setDismissComplete(false)

    try {
      await search(request)
    } catch (err) {
      console.error('Search error:', err)
    }
  }

  const handleStop = () => {
    stopSearch()
  }

  const handleExportResults = () => {
    const timestamp = getCurrentTimestamp()
    const filename = generateFilename('search', timestamp)
    
    const exportData = {
      query: searchQuery,
      searchType,
      timestamp,
      messages,
      files,
      totalResults: messages.length + files.length
    }
    
    downloadJSON({
      filename,
      data: exportData,
      timestamp
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Search</h1>
          <p className="text-gray-400">Search Slack messages and files</p>
        </div>
        
        {(messages.length > 0 || files.length > 0) && (
          <button
            onClick={handleExportResults}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>Export Results</span>
          </button>
        )}
      </div>

      {/* Search Query Form */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
            <div className="flex-1">
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
            
            {/* Search Type Selection */}
            <div className="flex-shrink-0">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search Type
              </label>
              <div className="flex bg-gray-700 rounded-lg p-1">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="searchType"
                    value="messages"
                    checked={searchType === 'messages'}
                    onChange={(e) => setSearchType(e.target.value as 'messages')}
                    disabled={isSearching}
                    className="sr-only"
                  />
                  <span className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    searchType === 'messages'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-600'
                  }`}>
                    Messages
                  </span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="searchType"
                    value="files"
                    checked={searchType === 'files'}
                    onChange={(e) => setSearchType(e.target.value as 'files')}
                    disabled={isSearching}
                    className="sr-only"
                  />
                  <span className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    searchType === 'files'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-600'
                  }`}>
                    Files
                  </span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="searchType"
                    value="both"
                    checked={searchType === 'both' || searchType === undefined}
                    onChange={(e) => setSearchType(e.target.value as 'both')}
                    disabled={isSearching}
                    className="sr-only"
                  />
                  <span className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    searchType === 'both' || searchType === undefined
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-600'
                  }`}>
                    Both
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* File Types Field - Only show when files or both is selected */}
          {(searchType === 'files' || searchType === 'both' || searchType === undefined) && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                File Types (Optional)
              </label>
              <input
                type="text"
                value={fileTypes}
                onChange={(e) => setFileTypes(e.target.value)}
                placeholder="e.g., pdf, doc, jpg, png (comma-separated)"
                disabled={isSearching}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
              />
              <p className="text-xs text-gray-400 mt-1">
                Specify file types to search for. Leave empty to search all file types.
              </p>
            </div>
          )}
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
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          {isSearching ? (
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
          ) : (
            <PlayIcon className="w-4 h-4" />
          )}
          <span>{isSearching ? 'Searching...' : 'Search'}</span>
        </button>

        {isSearching && (
          <button
            onClick={handleStop}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            <StopIcon className="w-4 h-4" />
            <span>Stop</span>
          </button>
        )}

        {(messages.length > 0 || files.length > 0) && (
          <button
            onClick={clearResults}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            <span>Clear Results</span>
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
            <span className="text-red-400 font-medium">Error</span>
          </div>
          <p className="text-red-300 mt-1">{error}</p>
          <button
            onClick={clearError}
            className="mt-2 text-red-400 hover:text-red-300 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Completion Status */}
      {currentSearch?.status === 'completed' && !dismissComplete && (
        <div className="bg-green-900/50 border border-green-500 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">Search Complete</span>
            </div>
            <button
              onClick={() => setDismissComplete(true)}
              className="text-green-400 hover:text-green-300 text-sm"
            >
              ✕
            </button>
          </div>
          <p className="text-green-300 mt-1">
            Found {messages.length} messages and {files.length} files
          </p>
        </div>
      )}

      {/* Results */}
      {(messages.length > 0 || files.length > 0) && (
        <div className="space-y-6">
          {/* Messages Results */}
          {messages.length > 0 && (
            <div className="space-y-4">
              <button
                onClick={() => setShowMessages(!showMessages)}
                className="flex items-center space-x-2 text-left w-full hover:bg-gray-700 rounded-lg p-2 transition-colors"
              >
                {showMessages ? (
                  <ChevronDownIcon className="w-5 h-5 text-blue-400" />
                ) : (
                  <ChevronRightIcon className="w-5 h-5 text-blue-400" />
                )}
                <ChatBubbleLeftIcon className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Messages ({messages.length})</h2>
              </button>
              {showMessages && (
                <div className="space-y-3">
                  {messages.map((message, index) => (
                    <MessageCard key={index} message={message} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Files Results */}
          {files.length > 0 && (
            <div className="space-y-4">
              <button
                onClick={() => setShowFiles(!showFiles)}
                className="flex items-center space-x-2 text-left w-full hover:bg-gray-700 rounded-lg p-2 transition-colors"
              >
                {showFiles ? (
                  <ChevronDownIcon className="w-5 h-5 text-green-400" />
                ) : (
                  <ChevronRightIcon className="w-5 h-5 text-green-400" />
                )}
                <DocumentTextIcon className="w-5 h-5 text-green-400" />
                <h2 className="text-lg font-semibold text-white">Files ({files.length})</h2>
              </button>
              {showFiles && (
                <div className="space-y-3">
                  {files.map((file, index) => (
                    <FileCard key={index} file={file} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isSearching && messages.length === 0 && files.length === 0 && (
        <div className="text-center py-12">
          <MagnifyingGlassIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No search results</h3>
          <p className="text-gray-500">Enter a search query and click Search to find messages and files.</p>
        </div>
      )}
    </div>
  )
}