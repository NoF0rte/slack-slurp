import { FileResult } from '../../types/api'
import { 
  UserIcon, 
  CalendarIcon, 
  ChatBubbleLeftIcon, 
  ArrowDownTrayIcon,
  DocumentTextIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  ArchiveBoxIcon,
  CodeBracketIcon,
  PresentationChartBarIcon,
  TableCellsIcon,
  DocumentIcon
} from '@heroicons/react/24/outline'
import Highlighter from 'react-highlight-words'

interface FileCardProps {
  file: FileResult
  searchTerm?: string
}

const getFileTypeInfo = (filetype: string) => {
    const ext = filetype.toLowerCase().replace('.', '')
    
    // Image files
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff', 'ico'].includes(ext)) {
      return {
        icon: PhotoIcon,
        color: 'text-green-400',
        bgColor: 'bg-green-900/20',
        label: 'Image'
      }
    }
    
    // Video files
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v', '3gp'].includes(ext)) {
      return {
        icon: VideoCameraIcon,
        color: 'text-purple-400',
        bgColor: 'bg-purple-900/20',
        label: 'Video'
      }
    }
    
    // Audio files
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus'].includes(ext)) {
      return {
        icon: MusicalNoteIcon,
        color: 'text-pink-400',
        bgColor: 'bg-pink-900/20',
        label: 'Audio'
      }
    }
    
    // PDF files
    if (ext === 'pdf') {
      return {
        icon: DocumentTextIcon,
        color: 'text-red-400',
        bgColor: 'bg-red-900/20',
        label: 'PDF'
      }
    }
    
    // Microsoft Word documents
    if (['doc', 'docx', 'rtf'].includes(ext)) {
      return {
        icon: DocumentIcon,
        color: 'text-blue-400',
        bgColor: 'bg-blue-900/20',
        label: 'Word'
      }
    }
    
    // Microsoft Excel spreadsheets
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return {
        icon: TableCellsIcon,
        color: 'text-green-400',
        bgColor: 'bg-green-900/20',
        label: 'Spreadsheet'
      }
    }
    
    // Microsoft PowerPoint presentations
    if (['ppt', 'pptx'].includes(ext)) {
      return {
        icon: PresentationChartBarIcon,
        color: 'text-orange-400',
        bgColor: 'bg-orange-900/20',
        label: 'Presentation'
      }
    }
    
    // Archive files
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
      return {
        icon: ArchiveBoxIcon,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-900/20',
        label: 'Archive'
      }
    }
    
    // Code files
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'html', 'css', 'scss', 'sass', 'less', 'xml', 'json', 'yaml', 'yml', 'toml', 'ini', 'conf', 'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd'].includes(ext)) {
      return {
        icon: CodeBracketIcon,
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-900/20',
        label: 'Code'
      }
    }
    
    // Text files
    if (['txt', 'md', 'markdown', 'log', 'readme'].includes(ext)) {
      return {
        icon: DocumentTextIcon,
        color: 'text-gray-400',
        bgColor: 'bg-gray-900/20',
        label: 'Text'
      }
    }
    
    // Default fallback
    return {
      icon: DocumentIcon,
      color: 'text-gray-400',
      bgColor: 'bg-gray-900/20',
      label: ext.toUpperCase()
    }
  }

export function FileCard({ file, searchTerm }: FileCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const fileTypeInfo = getFileTypeInfo(file.filetype)
  const IconComponent = fileTypeInfo.icon

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className={`w-10 h-10 ${fileTypeInfo.bgColor} rounded-lg flex items-center justify-center`}>
            <IconComponent className={`w-6 h-6 ${fileTypeInfo.color}`} />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-white truncate">
              {searchTerm ? (
                <Highlighter
                  searchWords={[searchTerm]}
                  textToHighlight={file.name}
                  highlightClassName="bg-yellow-200 text-yellow-900 px-1 rounded\"
                  autoEscape={true}
                />
              ) : (
                file.name
              )}
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
            <span className="text-xs text-gray-400">
              {formatFileSize(file.size)}
            </span>
            
            <span className="text-gray-500">•</span>
            <span className={`text-xs px-2 py-1 rounded ${fileTypeInfo.bgColor} ${fileTypeInfo.color}`}>
              {fileTypeInfo.label}
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