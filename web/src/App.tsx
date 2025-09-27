import { useEffect, useState } from 'react'
import { Layout } from './components/layout/Layout'
import { AuthSetup } from './components/auth/AuthSetup'
import { useAuthStore } from './stores/authStore'

function App() {
  const { isAuthenticated, testAuth } = useAuthStore()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [showAuthSetup, setShowAuthSetup] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated) {
        const result = await testAuth()
        if (!result.success) {
          setShowAuthSetup(true)
        } else {
          setShowAuthSetup(false)
        }
      } else {
        setShowAuthSetup(false)
      }
      setIsCheckingAuth(false)
    }

    checkAuth()
  }, [isAuthenticated, testAuth])

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (showAuthSetup || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <AuthSetup />
      </div>
    )
  }

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          🚀 Slack-Slurp Dashboard
        </h1>
        <p className="text-gray-500">
          Welcome to the Slack reconnaissance and secret detection dashboard.
        </p>
      </div>
    </Layout>
  )
}

export default App