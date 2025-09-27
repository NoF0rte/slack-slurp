import { 
  HomeIcon, 
  MagnifyingGlassIcon, 
  ShieldCheckIcon, 
  ChatBubbleLeftRightIcon,
  UsersIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../stores/authStore'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Search', href: '/search', icon: MagnifyingGlassIcon },
  { name: 'Secret Scanner', href: '/secrets', icon: ShieldCheckIcon },
  { name: 'Channels', href: '/channels', icon: ChatBubbleLeftRightIcon },
  { name: 'Users', href: '/users', icon: UsersIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
]

export function Sidebar() {
  const { logout, currentUser } = useAuthStore()

  return (
    <div className="bg-white border-r border-gray-200 w-64 min-h-screen">
      <div className="p-6">
        <div className="flex items-center mb-8">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">SS</span>
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-semibold text-gray-900">Slack-Slurp</h1>
            <p className="text-xs text-gray-500">Reconnaissance Tool</p>
          </div>
        </div>

        <nav className="space-y-2">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </a>
          ))}
        </nav>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
        {currentUser && (
          <div className="mb-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-xs">
                  {currentUser.user?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{currentUser.user}</p>
                <p className="text-xs text-gray-500">{currentUser.team}</p>
              </div>
            </div>
          </div>
        )}
        
        <button
          onClick={logout}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-500 rounded-md hover:bg-gray-100 hover:text-red-600 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
          Sign Out
        </button>
      </div>
    </div>
  )
}