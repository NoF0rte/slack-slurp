import { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { Credentials } from '../../types/api'

export function AuthSetup() {
  const [credentials, setCredentials] = useState<Credentials>({
    apiToken: '',
    dCookie: '',
    dsCookie: ''
  })
  const [profileName, setProfileName] = useState('')
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const { testAuth, setupAuth } = useAuthStore()
  
  const handleTest = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      const result = await testAuth()
      if (result.success) {
        setSuccess('Credentials are valid! You can now use the dashboard.')
      } else {
        setError(result.error || 'Authentication failed')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleSetup = async () => {
    if (!profileName.trim()) {
      setError('Profile name is required')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      const result = await setupAuth(credentials, profileName)
      if (result.success) {
        setSuccess('Authentication setup completed successfully!')
        // Reload page to show main app
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        setError(result.error || 'Setup failed')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="max-w-md mx-auto bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-700">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Slack-Slurp</h1>
        <p className="text-gray-400">Connect your Slack workspace</p>
      </div>
      
      <form className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Profile Name *
          </label>
          <input
            type="text"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
            placeholder="My Workspace"
          />
          <p className="text-xs text-gray-400 mt-1">
            Give this profile a name to identify it
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            API Token
          </label>
          <input
            type="password"
            value={credentials.apiToken}
            onChange={(e) => setCredentials({
              ...credentials,
              apiToken: e.target.value
            })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
            placeholder="xoxb-your-token-here or xoxc-your-token-here"
          />
          <p className="text-xs text-gray-400 mt-1">
            Use xoxb- for bot tokens or xoxc- for user tokens
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            D Cookie (Optional)
          </label>
          <input
            type="password"
            value={credentials.dCookie}
            onChange={(e) => setCredentials({
              ...credentials,
              dCookie: e.target.value
            })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
            placeholder="xoxd-your-cookie-here"
          />
          <p className="text-xs text-gray-400 mt-1">
            Required for user authentication, not needed for bot tokens
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            D-S Cookie (Optional)
          </label>
          <input
            type="password"
            value={credentials.dsCookie}
            onChange={(e) => setCredentials({
              ...credentials,
              dsCookie: e.target.value
            })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
            placeholder="d-s-cookie-value"
          />
          <p className="text-xs text-gray-400 mt-1">
            Additional cookie for enhanced authentication
          </p>
        </div>
        
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleTest}
            disabled={isLoading || !credentials.apiToken.trim()}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isLoading ? 'Testing...' : 'Test Credentials'}
          </button>
          
          <button
            type="button"
            onClick={handleSetup}
            disabled={isLoading || !credentials.apiToken.trim() || !profileName.trim()}
            className="w-full px-4 py-2 bg-slack-purple text-white rounded-md font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isLoading ? 'Setting up...' : 'Setup Authentication'}
          </button>
        </div>
        
        {error && (
          <div className="bg-red-900 border border-red-700 rounded-md p-3">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-900 border border-green-700 rounded-md p-3">
            <p className="text-sm text-green-200">{success}</p>
          </div>
        )}
      </form>
    </div>
  )
}