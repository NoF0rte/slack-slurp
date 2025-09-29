import { DomainResult } from '../../types/api'
import { GlobeAltIcon } from '@heroicons/react/24/outline'

interface DomainCardProps {
  result: DomainResult
}

export function DomainCard({ result }: DomainCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:shadow-md hover:bg-gray-750 transition-all">
      <div className="flex items-center space-x-3">
        <GlobeAltIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-medium text-white text-lg">
            {result.domain}
          </h3>
        </div>
      </div>
    </div>
  )
}