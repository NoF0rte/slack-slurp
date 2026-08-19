import { useState, useEffect } from 'react'
import { ChannelsPage } from './channels/ChannelsPage'
import { UsersPage } from './users/UsersPage'
import { DomainsPage } from './domains/DomainsPage'
import { URLsPage } from './urls/URLsPage'
import { SearchPage } from './search/SearchPage'
import { SecretsPage } from './secrets/SecretsPage'
import { SettingsPage } from './settings/SettingsPage'

type Route = 'dashboard' | 'channels' | 'users' | 'domains' | 'urls' | 'search' | 'secrets' | 'settings'

export function Router() {
  const [currentRoute, setCurrentRoute] = useState<Route>('dashboard')

  // Simple hash-based routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) as Route
      if (hash && ['dashboard', 'channels', 'users', 'domains', 'urls', 'search', 'secrets', 'settings'].includes(hash)) {
        setCurrentRoute(hash)
      } else {
        setCurrentRoute('dashboard')
      }
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const renderRoute = () => {
    switch (currentRoute) {
      case 'channels':
        return <ChannelsPage />
      case 'users':
        return <UsersPage />
      case 'domains':
        return <DomainsPage />
      case 'urls':
        return <URLsPage />
      case 'search':
        return <SearchPage />
      case 'secrets':
        return <SecretsPage />
      case 'settings':
        return <SettingsPage />
      case 'dashboard':
      default:
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white mb-6">
              Slack-Slurp Dashboard
            </h1>
            <p className="text-gray-400 mb-6">
              Welcome to the Slack reconnaissance and secret detection dashboard.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:bg-gray-750 transition-colors">
                <h2 className="text-lg font-semibold text-white mb-2">Channels</h2>
                <p className="text-gray-400 mb-4">Browse and explore available channels</p>
                <a href="#channels" className="text-blue-400 hover:text-blue-300 font-medium cursor-pointer">View Channels →</a>
              </div>
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:bg-gray-750 transition-colors">
                <h2 className="text-lg font-semibold text-white mb-2">Users</h2>
                <p className="text-gray-400 mb-4">View workspace users and their information</p>
                <a href="#users" className="text-blue-400 hover:text-blue-300 font-medium cursor-pointer">View Users →</a>
              </div>
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:bg-gray-750 transition-colors">
                <h2 className="text-lg font-semibold text-white mb-2">Domains</h2>
                <p className="text-gray-400 mb-4">Search Slack for mentions of specific domains</p>
                <a href="#domains" className="text-blue-400 hover:text-blue-300 font-medium cursor-pointer">Search Domains →</a>
              </div>
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:bg-gray-750 transition-colors">
                <h2 className="text-lg font-semibold text-white mb-2">URLs</h2>
                <p className="text-gray-400 mb-4">Search Slack for URLs in messages</p>
                <a href="#urls" className="text-blue-400 hover:text-blue-300 font-medium cursor-pointer">Search URLs →</a>
              </div>
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:bg-gray-750 transition-colors">
                <h2 className="text-lg font-semibold text-white mb-2">Search</h2>
                <p className="text-gray-400 mb-4">Search messages and files across channels</p>
                <a href="#search" className="text-blue-400 hover:text-blue-300 font-medium cursor-pointer">Search →</a>
              </div>
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:bg-gray-750 transition-colors">
                <h2 className="text-lg font-semibold text-white mb-2">Secret Scanner</h2>
                <p className="text-gray-400 mb-4">Scan for secrets and sensitive information</p>
                <a href="#secrets" className="text-blue-400 hover:text-blue-300 font-medium cursor-pointer">Start Scan →</a>
              </div>
            </div>
          </div>
        )
    }
  }

  return renderRoute()
}