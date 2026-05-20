import React, { useState } from 'react'

/**
 * AdminPanel Component
 * Admin interface for menu management, reporting, and bill editing
 *
 * TODO: Implement:
 * - Menu management (add/edit/delete products)
 * - Sales reporting & analytics
 * - Bill history & editing
 * - Customer analytics
 */
export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white p-6 overflow-auto">
        <h2 className="text-2xl font-bold mb-6">Admin Panel</h2>

        <nav className="space-y-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full text-left px-4 py-2 rounded ${
              activeTab === 'dashboard' ? 'bg-red-600' : 'hover:bg-gray-700'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`w-full text-left px-4 py-2 rounded ${
              activeTab === 'menu' ? 'bg-red-600' : 'hover:bg-gray-700'
            }`}
          >
            Menu Management
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full text-left px-4 py-2 rounded ${
              activeTab === 'reports' ? 'bg-red-600' : 'hover:bg-gray-700'
            }`}
          >
            Reports
          </button>
          <button
            onClick={() => setActiveTab('bills')}
            className={`w-full text-left px-4 py-2 rounded ${
              activeTab === 'bills' ? 'bg-red-600' : 'hover:bg-gray-700'
            }`}
          >
            Bills
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`w-full text-left px-4 py-2 rounded ${
              activeTab === 'customers' ? 'bg-red-600' : 'hover:bg-gray-700'
            }`}
          >
            Customers
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {activeTab === 'dashboard' && (
            <div>
              <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
              <p className="text-gray-600">Welcome to the admin panel</p>
            </div>
          )}

          {activeTab === 'menu' && (
            <div>
              <h1 className="text-3xl font-bold mb-6">Menu Management</h1>
              <p className="text-gray-600">Manage products and menu items</p>
            </div>
          )}

          {activeTab === 'reports' && (
            <div>
              <h1 className="text-3xl font-bold mb-6">Reports</h1>
              <p className="text-gray-600">Sales and analytics reports</p>
            </div>
          )}

          {activeTab === 'bills' && (
            <div>
              <h1 className="text-3xl font-bold mb-6">Bills</h1>
              <p className="text-gray-600">View and manage bills</p>
            </div>
          )}

          {activeTab === 'customers' && (
            <div>
              <h1 className="text-3xl font-bold mb-6">Customers</h1>
              <p className="text-gray-600">Customer analytics and history</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
