import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import store from './store'

// Pages
import TellerScreen from './pages/TellerScreen'
import AdminPanel from './pages/AdminPanel'
import LoginPage from './pages/LoginPage'

// Components
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Main POS routes */}
          <Route path="/teller" element={<TellerScreen />} />

          {/* Admin routes (protected) */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          {/* Default redirect to teller */}
          <Route path="/" element={<Navigate to="/teller" replace />} />
          <Route path="*" element={<Navigate to="/teller" replace />} />
        </Routes>
      </Router>
    </Provider>
  )
}

export default App
