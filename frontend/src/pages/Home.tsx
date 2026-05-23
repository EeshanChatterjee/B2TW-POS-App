import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardOverview from '@/components/DashboardOverview'
import { ShoppingCart, BarChart3, Settings, Users } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load dashboard data
    const loadDashboard = async () => {
      try {
        setLoading(false)
      } catch (error) {
        console.error('Failed to load dashboard:', error)
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const quickActions = [
    {
      title: 'Teller Screen',
      description: 'Take orders and manage bills',
      icon: ShoppingCart,
      onClick: () => navigate('/teller'),
      color: 'bg-blue-600',
      role: 'any'
    },
    {
      title: 'Admin Panel',
      description: 'Manage reports, inventory & settings',
      icon: BarChart3,
      onClick: () => navigate('/admin'),
      color: 'bg-purple-600',
      role: 'admin'
    },
    {
      title: 'Inventory',
      description: 'Track stock levels & alerts',
      icon: Users,
      onClick: () => navigate('/admin'),
      color: 'bg-green-600',
      role: 'admin'
    },
    {
      title: 'Settings',
      description: 'Configure system preferences',
      icon: Settings,
      onClick: () => navigate('/admin'),
      color: 'bg-orange-600',
      role: 'admin'
    }
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Welcome to Bao to the Wings</h1>
        <p className="text-gray-600">Restaurant Management System Dashboard</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.title}
              onClick={action.onClick}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-200 text-left hover:scale-105 transform"
            >
              <div className={`${action.color} text-white w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">{action.title}</h3>
              <p className="text-sm text-gray-600">{action.description}</p>
            </button>
          )
        })}
      </div>

      {/* Dashboard Overview */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Overview</h2>
        <DashboardOverview />
      </div>
    </div>
  )
}
