import { Channel } from '../../types/api'
import { 
  HashtagIcon, 
  ChatBubbleLeftRightIcon, 
  UserGroupIcon,
  LockClosedIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline'

interface ChannelCardProps {
  channel: Channel
}

export function ChannelCard({ channel }: ChannelCardProps) {
  const getChannelIcon = () => {
    if (channel.is_archived) {
      return <ArchiveBoxIcon className="w-5 h-5 text-gray-400" />
    }
    
    if (channel.is_private) {
      return <LockClosedIcon className="w-5 h-5 text-red-500" />
    }
    
    if (channel.is_group) {
      return <UserGroupIcon className="w-5 h-5 text-blue-500" />
    }
    
    if (channel.is_im) {
      return <ChatBubbleLeftRightIcon className="w-5 h-5 text-green-500" />
    }
    
    return <HashtagIcon className="w-5 h-5 text-gray-500" />
  }
  
  const getChannelType = () => {
    if (channel.is_archived) return 'Archived'
    if (channel.is_private) return 'Private Channel'
    if (channel.is_group) return 'Group Message'
    if (channel.is_im) return 'Direct Message'
    return 'Public Channel'
  }
  
  const getMemberCount = () => {
    return channel.num_members
  }
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          {getChannelIcon()}
          <div>
            <h3 className="font-medium text-gray-900">
              {channel.name || 'Unnamed Channel'}
            </h3>
            <p className="text-sm text-gray-500">{getChannelType()}</p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sm text-gray-500">
            {getMemberCount()} member{getMemberCount() !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-gray-400">
            Created {formatDate(channel.created)}
          </p>
        </div>
      </div>
      
      {channel.topic && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-sm text-gray-600 line-clamp-2">
            {channel.topic}
          </p>
        </div>
      )}
      
      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <span>ID: {channel.id}</span>
        {channel.is_general && (
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            General
          </span>
        )}
      </div>
    </div>
  )
}