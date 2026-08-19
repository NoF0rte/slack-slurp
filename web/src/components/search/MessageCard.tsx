import { MessageResult } from '../../types/api'
import { UserIcon, CalendarIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline'
import Highlighter from 'react-highlight-words'

interface MessageCardProps {
  message: MessageResult
  searchTerm?: string
}

export function MessageCard({ message, searchTerm }: MessageCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-gray-600 transition-colors w-full max-w-full">
      <div className="flex items-start space-x-3 w-full">
        <div className="flex-shrink-0">
          <UserIcon className="w-6 h-6 text-gray-400" />
        </div>
        
        <div className="flex-1 min-w-0 w-full overflow-hidden">
          <div className="flex items-center space-x-2 mb-2 flex-wrap">
            <span className="text-sm font-medium text-white">
              @{message.user}
            </span>
            <span className="text-gray-400">•</span>
            <div className="flex items-center space-x-1 text-gray-400">
              <ChatBubbleLeftIcon className="w-4 h-4" />
              <span className="text-sm">#{message.channel}</span>
            </div>
            <span className="text-gray-400">•</span>
            <div className="flex items-center space-x-1 text-gray-400">
              <CalendarIcon className="w-4 h-4" />
              <span className="text-sm">{formatDate(message.date)}</span>
            </div>
          </div>
          
          <div className="text-gray-300 whitespace-pre-wrap break-words overflow-wrap-anywhere hyphens-auto w-full">
            {searchTerm ? (
              <Highlighter
                searchWords={[searchTerm]}
                textToHighlight={message.text}
                highlightClassName="bg-yellow-200 text-yellow-900 px-1 rounded\"
                autoEscape={true}
              />
            ) : (
              message.text
            )}
          </div>
        </div>
      </div>
    </div>
  )
}