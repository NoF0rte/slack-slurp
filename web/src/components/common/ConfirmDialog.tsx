interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  onDecline?: () => void
  onCancel?: () => void
  title: string
  message: string
  confirmText?: string
  declineText?: string
  cancelText?: string
  confirmButtonColor?: 'blue' | 'red' | 'green'
  declineButtonColor?: 'blue' | 'red' | 'green' | 'gray'
  showCancelButton?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  onDecline,
  onCancel,
  title,
  message,
  confirmText = 'Confirm',
  declineText = 'Decline',
  cancelText = 'Cancel',
  confirmButtonColor = 'blue',
  declineButtonColor = 'gray',
  showCancelButton = true
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const getConfirmButtonClass = () => {
    switch (confirmButtonColor) {
      case 'red':
        return 'bg-red-600 hover:bg-red-700 text-white'
      case 'green':
        return 'bg-green-600 hover:bg-green-700 text-white'
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  }

  const getDeclineButtonClass = () => {
    switch (declineButtonColor) {
      case 'red':
        return 'bg-red-600 hover:bg-red-700 text-white'
      case 'green':
        return 'bg-green-600 hover:bg-green-700 text-white'
      case 'blue':
        return 'bg-blue-600 hover:bg-blue-700 text-white'
      default:
        return 'bg-gray-600 hover:bg-gray-500 text-white'
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-30 transition-opacity" onClick={onClose} />
      
      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-gray-800 rounded-lg border border-gray-700 shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          
          {/* Body */}
          <div className="px-6 py-4">
            <p className="text-gray-300">{message}</p>
          </div>
          
          {/* Footer */}
          <div className="px-6 py-4 bg-gray-700 rounded-b-lg flex justify-end space-x-3">
            {showCancelButton && (
              <button
                onClick={() => {
                  if (onCancel) {
                    onCancel()
                  }
                  onClose()
                }}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors"
              >
                {cancelText}
              </button>
            )}
            {onDecline && (
              <button
                onClick={() => {
                  onDecline()
                  onClose()
                }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${getDeclineButtonClass()}`}
              >
                {declineText}
              </button>
            )}
            <button
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${getConfirmButtonClass()}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}