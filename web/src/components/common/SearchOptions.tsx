import { useEffect } from 'react'
import { useChannelsStore } from '../../stores/channelsStore'
import { useUsersStore } from '../../stores/usersStore'
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown'

interface SearchOptionsProps {
  selectedChannels: string[]
  selectedUsers: string[]
  beforeDate: string
  afterDate: string
  isSearching: boolean
  onChannelsChange: (channels: string[]) => void
  onUsersChange: (users: string[]) => void
  onBeforeDateChange: (date: string) => void
  onAfterDateChange: (date: string) => void
}

export function SearchOptions({
  selectedChannels,
  selectedUsers,
  beforeDate,
  afterDate,
  isSearching,
  onChannelsChange,
  onUsersChange,
  onBeforeDateChange,
  onAfterDateChange
}: SearchOptionsProps) {
  const { channels, fetchChannels } = useChannelsStore()
  const { users, fetchUsers } = useUsersStore()

  // Load channels and users on component mount
  useEffect(() => {
    fetchChannels(false)
    fetchUsers()
  }, [fetchChannels, fetchUsers])

  // Prepare options for dropdowns
  const channelOptions = channels
    .filter(channel => !channel.is_im && !channel.is_mpim)
    .sort((a, b) => b.num_members - a.num_members)
    .map(channel => ({
      id: channel.name,
      label: channel.name,
      subtitle: `${channel.num_members} members`
    }))

  const userOptions = users
    .filter(user => !user.is_bot && user.real_name != "Deactivated User")
    .map(user => ({
      id: user.name,
      label: user.real_name,
      subtitle: `@${user.name}`
    }))

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="space-y-4">
        {/* Channels and Users Selection - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Channels Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Channels to Search (optional)
            </label>
            <MultiSelectDropdown
              options={channelOptions}
              selectedIds={selectedChannels}
              onSelectionChange={onChannelsChange}
              placeholder="Select channels to search..."
              disabled={isSearching}
            />
            <p className="text-xs text-gray-400 mt-1">
              Select specific channels to search. Leave empty to search all channels unless a user has been selected.
            </p>
          </div>

          {/* Users Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Users DMs to Search (optional)
            </label>
            <MultiSelectDropdown
              options={userOptions}
              selectedIds={selectedUsers}
              onSelectionChange={onUsersChange}
              placeholder="Select users for DM search..."
              disabled={isSearching}
            />
            <p className="text-xs text-gray-400 mt-1">
              Select users to search their DM conversations. Leave empty to search all DMs unless a channel has been selected.
            </p>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search After (optional)
            </label>
            <input
              type="date"
              value={afterDate}
              onChange={(e) => onAfterDateChange(e.target.value)}
              disabled={isSearching}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search Before (optional)
            </label>
            <input
              type="date"
              value={beforeDate}
              onChange={(e) => onBeforeDateChange(e.target.value)}
              disabled={isSearching}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  )
}