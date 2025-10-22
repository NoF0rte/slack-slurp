import { SecretResult } from '../../types/api'
import { 
  UserIcon,
  CalendarIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline'

interface SecretResultCardProps {
  result: SecretResult
}

export function SecretResultCard({ result }: SecretResultCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div>
            <h3 className="text-sm font-medium text-white">{result.detector}</h3>
            <div className="flex items-center space-x-2 mt-1">
              {result.verified ? (
                <span className="text-xs px-2 py-1 rounded bg-green-900/20 text-green-400">
                  VERIFIED
                </span>
              ) : (
                <span className="text-xs px-2 py-1 rounded bg-yellow-900/20 text-yellow-400">
                  UNVERIFIED
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Secret Value */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-400 mb-1">
          Secret Value
        </label>
        <div className="bg-gray-900 rounded-md p-2 font-mono text-sm text-gray-300 break-all">
          {result.secret}
        </div>
      </div>

      {/* Context */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-400 mb-1">
          Context
        </label>
        <div className="bg-gray-900 rounded-md p-2 text-sm text-gray-300 whitespace-pre-wrap break-words">
          {result.context}
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center space-x-4 text-xs text-gray-400">
        <div className="flex items-center space-x-1">
          <UserIcon className="w-3 h-3" />
          <span>@{result.user}</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <CalendarIcon className="w-3 h-3" />
          <span>{formatDate(result.timestamp)}</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <ChatBubbleLeftIcon className="w-3 h-3" />
          <span>#{result.channel}</span>
        </div>
      </div>
    </div>
  )
}