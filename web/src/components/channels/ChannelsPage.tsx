import { useState, useEffect } from 'react'
import { useChannelsStore } from '../../stores/channelsStore'
import { ChannelCard } from './ChannelCard'
import { Channel } from '../../types/api'
import { downloadJSON, generateFilename, getCurrentTimestamp } from '../../utils/export'
import { 
  FunnelIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  StopIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'

type ChannelType = 'all' | 'public' | 'private' | 'direct' | 'group'

const channelTypeOptions = [
  { value: 'all', label: 'All Channels', types: [] },
  { value: 'public', label: 'Public Channels', types: ['public_channel'] },
  { value: 'private', label: 'Private Channels', types: ['private_channel'] },
  { value: 'direct', label: 'Direct Messages', types: ['im'] },
  { value: 'group', label: 'Group Messages', types: ['mpim'] },
]

export function ChannelsPage() {
  const { channels, selectedType, isLoading, isAsyncLoading, error, fetchChannels, setSelectedType, clearError, stopLoading, syncToSearchCache } = useChannelsStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const [initialized, setInitialized] = useState<boolean>(false)

  useEffect(() => {
    if (initialized || channels.length === 0) {
      const types = channelTypeOptions.find(opt => opt.value === selectedType)?.types
      fetchChannels(types)
    }

    setInitialized(true)
  }, [selectedType, fetchChannels])

  // Sync to search cache when channels are loaded and we have all types
  useEffect(() => {
    if (!isAsyncLoading && channels.length > 0 && selectedType === 'all') {
      syncToSearchCache()
    }
  }, [channels.length, isAsyncLoading, selectedType, syncToSearchCache])

  const filteredChannels = channels.filter(channel => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      channel.name?.toLowerCase().includes(query) ||
      channel.topic?.toLowerCase().includes(query)
    )
  })

  const sortChannels = (a: Channel, b: Channel) => {
    // Sort by latest activity first (most recent first)
    if (b.latest !== a.latest) {
      return b.latest - a.latest
    }
    // Then by number of members (most members first)
    return b.num_members - a.num_members
  }

  const groupedChannels = {
    public: filteredChannels.filter(ch => !ch.is_private && !ch.is_archived && !ch.is_mpim && !ch.is_im).sort(sortChannels),
    private: filteredChannels.filter(ch => ch.is_private && !ch.is_archived && !ch.is_mpim && !ch.is_im).sort(sortChannels),
    direct: filteredChannels.filter(ch => ch.is_im).sort(sortChannels),
    group: filteredChannels.filter(ch => ch.is_mpim).sort(sortChannels),
    archived: filteredChannels.filter(ch => ch.is_archived).sort(sortChannels),
  }

  const getGroupTitle = (group: keyof typeof groupedChannels) => {
    const titles = {
      public: 'Public Channels',
      private: 'Private Channels', 
      direct: 'Direct Messages',
      group: 'Group Messages',
      archived: 'Archived Channels'
    }
    return titles[group]
  }

  const getGroupCount = (group: keyof typeof groupedChannels) => {
    return groupedChannels[group].length
  }

  const handleRefresh = () => {
    const types = channelTypeOptions.find(opt => opt.value === selectedType)?.types
    fetchChannels(types)
  }

  const handleExportChannels = () => {
    const timestamp = getCurrentTimestamp()
    const filename = generateFilename('channels', timestamp)
    
    downloadJSON({
      filename,
      data: filteredChannels,
      timestamp
    })
  }

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Channels</h1>
          <p className="text-gray-400">Browse and explore available channels</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportChannels}
            disabled={isLoading || isAsyncLoading || filteredChannels.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-slack-blue text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>Export Channels</span>
          </button>
          
          <button
            onClick={handleRefresh}
            disabled={isLoading || isAsyncLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Card and Async Loading */}
      {channels.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 inline-block">
            <div className="flex items-center">
              <ChatBubbleLeftRightIcon className="w-8 h-8 text-blue-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-400">Channels Loaded</p>
                <p className="text-2xl font-bold text-white">{channels.length}</p>
              </div>
            </div>
          </div>

          {/* Async Loading Indicator */}
          {isAsyncLoading && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <ArrowPathIcon className="w-5 h-5 text-blue-400 animate-spin" />
                <span className="text-blue-400 text-sm">Loading channel information...</span>
              </div>
              <button
                onClick={stopLoading}
                className="flex items-center space-x-2 px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 cursor-pointer"
              >
                <StopIcon className="w-4 h-4" />
                <span>Stop</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Channel Type Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Channel Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ChannelType)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {channelTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search Channels
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or topic..."
                className="w-full px-3 py-2 pl-10 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
              />
              <FunnelIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-900 border border-red-700 rounded-md p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-200">Error loading channels</h3>
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
      {isLoading && !isAsyncLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-400" />
            <span className="text-gray-400">Loading channels...</span>
          </div>
        </div>
      )}

      {/* Channels Grid */}
      {(!isLoading || isAsyncLoading) && !error && (
        <div className="space-y-6">
          {Object.entries(groupedChannels).map(([group, groupChannels]) => {
            if (groupChannels.length === 0) return null
            const isCollapsed = collapsedSections[group]
            
            return (
              <div key={group}>
                <div 
                  className="flex items-center justify-between mb-4 cursor-pointer hover:bg-gray-800 rounded-md p-2 -m-2"
                  onClick={() => toggleSection(group)}
                >
                  <div className="flex items-center space-x-2">
                    {isCollapsed ? (
                      <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                    )}
                    <h2 className="text-lg font-semibold text-white">
                      {getGroupTitle(group as keyof typeof groupedChannels)}
                    </h2>
                  </div>
                  <span className="text-sm text-gray-400">
                    {getGroupCount(group as keyof typeof groupedChannels)} channel{getGroupCount(group as keyof typeof groupedChannels) !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {!isCollapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupChannels.map((channel) => (
                      <ChannelCard key={channel.id} channel={channel} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          
          {filteredChannels.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                <FunnelIcon className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No channels found</h3>
              <p className="text-gray-400">
                {searchQuery 
                  ? `No channels match your search "${searchQuery}"`
                  : 'No channels available for the selected type'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}