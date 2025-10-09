import { useEffect, useState } from 'react'
import { Layout } from './components/layout/Layout'
import { AuthSetup } from './components/auth/AuthSetup'
import { Router } from './components/Router'
import { useAuthStore } from './stores/authStore'
import { ArrowPathIcon } from '@heroicons/react/24/outline'

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
      <div className="min-h-screen bg-slack-dark flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-400" />
          <span className="text-gray-400">Checking authentication...</span>
        </div>
      </div>
    )
  }

  if (showAuthSetup || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slack-dark flex items-center justify-center">
        <AuthSetup />
      </div>
    )
  }

  return (
    <Layout>
      <Router />
    </Layout>
  )
}

export default App