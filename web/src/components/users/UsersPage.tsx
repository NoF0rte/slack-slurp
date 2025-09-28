import { useState, useEffect } from 'react'
import { useUsersStore } from '../../stores/usersStore'
import { UserCard } from './UserCard'
import { downloadJSON, generateFilename, getCurrentTimestamp } from '../../utils/export'
import { 
  MagnifyingGlassIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon,
  UsersIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  StarIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

type UserFilter = 'all' | 'active' | 'bots' | 'admins' | 'deleted'

const userFilterOptions = [
  { value: 'all', label: 'All Users', icon: UsersIcon },
  { value: 'active', label: 'Active Users', icon: UserGroupIcon },
  { value: 'bots', label: 'Bots', icon: ShieldCheckIcon },
  { value: 'admins', label: 'Admins & Owners', icon: StarIcon },
  { value: 'deleted', label: 'Deleted Users', icon: ExclamationTriangleIcon },
]

export function UsersPage() {
  const { users, isLoading, error, fetchUsers, clearError } = useUsersStore()
  const [selectedFilter, setSelectedFilter] = useState<UserFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const filteredUsers = users.filter(user => {
    // Apply filter
    let passesFilter = true
    switch (selectedFilter) {
      case 'active':
        passesFilter = !user.deleted && !user.is_bot
        break
      case 'bots':
        passesFilter = user.is_bot
        break
      case 'admins':
        passesFilter = user.is_admin || user.is_owner
        break
      case 'deleted':
        passesFilter = user.deleted
        break
      case 'all':
      default:
        passesFilter = true
        break
    }
    
    if (!passesFilter) return false
    
    // Apply search
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      user.name?.toLowerCase().includes(query) ||
      user.real_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.title?.toLowerCase().includes(query)
    )
  })

  const getUserStats = () => {
    const total = users.length
    const active = users.filter(u => !u.deleted && !u.is_bot).length
    const bots = users.filter(u => u.is_bot).length
    const admins = users.filter(u => u.is_admin || u.is_owner).length
    const deleted = users.filter(u => u.deleted).length
    
    return { total, active, bots, admins, deleted }
  }

  const stats = getUserStats()

  const handleRefresh = () => {
    fetchUsers()
  }

  const handleExportUsers = () => {
    const timestamp = getCurrentTimestamp()
    const filename = generateFilename('users', timestamp)
    
    downloadJSON({
      filename,
      data: filteredUsers,
      timestamp
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500">Browse workspace users and their information</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportUsers}
            disabled={isLoading || filteredUsers.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>Export Users</span>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <UsersIcon className="w-8 h-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <UserGroupIcon className="w-8 h-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <ShieldCheckIcon className="w-8 h-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Bots</p>
              <p className="text-2xl font-bold text-gray-900">{stats.bots}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <StarIcon className="w-8 h-8 text-purple-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Admins</p>
              <p className="text-2xl font-bold text-gray-900">{stats.admins}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Deleted</p>
              <p className="text-2xl font-bold text-gray-900">{stats.deleted}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* User Type Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Type
            </label>
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as UserFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {userFilterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Users
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or title..."
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
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
              <h3 className="text-sm font-medium text-red-800">Error loading users</h3>
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
            <span className="text-gray-500">Loading users...</span>
          </div>
        </div>
      )}

      {/* Users Grid */}
      {!isLoading && !error && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {userFilterOptions.find(opt => opt.value === selectedFilter)?.label}
            </h2>
            <span className="text-sm text-gray-500">
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {filteredUsers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredUsers.map((user) => (
                <UserCard user={user} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <MagnifyingGlassIcon className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-500">
                {searchQuery 
                  ? `No users match your search "${searchQuery}"`
                  : 'No users available for the selected filter'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}