import { BellIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Slack reconnaissance and secret detection</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
            <BellIcon className="w-5 h-5" />
          </button>
          
          <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}