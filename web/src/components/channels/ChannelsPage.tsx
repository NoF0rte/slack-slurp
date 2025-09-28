import { useState, useEffect } from 'react'
import { useChannelsStore } from '../../stores/channelsStore'
import { ChannelCard } from './ChannelCard'
import { downloadJSON, generateFilename, getCurrentTimestamp } from '../../utils/export'
import { 
  FunnelIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon
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
  const { channels, isLoading, error, fetchChannels, clearError } = useChannelsStore()
  const [selectedType, setSelectedType] = useState<ChannelType>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const types = channelTypeOptions.find(opt => opt.value === selectedType)?.types
    fetchChannels(types)
  }, [selectedType, fetchChannels])

  const filteredChannels = channels.filter(channel => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      channel.name?.toLowerCase().includes(query) ||
      channel.topic?.toLowerCase().includes(query)
    )
  })

  const groupedChannels = {
    public: filteredChannels.filter(ch => !ch.is_private && !ch.is_archived && !ch.is_mpim && !ch.is_im),
    private: filteredChannels.filter(ch => ch.is_private && !ch.is_archived && !ch.is_mpim && !ch.is_im),
    direct: filteredChannels.filter(ch => ch.is_im),
    group: filteredChannels.filter(ch => ch.is_mpim),
    archived: filteredChannels.filter(ch => ch.is_archived),
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Channels</h1>
          <p className="text-gray-500">Browse and explore available channels</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportChannels}
            disabled={isLoading || filteredChannels.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>Export Channels</span>
          </button>
          
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Channel Type Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Channel Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ChannelType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Channels
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or topic..."
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <FunnelIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error loading channels</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={clearError}
            className="mt-3 text-sm text-red-600 hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-gray-500">Loading channels...</span>
          </div>
        </div>
      )}

      {/* Channels Grid */}
      {!isLoading && !error && (
        <div className="space-y-6">
          {Object.entries(groupedChannels).map(([group, groupChannels]) => {
            if (groupChannels.length === 0) return null
            
            return (
              <div key={group}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {getGroupTitle(group as keyof typeof groupedChannels)}
                  </h2>
                  <span className="text-sm text-gray-500">
                    {getGroupCount(group as keyof typeof groupedChannels)} channel{getGroupCount(group as keyof typeof groupedChannels) !== 1 ? 's' : ''}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupChannels.map((channel) => (
                    <ChannelCard key={channel.id} channel={channel} />
                  ))}
                </div>
              </div>
            )
          })}
          
          {filteredChannels.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <FunnelIcon className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No channels found</h3>
              <p className="text-gray-500">
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