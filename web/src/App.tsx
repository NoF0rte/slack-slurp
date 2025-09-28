import { useEffect, useState } from 'react'
import { Layout } from './components/layout/Layout'
import { AuthSetup } from './components/auth/AuthSetup'
import { Router } from './components/Router'
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
      <div className="min-h-screen bg-slack-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-300">Checking authentication...</p>
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