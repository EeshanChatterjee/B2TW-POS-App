import React, { useState, useEffect } from 'react'
import { api } from '@/services/api'
import TransactionsTable from './TransactionsTable'

interface DashboardMetrics {
  today: {
    order_count: number
    total_price: number
    base_price: number
    gst_amount: number
    avg_order_value: number
    avg_base_price?: number
    avg_gst_amount?: number
  }
  thisMonth: {
    order_count: number
    total_price: number
    base_price: number
    gst_amount: number
  }
  topProduct: {
    name: string
    quantity: number
    total_price: number
    base_price?: number
    gst_amount?: number
  }
  customers: {
    total_customers: number
    new_customers_today: number
  }
}

export default function DashboardOverview() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getDashboardMetrics()
      console.log('Dashboard API response:', data)
      console.log('Setting metrics to:', data.data)
      setMetrics(data.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load dashboard metrics')
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
        <button
          onClick={fetchMetrics}
          className="ml-4 px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!metrics) return <div className="text-gray-600">No data available</div>

  const cards = [
    {
      title: "Today's Sales",
      value: `₹${(metrics.today.total_price || 0).toFixed(2)}`,
      subtitle: `${metrics.today.order_count} orders`,
      color: 'bg-blue-50 border-blue-200'
    },
    {
      title: "This Month's Sales",
      value: `₹${(metrics.thisMonth.total_price || 0).toFixed(2)}`,
      subtitle: `${metrics.thisMonth.order_count} orders`,
      color: 'bg-green-50 border-green-200'
    },
    {
      title: 'Average Order Value',
      value: `₹${(metrics.today.avg_order_value || 0).toFixed(2)}`,
      subtitle: 'Today',
      color: 'bg-purple-50 border-purple-200'
    },
    {
      title: 'Total Customers',
      value: metrics.customers.total_customers || 0,
      subtitle: `+${metrics.customers.new_customers_today || 0} new today`,
      color: 'bg-orange-50 border-orange-200'
    }
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className={`border rounded-lg p-6 ${card.color}`}
          >
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              {card.title}
            </h3>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {card.value}
            </p>
            <p className="text-xs text-gray-500">{card.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Top Product Today */}
      {metrics.topProduct?.name && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Top Product Today</h2>
          <div className="border-t pt-4">
            <p className="text-lg font-semibold text-gray-900 mb-2">
              {metrics.topProduct.name}
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Quantity:</span>
                <p className="text-xl font-bold text-gray-900">
                  {metrics.topProduct.quantity}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Revenue:</span>
                <p className="text-xl font-bold text-gray-900">
                  ₹{metrics.topProduct.total_price?.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <TransactionsTable />
    </div>
  )
}
