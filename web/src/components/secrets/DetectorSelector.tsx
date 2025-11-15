import { DetectorInfo, CustomDetector } from '../../types/api'
import { useState, useRef, useEffect } from 'react'

interface DetectorSelectorProps {
  availableDetectors: DetectorInfo[]
  customDetectors: CustomDetector[]
  selectedDetectors: string[]
  onDetectorsChange: (detectors: string[]) => void
  isLoading: boolean
}

export function DetectorSelector({
  availableDetectors,
  customDetectors,
  selectedDetectors,
  onDetectorsChange,
  isLoading
}: DetectorSelectorProps) {
  const handleDetectorToggle = (detectorName: string) => {
    if (selectedDetectors.includes(detectorName)) {
      onDetectorsChange(selectedDetectors.filter(name => name !== detectorName))
    } else {
      onDetectorsChange([...selectedDetectors, detectorName])
    }
  }

  const handleSelectAll = () => {
    const allDetectorIds = [
      ...availableDetectors.map(d => d.name),
      ...customDetectors.map(d => d.name)
    ]
    onDetectorsChange(allDetectorIds)
  }

  const handleSelectNone = () => {
    onDetectorsChange([])
  }

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          <span className="ml-3 text-gray-400">Loading detectors...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Detectors</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSelectAll}
            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            All
          </button>
          <button
            onClick={handleSelectNone}
            className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
          >
            None
          </button>
        </div>
      </div>

      {/* Built-in Detectors */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Built-in Detectors</h4>
        <div className="flex flex-wrap gap-2">
          {availableDetectors.map((detector) => (
            <TooltipDetector
              key={detector.name}
              detector={detector}
              isSelected={selectedDetectors.includes(detector.name)}
              onToggle={() => handleDetectorToggle(detector.name)}
              color="blue"
            />
          ))}
        </div>
      </div>

      {/* Custom Detectors */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-300">Custom Detectors</h4>
        </div>

        {customDetectors.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <p className="text-sm">No custom detectors available</p>
            <p className="text-xs text-gray-500 mt-1">Create custom detectors in Settings</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {customDetectors.map((detector) => (
              <TooltipDetector
                key={detector.name}
                detector={detector}
                isSelected={selectedDetectors.includes(detector.name)}
                onToggle={() => handleDetectorToggle(detector.name)}
                color="green"
                isCustom={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selection Summary */}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <p className="text-sm text-gray-400">
          {selectedDetectors.length} detector{selectedDetectors.length !== 1 ? 's' : ''} selected
        </p>
      </div>
    </div>
  )
}

interface TooltipDetectorProps {
  detector: DetectorInfo | CustomDetector
  isSelected: boolean
  onToggle: () => void
  color: 'blue' | 'green'
  isCustom?: boolean
}

function TooltipDetector({ detector, isSelected, onToggle, color, isCustom = false }: TooltipDetectorProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top')
  const buttonRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showTooltip || !buttonRef.current || !tooltipRef.current) return

    const updatePosition = () => {
      if (!buttonRef.current || !tooltipRef.current) return

      const buttonRect = buttonRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const sidebarWidth = 256 // Approximate sidebar width
      const padding = 20

      // Get actual tooltip dimensions
      const tooltipWidth = tooltipRect.width || 320
      const tooltipHeight = tooltipRect.height || 150

      // Check if tooltip would overflow on the right
      const rightOverflow = buttonRect.left + tooltipWidth / 2 > viewportWidth - padding
      // Check if tooltip would overflow on the left (considering sidebar)
      const leftOverflow = buttonRect.left - tooltipWidth / 2 < sidebarWidth + padding
      // Check if tooltip would overflow on top
      const topOverflow = buttonRect.top - tooltipHeight < padding
      // Check if tooltip would overflow on bottom
      const bottomOverflow = buttonRect.bottom + tooltipHeight > viewportHeight - padding

      // Determine vertical position
      const verticalPos = topOverflow && !bottomOverflow ? 'bottom' : 'top'
      setTooltipPosition(verticalPos)

      // Calculate horizontal position - center on button
      let left = buttonRect.left + buttonRect.width / 2
      
      // If tooltip would be covered by sidebar, allow it to show over the sidebar
      // but still center on the button
      if (leftOverflow) {
        // Allow tooltip to extend into sidebar area, but ensure it's still centered on button
        // Only adjust if it would be completely hidden
        const tooltipLeftEdge = left - tooltipWidth / 2
        if (tooltipLeftEdge < 0) {
          // Tooltip would start before viewport, adjust to show over sidebar
          left = Math.max(left, tooltipWidth / 2 + padding)
        }
      }
      
      // Adjust if would overflow right edge
      if (rightOverflow) {
        const tooltipRightEdge = left + tooltipWidth / 2
        if (tooltipRightEdge > viewportWidth - padding) {
          left = viewportWidth - padding - tooltipWidth / 2
        }
      }

      // Apply position
      const top = verticalPos === 'top' 
        ? buttonRect.top - 10
        : buttonRect.bottom + 10
      
      tooltipRef.current.style.left = `${left}px`
      tooltipRef.current.style.top = `${top}px`
      tooltipRef.current.style.transform = verticalPos === 'top' 
        ? 'translate(-50%, -100%)' 
        : 'translate(-50%, 0)'
    }

    // Small delay to ensure tooltip is rendered and we can measure it
    const timeoutId = setTimeout(updatePosition, 10)
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [showTooltip])

  const colorClasses = {
    blue: {
      selected: 'bg-blue-600 text-white',
      unselected: 'bg-gray-700 text-gray-300 hover:bg-gray-600',
      tooltipTitle: 'text-blue-400'
    },
    green: {
      selected: 'bg-green-600 text-white',
      unselected: 'bg-gray-700 text-gray-300 hover:bg-gray-600',
      tooltipTitle: 'text-green-400'
    }
  }

  const classes = colorClasses[color]

  return (
    <div className="relative group">
      <button
        ref={buttonRef}
        onClick={onToggle}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
          isSelected ? classes.selected : classes.unselected
        }`}
      >
        {detector.name}
      </button>
      {/* Tooltip */}
      {showTooltip && (
        <div
          ref={tooltipRef}
          className="fixed px-4 py-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-[9999] w-80 max-w-[calc(100vw-2rem)] pointer-events-none"
          style={{
            transform: tooltipPosition === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
          }}
        >
          <div className="text-center">
            <div className={`font-medium ${classes.tooltipTitle} mb-2`}>{detector.name}</div>
            <div className="text-gray-300 mb-3 leading-relaxed">{detector.description}</div>
            {isCustom && 'keywords' in detector && (
              <div className="text-gray-400 text-xs">
                {detector.keywords.length} keywords, {detector.patterns.length} patterns
              </div>
            )}
          </div>
          {/* Arrow */}
          <div className={`absolute ${
            tooltipPosition === 'top' ? 'top-full' : 'bottom-full'
          } left-1/2 transform -translate-x-1/2 border-4 border-transparent ${
            tooltipPosition === 'top' ? 'border-t-gray-900' : 'border-b-gray-900'
          }`}></div>
        </div>
      )}
    </div>
  )
}