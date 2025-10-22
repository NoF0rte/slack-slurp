import { DetectorInfo, CustomDetector } from '../../types/api'

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
            <div
              key={detector.name}
              className="relative group"
            >
              <button
                onClick={() => handleDetectorToggle(detector.name)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedDetectors.includes(detector.name)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {detector.name}
              </button>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 w-80">
                <div className="text-center">
                  <div className="font-medium text-blue-400 mb-2">{detector.name}</div>
                  <div className="text-gray-300 leading-relaxed">{detector.description}</div>
                </div>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
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
              <div
                key={detector.name}
                className="flex items-center space-x-2"
              >
                <div className="relative group">
                  <button
                    onClick={() => handleDetectorToggle(detector.name)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedDetectors.includes(detector.name)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {detector.name}
                  </button>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 w-80">
                    <div className="text-center">
                      <div className="font-medium text-green-400 mb-2">{detector.name}</div>
                      <div className="text-gray-300 mb-3 leading-relaxed">{detector.description}</div>
                      <div className="text-gray-400 text-xs">
                        {detector.keywords.length} keywords, {detector.patterns.length} patterns
                      </div>
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
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