import React, { useState, useEffect } from 'react'
import { api } from '@/services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
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
    total_customers_today: number
    new_customers_today: number
  }
}

export default function DashboardOverview() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [last30DaysData, setLast30DaysData] = useState<any[]>([])

  useEffect(() => {
    fetchMetrics()
    fetchLast30DaysSales()
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

  const fetchLast30DaysSales = async () => {
    try {
      const today = new Date()
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      const startDate = thirtyDaysAgo.toISOString().split('T')[0]
      const endDate = today.toISOString().split('T')[0]

      const data = await api.getSalesReport(startDate, endDate)
      setLast30DaysData(data?.data?.data || [])
    } catch (err: any) {
      console.error('Error fetching 30-day sales:', err)
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
      value: metrics.customers.total_customers_today || 0,
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

      {/* Last 30 Days Sales Chart */}
      {last30DaysData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Daily Sales - Last 30 Days</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={last30DaysData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip
                formatter={(value) => `₹${Number(value).toFixed(2)}`}
              />
              <Bar dataKey="total_price" fill="#3B82F6" name="Sales" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Transactions Table */}
      <TransactionsTable />
    </div>
  )
}
