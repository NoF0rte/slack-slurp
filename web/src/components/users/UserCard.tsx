import { User } from '../../types/api'
import { 
  UserIcon,
  EnvelopeIcon,
  BriefcaseIcon,
  ShieldCheckIcon,
  StarIcon,
  ExclamationTriangleIcon,
  PhoneIcon
} from '@heroicons/react/24/outline'

interface UserCardProps {
  user: User
}

export function UserCard({ user }: UserCardProps) {
  const getDisplayName = () => {
    return user.real_name || user.name || 'Unknown User'
  }
  
  const getProfilePicture = () => {
    const imageUrl = user.image
    
    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          alt={getDisplayName()}
          className="w-12 h-12 rounded-full object-cover"
          onError={(e) => {
            // Fallback to default icon if image fails to load
            e.currentTarget.style.display = 'none'
            e.currentTarget.nextElementSibling?.classList.remove('hidden')
          }}
        />
      )
    }
    
    return (
      <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
        <UserIcon className="w-6 h-6 text-gray-300" />
      </div>
    )
  }
  
  const getUserStatus = () => {
    if (user.deleted) return { text: 'Deleted', color: 'bg-red-900 text-red-200' }
    if (user.is_bot) return { text: 'Bot', color: 'bg-blue-900 text-blue-200' }
    if (user.is_admin) return { text: 'Admin', color: 'bg-purple-900 text-purple-200' }
    if (user.is_owner) return { text: 'Owner', color: 'bg-yellow-900 text-yellow-200' }
    // if (user.is_primary_owner) return { text: 'Primary Owner', color: 'bg-orange-100 text-orange-800' }
    return { text: 'Member', color: 'bg-green-900 text-green-200' }
  }
  
  const getStatusIcon = () => {
    if (user.deleted) return <ExclamationTriangleIcon className="w-4 h-4" />
    if (user.is_bot) return <ShieldCheckIcon className="w-4 h-4" />
    if (user.is_owner) return <StarIcon className="w-4 h-4" />
    return null
  }
  
  const status = getUserStatus()
  
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:shadow-md hover:bg-gray-750 transition-all">
      <div className="flex items-start space-x-3">
        {/* Profile Picture */}
        <div className="relative">
          {getProfilePicture()}
          {/* Fallback icon (hidden by default) */}
          <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center hidden">
            <UserIcon className="w-6 h-6 text-gray-300" />
          </div>
        </div>
        
        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-white truncate">
              {getDisplayName()}
            </h3>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
              {getStatusIcon()}
              <span className="ml-1">{status.text}</span>
            </span>
          </div>
          
          <p className="text-sm text-gray-400 truncate">
            @{user.name}
          </p>
          
          {/* Title */}
          {user.title && (
            <div className="mt-2 flex items-center">
              <BriefcaseIcon className="w-4 h-4 text-gray-500 mr-1" />
              <p className="text-sm text-gray-300 truncate">
                {user.title}
              </p>
            </div>
          )}
          
          {/* Email */}
          {user.email && (
            <div className="mt-1 flex items-center">
              <EnvelopeIcon className="w-4 h-4 text-gray-500 mr-1" />
              <p className="text-sm text-gray-300 truncate">
                {user.email}
              </p>
            </div>
          )}

          {/* Phone */}
          {user.phone && (
            <div className="mt-1 flex items-center">
              <PhoneIcon className="w-4 h-4 text-gray-500 mr-1" />
              <p className="text-sm text-gray-300 truncate">
                {user.phone}
              </p>
            </div>
          )}
          
          {/* Status Text */}
          {/* {user.profile?.status_text && (
            <div className="mt-2">
              <p className="text-sm text-gray-500 italic">
                "{user.profile.status_text}"
              </p>
            </div>
          )} */}
        </div>
      </div>
    </div>
  )
}