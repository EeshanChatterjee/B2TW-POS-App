import React, { useState, useEffect } from 'react'
import { api } from '@/services/api'

interface InventoryItem {
  id: string
  product_id: string
  name: string
  category: string
  price: number
  current_stock: number
  min_stock: number
  max_stock: number
  is_low_stock: boolean
  is_out_of_stock: boolean
  updated_at: string
}

interface Alert {
  id: string
  product_id: string
  name: string
  category: string
  alert_type: string
  current_stock: number
  threshold_level: number
  is_active: boolean
  created_at: string
}

interface CategorySummary {
  category: string
  product_count: number
  total_stock: number
  avg_stock: number
  low_stock_count: number
  out_of_stock_count: number
}

export default function InventoryView() {
  const [tab, setTab] = useState<'overview' | 'inventory' | 'alerts' | 'logs'>('overview')
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Adjustment dialog state
  const [showAdjustDialog, setShowAdjustDialog] = useState(false)
  const [adjustProductId, setAdjustProductId] = useState<string | null>(null)
  const [adjustQuantity, setAdjustQuantity] = useState<number | ''>('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustType, setAdjustType] = useState<string>('adjustment')

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)

  // Initialize on mount
  useEffect(() => {
    fetchAllData()
  }, [])

  // Refetch when filters change
  useEffect(() => {
    if (tab === 'inventory') {
      fetchInventory()
    } else if (tab === 'overview') {
      fetchSummary()
    } else if (tab === 'alerts') {
      fetchAlerts()
    }
  }, [tab, selectedCategory, showLowStockOnly])

  const fetchAllData = async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([
        fetchInventory(),
        fetchAlerts(),
        fetchSummary()
      ])
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load inventory data')
    } finally {
      setLoading(false)
    }
  }

  const fetchInventory = async () => {
    try {
      const data = await api.getInventory(selectedCategory || undefined, showLowStockOnly)
      setInventory(data.data || [])
    } catch (err: any) {
      console.error('Error fetching inventory:', err)
    }
  }

  const fetchAlerts = async () => {
    try {
      const data = await api.getActiveAlerts(50, 0)
      setAlerts(data.data || [])
    } catch (err: any) {
      console.error('Error fetching alerts:', err)
    }
  }

  const fetchSummary = async () => {
    try {
      const data = await api.getInventorySummary()
      setCategorySummary(data.data || [])
    } catch (err: any) {
      console.error('Error fetching summary:', err)
    }
  }

  const handleAdjustInventory = async () => {
    if (!adjustProductId || adjustQuantity === '' || !adjustReason.trim()) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      await api.adjustInventory(
        adjustProductId,
        parseInt(adjustQuantity.toString()),
        adjustReason.trim(),
        adjustType
      )

      // Reset and refresh
      setShowAdjustDialog(false)
      setAdjustProductId(null)
      setAdjustQuantity('')
      setAdjustReason('')
      setAdjustType('adjustment')
      await fetchInventory()
      await fetchAlerts()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to adjust inventory')
    } finally {
      setLoading(false)
    }
  }

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await api.acknowledgeAlert(alertId, 'admin')
      await fetchAlerts()
    } catch (err: any) {
      console.error('Error acknowledging alert:', err)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Inventory Management</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {['overview', 'inventory', 'alerts', 'logs'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={`px-4 py-2 font-semibold transition ${
              tab === t
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">
                {categorySummary.reduce((sum, c) => sum + c.product_count, 0)}
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {categorySummary.reduce((sum, c) => sum + c.total_stock, 0)}
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">
                {categorySummary.reduce((sum, c) => sum + c.low_stock_count, 0)}
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {categorySummary.reduce((sum, c) => sum + c.out_of_stock_count, 0)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">By Category</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Category</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-700">Products</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-700">Total Stock</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-700">Avg Stock</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-700">Low Stock</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-700">Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorySummary.map((cat, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-semibold text-gray-900">{cat.category}</td>
                        <td className="px-4 py-2 text-right text-gray-900">{cat.product_count}</td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-900">
                          {cat.total_stock}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-600">
                          {cat.avg_stock.toFixed(1)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {cat.low_stock_count > 0 && (
                            <span className="inline-block bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                              {cat.low_stock_count}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {cat.out_of_stock_count > 0 && (
                            <span className="inline-block bg-red-100 text-red-700 px-2 py-1 rounded">
                              {cat.out_of_stock_count}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {tab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setShowAdjustDialog(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
            >
              Adjust Stock
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
              />
              <span>Low Stock Only</span>
            </label>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading inventory...</div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Product</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Category</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-700">Current</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-700">Min</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-700">Max</th>
                      <th className="px-4 py-2 text-center font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-2 text-center font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-semibold text-gray-900">{item.name}</td>
                        <td className="px-4 py-2 text-gray-600">{item.category}</td>
                        <td className="px-4 py-2 text-right font-bold text-gray-900">
                          {item.current_stock}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-600">{item.min_stock}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{item.max_stock}</td>
                        <td className="px-4 py-2 text-center">
                          {item.is_out_of_stock ? (
                            <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                              Out of Stock
                            </span>
                          ) : item.is_low_stock ? (
                            <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                              OK
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => {
                              setAdjustProductId(item.product_id)
                              setShowAdjustDialog(true)
                            }}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-semibold"
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {tab === 'alerts' && !loading && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {alerts.length === 0 ? (
            <div className="p-6 text-center text-gray-600">
              No active alerts - all inventory levels are good!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Product</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Category</th>
                    <th className="px-4 py-2 text-center font-semibold text-gray-700">Alert Type</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-700">Current Stock</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-700">Threshold</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Created</th>
                    <th className="px-4 py-2 text-center font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-semibold text-gray-900">{alert.name}</td>
                      <td className="px-4 py-2 text-gray-600">{alert.category}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          alert.alert_type === 'out_of_stock'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {alert.alert_type.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-gray-900">
                        {alert.current_stock}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-600">{alert.threshold_level}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {new Date(alert.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm font-semibold"
                        >
                          Acknowledge
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Logs Tab */}
      {tab === 'logs' && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Inventory transaction logs will be displayed here.</p>
        </div>
      )}

      {/* Adjust Inventory Dialog */}
      {showAdjustDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Adjust Inventory</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Product
                </label>
                <select
                  value={adjustProductId || ''}
                  onChange={(e) => setAdjustProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select a product...</option>
                  {inventory.map((item) => (
                    <option key={item.product_id} value={item.product_id}>
                      {item.name} (Current: {item.current_stock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quantity Change *
                </label>
                <input
                  type="number"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="e.g., +10 or -5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <p className="text-xs text-gray-600 mt-1">Positive for adding stock, negative for removing</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Transaction Type
                </label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="adjustment">Stock Adjustment</option>
                  <option value="purchase">Purchase/Restock</option>
                  <option value="damage">Damage/Loss</option>
                  <option value="return">Return</option>
                  <option value="usage">Usage</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason *
                </label>
                <textarea
                  placeholder="Why is this adjustment being made?"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 h-20"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAdjustInventory}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50"
              >
                {loading ? 'Adjusting...' : 'Adjust'}
              </button>
              <button
                onClick={() => {
                  setShowAdjustDialog(false)
                  setAdjustProductId(null)
                  setAdjustQuantity('')
                  setAdjustReason('')
                  setAdjustType('adjustment')
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
