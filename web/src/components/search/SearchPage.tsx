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
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

export function SearchPage() {
  const { 
    messages,
    files,
    isSearching, 
    error, 
    searchType,
    search,
    clearResults, 
    clearError, 
    stopSearch,
    setSearchType,
    searchQuery,
    selectedChannels,
    selectedUsers,
    beforeDate,
    afterDate,
    fileTypes,
    setSearchQuery,
    setSelectedChannels,
    setSelectedUsers,
    setBeforeDate,
    setAfterDate,
    setFileTypes,
    clearForm
  } = useSearchStore()

  const [showMessages, setShowMessages] = useState(true)
  const [showFiles, setShowFiles] = useState(true)
  const [filterQuery, setFilterQuery] = useState('')

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

    try {
      await search(request)
    } catch (err) {
      console.error('Search error:', err)
    }
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

  // Filter results based on filter query
  const filteredMessages = messages.filter(message => {
    if (!filterQuery) return true
    const query = filterQuery.toLowerCase()
    return (
      message.text.toLowerCase().includes(query) ||
      message.user.toLowerCase().includes(query) ||
      message.channel.toLowerCase().includes(query)
    )
  })

  const filteredFiles = files.filter(file => {
    if (!filterQuery) return true
    const query = filterQuery.toLowerCase()
    return (
      file.name.toLowerCase().includes(query) ||
      file.user.toLowerCase().includes(query) ||
      file.filetype.toLowerCase().includes(query) ||
      (file.channels && file.channels.some(channel => channel.toLowerCase().includes(query)))
    )
  })

  // Highlight search terms in text
  const highlightText = (text: string, searchTerm?: string, isCodeBlock = false) => {
    if (!searchTerm) return text
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className={`px-1 rounded ${
          isCodeBlock 
            ? 'bg-yellow-300 text-yellow-900' // Brighter highlight for code blocks
            : 'bg-yellow-200 text-yellow-900' // Standard highlight for regular text
        }`}>
          {part}
        </mark>
      ) : part
    )
  }

  // Render Slack text with code blocks and inline code
  const renderSlackText = (text: string, searchTerm?: string) => {
    // Split by code blocks first
    const codeBlockRegex = /```([\s\S]*?)```/g
    const parts = text.split(codeBlockRegex)
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is a code block - apply highlighting inside code blocks too
        const highlightedCode = searchTerm ? highlightText(part, searchTerm, true) : part
        return (
          <pre key={index} className="bg-gray-900 text-gray-100 p-3 rounded-md my-2 max-w-full overflow-hidden">
            <code className="text-sm break-words whitespace-pre-wrap">{highlightedCode}</code>
          </pre>
        )
      } else {
        // This is regular text, process inline code and highlight
        const inlineCodeRegex = /`([^`]+)`/g
        const textParts = part.split(inlineCodeRegex)
        
        return textParts.map((textPart, textIndex) => {
          if (textIndex % 2 === 1) {
            // This is inline code - apply highlighting inside inline code too
            const highlightedInlineCode = searchTerm ? highlightText(textPart, searchTerm, true) : textPart
            return (
              <code key={textIndex} className="bg-gray-700 text-gray-200 px-1 py-0.5 rounded text-sm font-mono break-words">
                {highlightedInlineCode}
              </code>
            )
          } else {
            // This is regular text, apply highlighting
            return searchTerm ? highlightText(textPart, searchTerm, false) : textPart
          }
        })
      }
    })
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Search</h1>
          <p className="text-gray-400">Search Slack messages and files</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportResults}
            disabled={isSearching || (messages.length === 0 && files.length === 0)}
            className="flex items-center space-x-2 px-4 py-2 bg-slack-blue text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>Export Results</span>
          </button>
          
          <button
            onClick={clearResults}
            disabled={isSearching}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>Clear Results</span>
          </button>
        </div>
      </div>

      {/* Stats Cards and Search Status */}
      {(messages.length > 0 || files.length > 0 || isSearching) && (
        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 inline-block">
              <div className="flex items-center">
                <ChatBubbleLeftIcon className="w-8 h-8 text-blue-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-400">Messages Found</p>
                  <p className="text-2xl font-bold text-white">{messages.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 inline-block">
              <div className="flex items-center">
                <DocumentTextIcon className="w-8 h-8 text-green-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-400">Files Found</p>
                  <p className="text-2xl font-bold text-white">{files.length}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Search Status - Right aligned */}
          {isSearching && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <ArrowPathIcon className="w-5 h-5 text-blue-400 animate-spin" />
                <span className="text-blue-400 text-sm">Searching through messages and files...</span>
              </div>
              <button
                onClick={stopSearch}
                className="flex items-center space-x-2 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
              >
                <StopIcon className="w-4 h-4" />
                <span>Stop</span>
              </button>
            </div>
          )}
        </div>
      )}

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
                Enter Slack search query
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
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSearching ? (
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
          ) : (
            <PlayIcon className="w-4 h-4" />
          )}
          <span>{isSearching ? 'Searching...' : 'Search'}</span>
        </button>
        
        <button
          onClick={clearForm}
          disabled={isSearching}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <ArrowPathIcon className="w-4 h-4" />
          <span>Clear Form</span>
        </button>
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


      {/* Results Filter */}
      {(messages.length > 0 || files.length > 0) && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Filter Results
          </label>
          <div className="relative">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter results by content, user, channel, or file type..."
              className="w-full px-3 py-2 pl-10 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Showing {filteredMessages.length} of {messages.length} messages and {filteredFiles.length} of {files.length} files
          </p>
        </div>
      )}

      {/* Results */}
      {(messages.length > 0 || files.length > 0) && (
        <div className="space-y-6 w-full max-w-full overflow-hidden">
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
                <h2 className="text-lg font-semibold text-white">
                  Messages ({filteredMessages.length}{filteredMessages.length !== messages.length ? ` of ${messages.length}` : ''})
                </h2>
              </button>
              {showMessages && (
                <div className="space-y-3">
                  {filteredMessages.map((message, index) => (
                    <MessageCard key={index} message={message} highlightText={renderSlackText} searchTerm={searchQuery} />
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
                <h2 className="text-lg font-semibold text-white">
                  Files ({filteredFiles.length}{filteredFiles.length !== files.length ? ` of ${files.length}` : ''})
                </h2>
              </button>
              {showFiles && (
                <div className="space-y-3">
                  {filteredFiles.map((file, index) => (
                    <FileCard key={index} file={file} highlightText={highlightText} searchTerm={searchQuery} />
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