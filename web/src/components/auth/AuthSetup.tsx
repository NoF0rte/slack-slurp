import { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { Credentials } from '../../types/api'

export function AuthSetup() {
  const [credentials, setCredentials] = useState<Credentials>({
    api_token: '',
    d_cookie: '',
    ds_cookie: ''
  })
  
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
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      const result = await setupAuth(credentials)
      if (result.success) {
        setSuccess('Authentication setup completed successfully!')
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
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-purple-600 mb-2">Slack-Slurp</h1>
        <p className="text-gray-500">Connect your Slack workspace</p>
      </div>
      
      <form className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            API Token
          </label>
          <input
            type="password"
            value={credentials.api_token}
            onChange={(e) => setCredentials({
              ...credentials,
              api_token: e.target.value
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="xoxb-your-token-here or xoxc-your-token-here"
          />
          <p className="text-xs text-gray-500 mt-1">
            Use xoxb- for bot tokens or xoxc- for user tokens
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            D Cookie (Optional)
          </label>
          <input
            type="password"
            value={credentials.d_cookie}
            onChange={(e) => setCredentials({
              ...credentials,
              d_cookie: e.target.value
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="xoxd-your-cookie-here"
          />
          <p className="text-xs text-gray-500 mt-1">
            Required for user authentication, not needed for bot tokens
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            D-S Cookie (Optional)
          </label>
          <input
            type="password"
            value={credentials.ds_cookie}
            onChange={(e) => setCredentials({
              ...credentials,
              ds_cookie: e.target.value
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="d-s-cookie-value"
          />
          <p className="text-xs text-gray-500 mt-1">
            Additional cookie for enhanced authentication
          </p>
        </div>
        
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleTest}
            disabled={isLoading || !credentials.api_token.trim()}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Testing...' : 'Test Credentials'}
          </button>
          
          <button
            type="button"
            onClick={handleSetup}
            disabled={isLoading || !credentials.api_token.trim()}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-md font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Setting up...' : 'Setup Authentication'}
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}
      </form>
    </div>
  )
}