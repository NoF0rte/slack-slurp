import { useState, useRef, useEffect } from 'react'
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

interface DetectorFilterProps {
  availableDetectors: string[]
  selectedDetectors: string[]
  onDetectorsChange: (detectors: string[]) => void
  placeholder?: string
}

export function DetectorFilter({
  availableDetectors,
  selectedDetectors,
  onDetectorsChange,
  placeholder = "Filter by detectors..."
}: DetectorFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const filteredDetectors = availableDetectors.filter(detector =>
    detector.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedDetectors.includes(detector)
  )

  const handleDetectorSelect = (detector: string) => {
    onDetectorsChange([...selectedDetectors, detector])
    setSearchQuery('')
  }

  const handleDetectorRemove = (detector: string) => {
    onDetectorsChange(selectedDetectors.filter(d => d !== detector))
  }

  const handleClearAll = () => {
    onDetectorsChange([])
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Detectors Display */}
      <div
        className="min-h-[40px] w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md cursor-pointer hover:border-gray-500 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-2 items-center">
          {selectedDetectors.length === 0 ? (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          ) : (
            selectedDetectors.map((detector) => (
              <span
                key={detector}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded-full"
              >
                {detector}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDetectorRemove(detector)
                  }}
                  className="hover:bg-blue-700 rounded-full p-0.5"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
          <div className="ml-auto">
            <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-700">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search detectors..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Clear All Button */}
          {selectedDetectors.length > 0 && (
            <div className="p-2 border-b border-gray-700">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleClearAll()
                }}
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 rounded-md transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Detector Options */}
          <div className="py-1">
            {filteredDetectors.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">
                {searchQuery ? 'No detectors found' : 'All detectors selected'}
              </div>
            ) : (
              filteredDetectors.map((detector) => (
                <button
                  key={detector}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDetectorSelect(detector)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  {detector}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
