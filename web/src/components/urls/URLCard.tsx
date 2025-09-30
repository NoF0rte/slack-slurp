import { LinkIcon } from '@heroicons/react/24/outline'

interface URLCardProps {
  result: string
}

export function URLCard({ result }: URLCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:shadow-md hover:bg-gray-750 transition-all">
      <div className="space-y-3">
        {/* URL */}
        <div className="flex items-start space-x-3">
          <LinkIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <a 
              href={result} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-medium text-sm break-all cursor-pointer"
            >
              {result}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}