/**
 * Utility functions for exporting data to JSON files
 */

export interface ExportOptions {
  filename: string
  data: any
  timestamp: number
}

/**
 * Downloads data as a JSON file
 */
export function downloadJSON(options: ExportOptions): void {
  const { filename, data, timestamp } = options
  
  // Create the export data with metadata
  const exportData = {
    export_info: {
      timestamp,
      exported_at: new Date(timestamp * 1000).toISOString(),
      count: data.length
    },
    data
  }
  
  // Convert to JSON string with pretty formatting
  const jsonString = JSON.stringify(exportData, null, 2)
  
  // Create blob and download
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  // Create download link
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  
  // Trigger download
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // Clean up
  URL.revokeObjectURL(url)
}

/**
 * Generates filename with timestamp
 */
export function generateFilename(type: string, timestamp: number): string {
  return `slurp-${type}-${timestamp}.json`
}

/**
 * Gets current epoch timestamp
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000)
}