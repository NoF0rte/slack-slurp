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
  const [arrowOffset, setArrowOffset] = useState(0)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showTooltip || !buttonRef.current || !tooltipRef.current) return

    const updatePosition = () => {
      if (!buttonRef.current || !tooltipRef.current) return

      const buttonRect = buttonRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      
      // Get viewport dimensions - clientWidth excludes scrollbar, innerWidth includes it
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth
      const viewportHeight = window.innerHeight
      const sidebarWidth = 256 // Approximate sidebar width
      const padding = 20
      
      // Get actual tooltip dimensions
      const tooltipWidth = tooltipRect.width || 320
      const tooltipHeight = tooltipRect.height || 150

      // Available width is viewport width minus padding
      const availableWidth = viewportWidth - padding * 2

      // Check if tooltip would overflow on the right
      const tooltipRightEdge = buttonRect.left + buttonRect.width / 2 + tooltipWidth / 2
      
      // Check if tooltip would overflow on top
      const topOverflow = buttonRect.top - tooltipHeight < padding
      // Check if tooltip would overflow on bottom
      const bottomOverflow = buttonRect.bottom + tooltipHeight > viewportHeight - padding

      // Calculate button center position
      const buttonCenterX = buttonRect.left + buttonRect.width / 2
      const buttonCenterY = buttonRect.top + buttonRect.height / 2
      
      // Determine initial position preference
      let preferredVerticalPos: 'top' | 'bottom' = topOverflow && !bottomOverflow ? 'bottom' : 'top'
      
      // Check if we can position above/below with arrow centered
      let left = buttonCenterX
      let top = preferredVerticalPos === 'top' 
        ? buttonRect.top - 10
        : buttonRect.bottom + 10
      
      let arrowOffsetX = 0
      let finalPosition: 'top' | 'bottom' | 'left' | 'right' = preferredVerticalPos
      
      const wouldOverflowRight = tooltipRightEdge > availableWidth
      
      // If tooltip would be shifted horizontally and arrow wouldn't point at button, use side positioning
      if (wouldOverflowRight) {
        let shiftNeeded = (availableWidth - tooltipWidth / 2) - buttonCenterX
        
        // If arrow would be more than 30% off center, use side positioning instead
        const maxArrowOffset = tooltipWidth * 0.3
        if (Math.abs(shiftNeeded) > maxArrowOffset) {
          // Use side positioning
          const spaceOnLeft = buttonRect.left - sidebarWidth - padding
          const spaceOnRight = availableWidth - buttonRect.right
          
          if (spaceOnRight >= tooltipWidth + 10) {
            // Position to the right
            finalPosition = 'right'
            left = buttonRect.right + 10
            top = buttonCenterY
            arrowOffsetX = 0
          } else if (spaceOnLeft >= tooltipWidth + 10) {
            // Position to the left
            finalPosition = 'left'
            left = buttonRect.left - tooltipWidth - 10
            top = buttonCenterY
            arrowOffsetX = 0
          } else {
            // Not enough space on either side, use top/bottom with adjusted arrow
            finalPosition = preferredVerticalPos
            left = buttonCenterX + shiftNeeded
            arrowOffsetX = -shiftNeeded
          }
        } else {
          // Small shift, keep top/bottom but adjust arrow
          left = buttonCenterX + shiftNeeded
          arrowOffsetX = -shiftNeeded
          finalPosition = preferredVerticalPos
        }
      } else {
        // No overflow, center perfectly
        left = buttonCenterX
        arrowOffsetX = 0
        finalPosition = preferredVerticalPos
      }
      
      setTooltipPosition(finalPosition)
      setArrowOffset(arrowOffsetX)
      
      // Apply position
      tooltipRef.current.style.left = `${left}px`
      tooltipRef.current.style.top = `${top}px`
      
      // Set transform based on position
      if (finalPosition === 'top') {
        tooltipRef.current.style.transform = `translate(-50%, -100%)`
      } else if (finalPosition === 'bottom') {
        tooltipRef.current.style.transform = `translate(-50%, 0)`
      } else if (finalPosition === 'left') {
        tooltipRef.current.style.transform = `translate(0, -50%)`
      } else if (finalPosition === 'right') {
        tooltipRef.current.style.transform = `translate(0, -50%)`
      }
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
        >
          <div className="text-center">
            <div className={`font-medium ${classes.tooltipTitle} mb-2`}>{detector.name}</div>
            <div className="text-gray-300 mb-3 leading-relaxed">{detector.description}</div>
            {detector.keywords && detector.keywords.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-medium text-gray-400 mb-2">Keywords:</div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {detector.keywords.slice(0, 10).map((keyword, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs"
                    >
                      {keyword}
                    </span>
                  ))}
                  {detector.keywords.length > 10 && (
                    <span className="px-2 py-1 text-gray-500 text-xs">
                      +{detector.keywords.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}
            {isCustom && 'keywords' in detector && 'patterns' in detector && (
              <div className="text-gray-400 text-xs mt-2">
                {detector.keywords.length} keywords, {detector.patterns.length} patterns
              </div>
            )}
          </div>
          {/* Arrow */}
          <div 
            className={`absolute border-4 border-transparent ${
              tooltipPosition === 'top' 
                ? 'top-full border-t-gray-900' 
                : tooltipPosition === 'bottom'
                ? 'bottom-full border-b-gray-900'
                : tooltipPosition === 'left'
                ? 'left-full border-l-gray-900'
                : 'right-full border-r-gray-900'
            }`}
            style={
              tooltipPosition === 'top' || tooltipPosition === 'bottom'
                ? {
                    left: `calc(50% + ${arrowOffset}px)`,
                    transform: 'translateX(-50%)',
                  }
                : {
                    top: `calc(50% + ${arrowOffset}px)`,
                    transform: 'translateY(-50%)',
                  }
            }
          ></div>
        </div>
      )}
    </div>
  )
}