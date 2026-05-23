import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import store from './store'
import Login from '@/pages/Login'
import Home from '@/pages/Home'
import TellerScreen from '@/pages/TellerScreen'
import AdminPanel from '@/pages/AdminPanel'
import Sidebar from '@/components/Sidebar'
import { api } from '@/services/api'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Check if user is already logged in
    const validateToken = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        if (token) {
          const response = await api.validateToken()
          // Extract user from response - nested at response.data.user due to response wrapper
          setUser(response.data?.user || response.user || response)
          setIsAuthenticated(true)
        }
      } catch (error) {
        console.log('Token validation failed')
        localStorage.removeItem('auth_token')
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    validateToken()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="text-4xl font-bold text-red-600 mb-2">🍗</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/" />
              ) : (
                <Login
                  onLoginSuccess={async () => {
                    setIsAuthenticated(true)
                    // Validate token to get user info
                    try {
                      const response = await api.validateToken()
                      console.log('validateToken response:', response)
                      console.log('Setting user to:', response.data?.user || response.user || response)
                      setUser(response.data?.user || response.user || response)
                    } catch (error) {
                      console.error('Failed to get user info', error)
                    }
                  }}
                />
              )
            }
          />

          <Route
            path="/*"
            element={
              isAuthenticated ? (
                <div className="flex h-screen bg-gray-100">
                  <Sidebar
                    user={user}
                    onLogout={() => {
                      setIsAuthenticated(false)
                      localStorage.removeItem('auth_token')
                    }}
                  />
                  <div className="flex-1 overflow-auto">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/teller" element={<TellerScreen />} />
                      <Route path="/admin/*" element={<AdminPanel />} />
                    </Routes>
                  </div>
                </div>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </Router>
    </Provider>
  )
}

export default App
