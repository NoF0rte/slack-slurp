import { useState, useEffect, useRef } from 'react'
import { 
  HomeIcon, 
  MagnifyingGlassIcon, 
  ShieldCheckIcon, 
  ChatBubbleLeftRightIcon,
  UsersIcon,
  GlobeAltIcon,
  LinkIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../stores/authStore'
import { useProfileStore } from '../../stores/profileStore'

const navigation = [
  { name: 'Dashboard', href: '#dashboard', icon: HomeIcon },
  { name: 'Channels', href: '#channels', icon: ChatBubbleLeftRightIcon },
  { name: 'Users', href: '#users', icon: UsersIcon },
  { name: 'Domains', href: '#domains', icon: GlobeAltIcon },
  { name: 'URLs', href: '#urls', icon: LinkIcon },
  { name: 'Search', href: '#search', icon: MagnifyingGlassIcon },
  { name: 'Secret Scanner', href: '#secrets', icon: ShieldCheckIcon },
  { name: 'Settings', href: '#settings', icon: Cog6ToothIcon },
]

export function Sidebar() {
  const { currentUser } = useAuthStore()
  const { profiles, loadProfiles, selectProfile } = useProfileStore()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadProfiles()
  }, [loadProfiles])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
    }

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProfileMenu])

  const handleSelectProfile = async (profileId: number) => {
    await selectProfile(profileId)
    setShowProfileMenu(false)
    // Reload page to refresh with new credentials
    window.location.reload()
  }

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
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-full flex items-center justify-between p-3 rounded-md hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <div className="flex items-center flex-1 min-w-0">
                <div className="w-8 h-8 bg-slack-blue rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-medium text-xs">
                    {currentUser.user?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{currentUser.user}</p>
                  <p className="text-xs text-gray-300 truncate">{currentUser.team}</p>
                </div>
              </div>
              <ChevronDownIcon className={`w-4 h-4 ml-2 text-gray-400 flex-shrink-0 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
            </button>

            {showProfileMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                {profiles.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-gray-400">
                    No profiles available
                  </div>
                ) : (
                  profiles.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => handleSelectProfile(profile.id)}
                      className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                      <span className="truncate">{profile.name}</span>
                      {profile.isSelected && (
                        <CheckIcon className="w-4 h-4 text-blue-400 ml-2 flex-shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}