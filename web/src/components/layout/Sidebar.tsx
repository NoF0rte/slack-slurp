import { 
  HomeIcon, 
  MagnifyingGlassIcon, 
  ShieldCheckIcon, 
  ChatBubbleLeftRightIcon,
  UsersIcon,
  GlobeAltIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../stores/authStore'

const navigation = [
  { name: 'Dashboard', href: '#dashboard', icon: HomeIcon },
  { name: 'Channels', href: '#channels', icon: ChatBubbleLeftRightIcon },
  { name: 'Users', href: '#users', icon: UsersIcon },
  { name: 'Domains', href: '#domains', icon: GlobeAltIcon },
  { name: 'Search', href: '#search', icon: MagnifyingGlassIcon },
  { name: 'Secret Scanner', href: '#secrets', icon: ShieldCheckIcon },
  { name: 'Settings', href: '#settings', icon: Cog6ToothIcon },
]

export function Sidebar() {
  const { logout, currentUser } = useAuthStore()

  return (
    <div className="bg-slack-purple border-r border-gray-700 w-64 min-h-screen">
      <div className="p-6">
        <div className="flex items-center mb-8">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-slack-purple font-bold text-sm">SS</span>
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-semibold text-white">Slack-Slurp</h1>
            <p className="text-xs text-gray-300">Reconnaissance Tool</p>
          </div>
        </div>

        <nav className="space-y-2">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-800 hover:text-white transition-colors cursor-pointer"
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </a>
          ))}
        </nav>
      </div>

      <div className="bottom-0 left-0 right-0 p-6 border-t border-gray-700">
        {currentUser && (
          <div className="mb-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-slack-blue rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-xs">
                  {currentUser.user?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">{currentUser.user}</p>
                <p className="text-xs text-gray-300">{currentUser.team}</p>
              </div>
            </div>
          </div>
        )}
        
        <button
          onClick={logout}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-800 hover:text-red-400 transition-colors cursor-pointer"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
          Sign Out
        </button>
      </div>
    </div>
  )
}