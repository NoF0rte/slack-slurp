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

    if (channel.is_mpim) {
      return <UserGroupIcon className="w-5 h-5 text-blue-500" />
    }
    
    if (channel.is_private) {
      return <LockClosedIcon className="w-5 h-5 text-red-500" />
    }
    
    if (channel.is_im) {
      return <ChatBubbleLeftRightIcon className="w-5 h-5 text-green-500" />
    }
    
    return <HashtagIcon className="w-5 h-5 text-gray-500" />
  }
  
  const getChannelType = () => {
    if (channel.is_archived) return 'Archived'
    if (channel.is_mpim) return 'Group Message'
    if (channel.is_private) return 'Private Channel'
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
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:shadow-md hover:bg-gray-750 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          {getChannelIcon()}
          <div>
            <h3 className="font-medium text-white">
              {channel.name || 'Unnamed Channel'}
            </h3>
            <p className="text-sm text-gray-400">{getChannelType()}</p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sm text-gray-400">
            {getMemberCount()} member{getMemberCount() !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-gray-500">
            Created {formatDate(channel.created)}
          </p>
          <p className="text-xs text-gray-500">
            Latest {channel.latest != 0 ? formatDate(channel.latest) : "None"}
          </p>
        </div>
      </div>
      
      {channel.topic && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-sm text-gray-300 line-clamp-2">
            {channel.topic}
          </p>
        </div>
      )}
      
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>ID: {channel.id}</span>
        {channel.is_general && (
          <span className="bg-blue-900 text-blue-200 px-2 py-1 rounded-full">
            General
          </span>
        )}
      </div>
    </div>
  )
}