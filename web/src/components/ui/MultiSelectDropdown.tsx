import { useState, useRef, useEffect } from 'react'
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface Option {
  id: string
  label: string
  subtitle?: string
}

interface MultiSelectDropdownProps {
  options: Option[]
  selectedIds: string[]
  onSelectionChange: (selectedIds: string[]) => void
  placeholder: string
  disabled?: boolean
  className?: string
}

export function MultiSelectDropdown({
  options,
  selectedIds,
  onSelectionChange,
  placeholder,
  disabled = false,
  className = ''
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const filteredOptions = options.filter(option => {
    const query = searchQuery.toLowerCase()
    return (
      option.label?.toLowerCase().includes(query) ||
      (option.subtitle && option.subtitle.toLowerCase().includes(query))
    )
  })

  const selectedOptions = options.filter(option => selectedIds.includes(option.id))

  const handleOptionClick = (optionId: string) => {
    if (selectedIds.includes(optionId)) {
      onSelectionChange(selectedIds.filter(id => id !== optionId))
    } else {
      onSelectionChange([...selectedIds, optionId])
    }
    setSearchQuery('')
  }

  const removeSelection = (optionId: string) => {
    onSelectionChange(selectedIds.filter(id => id !== optionId))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSearchQuery('')
    }
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selected Pills */}
      <div 
        className="min-h-[42px] w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 cursor-pointer"
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1 items-center">
          {selectedOptions.map(option => (
            <span
              key={option.id}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-600 text-white"
            >
              {option.label}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeSelection(option.id)
                }}
                disabled={disabled}
                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
          {selectedOptions.length === 0 && (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          )}
        </div>
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-600">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search..."
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600 text-white rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
            />
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">
                {searchQuery ? 'No options found' : 'No options available'}
              </div>
            ) : (
              filteredOptions.map(option => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleOptionClick(option.id)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-600 transition-colors ${
                    selectedIds.includes(option.id) ? 'bg-blue-600 text-white' : 'text-gray-300'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  {option.subtitle && (
                    <div className="text-xs opacity-75">{option.subtitle}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}