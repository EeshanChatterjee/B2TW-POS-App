import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@/hooks/useStore'
import { loginSuccess, loginError } from '@/store/slices/authSlice'
import { api } from '@/services/api'

/**
 * LoginPage Component
 * Admin login interface
 *
 * Default credentials for testing:
 * Username: admin
 * Password: admin123
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!username || !password) {
      setError('Username and password are required')
      setLoading(false)
      return
    }

    try {
      const response = await api.login(username, password)

      if (response && response.token && response.user) {
        dispatch(loginSuccess({
          username: response.user.username,
          role: response.user.role,
          token: response.token
        }))
        navigate('/admin')
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (err: any) {
      const message = err.response?.data?.error || (err instanceof Error ? err.message : 'Login failed')
      setError(message)
      dispatch(loginError(message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-lg shadow-lg p-8 w-96">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-red-600">Bao to the Wings</h1>
          <p className="text-gray-600 mt-2">Admin Login</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded text-sm text-gray-600">
          <p className="font-bold mb-2">Test Credentials:</p>
          <p>Username: <code className="bg-white px-2 py-1">admin</code></p>
          <p>Password: <code className="bg-white px-2 py-1">admin123</code></p>
        </div>
      </div>
    </div>
  )
}
