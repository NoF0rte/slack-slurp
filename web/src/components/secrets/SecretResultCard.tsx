import { SecretResult } from '../../types/api'
import { 
  UserIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'
import Highlighter from 'react-highlight-words'

interface SecretResultCardProps {
  result: SecretResult
  onToggleFalsePositive: () => void
}

export function SecretResultCard({ result, onToggleFalsePositive }: SecretResultCardProps) {
  const [isContextExpanded, setIsContextExpanded] = useState(true)
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  // Extract secrets for highlighting
  const secretsToHighlight = result.secrets.map(s => s.raw).filter(secret => secret && secret.trim() !== '')
  

  // Function to parse and render message with proper code blocks
  const renderMessage = (text: string) => {
    // Split by triple backticks for code blocks
    const parts = text.split(/```([^`]*)```/g)
    
    return parts.map((part, index) => {
      // Odd indices are code blocks
      if (index % 2 === 1) {
        return (
          <pre key={index} className="bg-gray-900 text-gray-300 p-3 rounded-md overflow-x-auto my-2">
            <code>
              <Highlighter
                searchWords={secretsToHighlight}
                textToHighlight={part}
                highlightClassName="bg-yellow-200 text-yellow-900 px-1 rounded"
                autoEscape={true}
              />
            </code>
          </pre>
        )
      }
      
      // Even indices are regular text - split by single backticks for inline code
      const inlineParts = part.split(/`([^`]*)`/g)
      
      return (
        <span key={index}>
          {inlineParts.map((inlinePart, inlineIndex) => {
            // Odd indices are inline code
            if (inlineIndex % 2 === 1) {
              return (
                <code key={inlineIndex} className="bg-gray-700 text-gray-300 px-1 rounded text-sm">
                  {inlinePart}
                </code>
              )
            }
            
            // Even indices are regular text - highlight secrets
            return (
              <Highlighter
                key={inlineIndex}
                searchWords={secretsToHighlight}
                textToHighlight={inlinePart}
                highlightClassName="bg-yellow-200 text-yellow-900 px-1 rounded"
                autoEscape={true}
              />
            )
          })}
        </span>
      )
    })
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
              {result.falsePositive && (
                <span className="text-xs px-2 py-1 rounded bg-red-900/20 text-red-400">
                  FALSE POSITIVE
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => onToggleFalsePositive()}
          className={`flex items-center space-x-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            result.falsePositive
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
          title={result.falsePositive ? 'Mark as valid' : 'Mark as false positive'}
        >
          {result.falsePositive ? (
            <>
              <CheckIcon className="w-3 h-3" />
              <span>Valid</span>
            </>
          ) : (
            <>
              <XMarkIcon className="w-3 h-3" />
              <span>False Positive</span>
            </>
          )}
        </button>
      </div>

      {/* Secrets List */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-400 mb-2">
          Detected Secrets
        </label>
        <div className="space-y-2">
          {result.secrets.map((secret, index) => (
            <div key={index} className="bg-gray-700 rounded-md p-3">
              <div className="font-mono text-sm text-gray-300 break-all">
                {secret.raw}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Context - Collapsible */}
      <div className="mb-3">
        <button
          onClick={() => setIsContextExpanded(!isContextExpanded)}
          className="flex items-center space-x-2 text-xs font-medium text-gray-400 hover:text-gray-300 transition-colors mb-2"
        >
          {isContextExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
          <span>Context</span>
        </button>
        
        {isContextExpanded && (
          <div className="bg-gray-900 rounded-md p-3 text-sm text-gray-300 whitespace-pre-wrap break-words">
            {renderMessage(result.context)}
          </div>
        )}
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