import { useState, useEffect } from 'react'
import { BellIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'

export function Header() {
  const [currentPage, setCurrentPage] = useState('Dashboard')

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      const pageTitles: Record<string, string> = {
        dashboard: 'Dashboard',
        channels: 'Channels',
        users: 'Users',
        search: 'Search',
        secrets: 'Secret Scanner',
        settings: 'Settings'
      }
      setCurrentPage(pageTitles[hash] || 'Dashboard')
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return (
    <header className="bg-slack-dark border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">{currentPage}</h1>
          <p className="text-sm text-gray-400">Slack reconnaissance and secret detection</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors cursor-pointer">
            <BellIcon className="w-5 h-5" />
          </button>
          
          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors cursor-pointer">
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}