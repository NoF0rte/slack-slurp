import { useEffect, useState } from 'react'
import { Layout } from './components/layout/Layout'
import { AuthSetup } from './components/auth/AuthSetup'
import { Router } from './components/Router'
import { useAuthStore } from './stores/authStore'
import { useProfileStore } from './stores/profileStore'
import { ArrowPathIcon } from '@heroicons/react/24/outline'

function App() {
  const { isAuthenticated, testAuth } = useAuthStore()
  const { getProfilesCount } = useProfileStore()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [showAuthSetup, setShowAuthSetup] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      // First check if there are any profiles
      const profileCount = await getProfilesCount()
      
      // If no profiles exist, show auth setup
      if (profileCount === 0) {
        setShowAuthSetup(true)
        setIsCheckingAuth(false)
        return
      }

      // If profiles exist, check authentication
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
  }, [isAuthenticated, testAuth, getProfilesCount])

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