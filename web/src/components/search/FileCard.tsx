import React from 'react'
import { FileResult } from '../../types/api'
import { UserIcon, CalendarIcon, ChatBubbleLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

interface FileCardProps {
  file: FileResult
  highlightText?: (text: string, searchTerm?: string) => React.ReactNode
  searchTerm?: string
}

export function FileCard({ file, highlightText, searchTerm }: FileCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const getFileIcon = (filetype: string) => {
    const type = filetype.toLowerCase()
    if (type.includes('image')) return '🖼️'
    if (type.includes('video')) return '🎥'
    if (type.includes('audio')) return '🎵'
    if (type.includes('pdf')) return '📄'
    if (type.includes('word') || type.includes('doc')) return '📝'
    if (type.includes('excel') || type.includes('sheet')) return '📊'
    if (type.includes('powerpoint') || type.includes('presentation')) return '📽️'
    if (type.includes('zip') || type.includes('archive')) return '📦'
    return '📄'
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
            <span className="text-lg">{getFileIcon(file.filetype)}</span>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-white truncate">
              {highlightText ? highlightText(file.name, searchTerm) : file.name}
            </h3>
             {file.id && (
              <a
                href={`/api/download/${file.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-sm"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>Download</span>
              </a>
            )}
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-400 mb-2">
            <div className="flex items-center space-x-1">
              <UserIcon className="w-4 h-4" />
              <span>@{file.user}</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <CalendarIcon className="w-4 h-4" />
              <span>{formatDate(file.created)}</span>
            </div>
            
            <span className="text-gray-500">•</span>
            <span className="text-xs bg-gray-700 px-2 py-1 rounded">
              {file.filetype.toUpperCase()}
            </span>
          </div>
          
          {file.channels && file.channels.length > 0 && (
            <div className="flex items-center space-x-2">
              <ChatBubbleLeftIcon className="w-4 h-4 text-gray-400" />
              <div className="flex flex-wrap gap-1">
                {file.channels.map((channel, index) => (
                  <span
                    key={index}
                    className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded"
                  >
                    #{channel}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}