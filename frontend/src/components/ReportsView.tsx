import React, { useState, useEffect } from 'react'
import { api } from '@/services/api'
import { Download } from 'lucide-react'

type ReportType = 'dashboard' | 'sales' | 'category' | 'products' | 'customers' | 'revenue' | 'comparison-today' | 'comparison-dow' | 'comparison-mom' | 'inventory' | 'accounting'

export default function ReportsView() {
  const [reportType, setReportType] = useState<ReportType>('dashboard')
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any>(null)
  const [todayTopItems, setTodayTopItems] = useState<any>(null)

  useEffect(() => {
    fetchReport()
  }, [reportType, startDate, endDate])

  useEffect(() => {
    if (reportType === 'dashboard') {
      fetchTodayTopItems()
    }
  }, [reportType])

  const fetchReport = async () => {
    try {
      setLoading(true)
      setError(null)

      let data: any = null

      switch (reportType) {
        case 'dashboard':
          data = await api.getDashboardMetrics()
          break
        case 'sales':
          data = await api.getSalesReport(startDate, endDate)
          break
        case 'category':
          data = await api.getCategorySalesReport(startDate, endDate)
          break
        case 'products':
          data = await api.getTopProducts(20, startDate, endDate)
          break
        case 'customers':
          data = await api.getCustomerMetrics(startDate, endDate)
          break
        case 'revenue':
          data = await api.getRevenueReport(startDate, endDate, 'day')
          break
        case 'comparison-today':
          data = await api.getTodayVsLastWeek()
          break
        case 'comparison-dow':
          data = await api.getDayOfWeekReport(startDate, endDate)
          break
        case 'comparison-mom':
          data = await api.getMonthOverMonthReport()
          break
        case 'inventory':
          data = await api.getInventoryReport()
          break
        case 'accounting':
          data = await api.getAccountingReport(startDate, endDate)
          break
      }

      setReportData(data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load report')
      console.error('Report error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTodayTopItems = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const data = await api.getTopProducts(7, today, today)
      setTodayTopItems(data)
    } catch (err: any) {
      console.error('Error fetching today top items:', err)
    }
  }

  const exportToCSV = () => {
    if (!reportData) return

    let csv = `Report: ${reportType}\nGenerated: ${new Date().toISOString()}\n\n`

    if (reportData.data?.data) {
      const rows = Array.isArray(reportData.data.data) ? reportData.data.data : [reportData.data.data]
      if (rows.length > 0) {
        const headers = Object.keys(rows[0])
        csv += headers.join(',') + '\n'
        rows.forEach((row: any) => {
          csv += headers.map((h) => {
            const val = row[h]
            return typeof val === 'string' && val.includes(',') ? `"${val}"` : val
          }).join(',') + '\n'
        })
      }
    }

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportType}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const reportTabs: { label: string; value: ReportType }[] = [
    { label: 'Overview', value: 'dashboard' },
    { label: 'Sales', value: 'sales' },
    { label: 'By Category', value: 'category' },
    { label: 'Top Items', value: 'products' },
    { label: 'Customers', value: 'customers' },
    { label: 'Revenue', value: 'revenue' },
    { label: 'Today vs Last Week', value: 'comparison-today' },
    { label: 'Day of Week', value: 'comparison-dow' },
    { label: 'Month over Month', value: 'comparison-mom' },
    { label: 'Inventory', value: 'inventory' },
    { label: 'Accounting', value: 'accounting' },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        {reportData && (
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Download size={18} />
            Export CSV
          </button>
        )}
      </div>

      {/* Report Type Tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 border-b pb-0 min-w-min">
          {reportTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setReportType(tab.value)}
              className={`px-4 py-2 font-semibold transition whitespace-nowrap ${
                reportType === tab.value
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range Controls (not for dashboard or comparison-today) */}
      {!['dashboard', 'comparison-today'].includes(reportType) && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && <div className="text-center py-8 text-gray-600">Loading report...</div>}

      {/* DASHBOARD */}
      {reportType === 'dashboard' && !loading && reportData?.data && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Today's Sales</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{(reportData.data.today?.total_price || 0).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{reportData.data.today?.order_count || 0} orders</p>
            </div>
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{(reportData.data.thisMonth?.total_price || 0).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{reportData.data.thisMonth?.order_count || 0} orders</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Top Product</p>
              <p className="text-lg font-bold text-gray-900">{reportData.data.topProduct?.name || 'N/A'}</p>
              <p className="text-xs text-gray-500 mt-1">₹{(reportData.data.topProduct?.revenue || 0).toFixed(2)}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.data.customers?.total_customers || 0}</p>
              <p className="text-xs text-gray-500 mt-1">{reportData.data.customers?.new_customers_today || 0} new today</p>
            </div>
          </div>

          {/* Today's Top 7 Items */}
          {todayTopItems?.data && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Today's Top 7 Items</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">Item</th>
                        <th className="px-4 py-2 text-right font-semibold">Quantity</th>
                        <th className="px-4 py-2 text-right font-semibold">Base Amount</th>
                        <th className="px-4 py-2 text-right font-semibold">GST (5%)</th>
                        <th className="px-4 py-2 text-right font-semibold">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(todayTopItems.data.data || []).map((row: any, idx: number) => {
                        const baseAmount = row.total_revenue ? row.total_revenue / 1.05 : 0
                        const gst = row.total_revenue ? row.total_revenue - baseAmount : 0
                        return (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2 font-semibold">{row.name}</td>
                            <td className="px-4 py-2 text-right">{row.total_quantity}</td>
                            <td className="px-4 py-2 text-right">₹{baseAmount.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right text-orange-600 font-semibold">₹{gst.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right font-bold text-gray-900">₹{row.total_revenue?.toFixed(2)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SALES REPORT */}
      {reportType === 'sales' && !loading && reportData?.data && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Sales Report</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold">₹{reportData.data.summary?.totalSales?.toFixed(2)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold">{reportData.data.summary?.totalOrders}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">GST Collected</p>
                <p className="text-2xl font-bold text-orange-600">₹{((reportData.data.summary?.totalSales || 0) / 1.05 * 0.05).toFixed(2)}</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Avg Order Value</p>
                <p className="text-2xl font-bold">₹{reportData.data.summary?.averageOrderValue?.toFixed(2)}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Date</th>
                    <th className="px-4 py-2 text-right font-semibold">Orders</th>
                    <th className="px-4 py-2 text-right font-semibold">Base Amount</th>
                    <th className="px-4 py-2 text-right font-semibold">GST (5%)</th>
                    <th className="px-4 py-2 text-right font-semibold">Total Sales</th>
                    <th className="px-4 py-2 text-right font-semibold">Avg Order</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData.data.data || []).slice(0, 30).map((row: any, idx: number) => {
                    const baseAmount = row.total ? row.total / 1.05 : 0
                    const gst = row.total ? row.total - baseAmount : 0
                    return (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">{row.date}</td>
                        <td className="px-4 py-2 text-right">{row.orders}</td>
                        <td className="px-4 py-2 text-right">₹{baseAmount.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right text-orange-600 font-semibold">₹{gst.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right font-semibold">₹{row.total?.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">₹{row.average?.toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY SALES REPORT */}
      {reportType === 'category' && !loading && reportData?.data && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Sales by Category</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Category</th>
                    <th className="px-4 py-2 text-right font-semibold">Orders</th>
                    <th className="px-4 py-2 text-right font-semibold">Qty Sold</th>
                    <th className="px-4 py-2 text-right font-semibold">Base Amount</th>
                    <th className="px-4 py-2 text-right font-semibold">GST (5%)</th>
                    <th className="px-4 py-2 text-right font-semibold">Total Sales</th>
                    <th className="px-4 py-2 text-right font-semibold">Items</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData.data.data || []).map((row: any, idx: number) => {
                    const baseAmount = row.total_sales ? row.total_sales / 1.05 : 0
                    const gst = row.total_sales ? row.total_sales - baseAmount : 0
                    return (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-semibold">{row.category}</td>
                        <td className="px-4 py-2 text-right">{row.order_count}</td>
                        <td className="px-4 py-2 text-right">{row.total_quantity}</td>
                        <td className="px-4 py-2 text-right">₹{baseAmount.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right text-orange-600 font-semibold">₹{gst.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right font-bold">₹{row.total_sales?.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">{row.distinct_items}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TODAY VS LAST WEEK */}
      {reportType === 'comparison-today' && !loading && reportData?.data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4 text-gray-900">Today</h3>
            <p className="text-3xl font-bold text-blue-600">{reportData.data.today?.orders || 0}</p>
            <p className="text-gray-600">Orders</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">₹{(reportData.data.today?.total_price || 0).toFixed(2)}</p>
          </div>
          <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4 text-gray-900">Same Day Last Week</h3>
            <p className="text-3xl font-bold text-green-600">{reportData.data.last_week_same_day?.orders || 0}</p>
            <p className="text-gray-600">Orders</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">₹{(reportData.data.last_week_same_day?.total_price || 0).toFixed(2)}</p>
          </div>
          {reportData.data.growth && (
            <div className="col-span-full bg-purple-50 border border-purple-200 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Growth Rate</p>
              <p className={`text-2xl font-bold ${reportData.data.growth.sales_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {reportData.data.growth.sales_pct}% sales growth
              </p>
            </div>
          )}
        </div>
      )}

      {/* DAY OF WEEK */}
      {reportType === 'comparison-dow' && !loading && reportData?.data && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Sales by Day of Week</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Day</th>
                    <th className="px-4 py-2 text-right font-semibold">Orders</th>
                    <th className="px-4 py-2 text-right font-semibold">Sales</th>
                    <th className="px-4 py-2 text-right font-semibold">Avg Order</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData.data.data || []).map((row: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-semibold">{row.day_of_week}</td>
                      <td className="px-4 py-2 text-right">{row.orders}</td>
                      <td className="px-4 py-2 text-right font-semibold">₹{row.total_sales?.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">₹{row.avg_order?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MONTH OVER MONTH */}
      {reportType === 'comparison-mom' && !loading && reportData?.data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4">{reportData.data.current_month?.month || 'This Month'}</h3>
            <p className="text-3xl font-bold text-blue-600">{reportData.data.current_month?.orders || 0}</p>
            <p className="text-gray-600">Orders</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">₹{(reportData.data.current_month?.total_price || 0).toFixed(2)}</p>
          </div>
          <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4">{reportData.data.previous_month?.month || 'Last Month'}</h3>
            <p className="text-3xl font-bold text-green-600">{reportData.data.previous_month?.orders || 0}</p>
            <p className="text-gray-600">Orders</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">₹{(reportData.data.previous_month?.total_price || 0).toFixed(2)}</p>
          </div>
          {reportData.data.growth && (
            <div className="col-span-full bg-purple-50 border border-purple-200 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Growth Rate</p>
              <p className={`text-2xl font-bold ${reportData.data.growth.sales_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {reportData.data.growth.sales_pct}% sales growth
              </p>
            </div>
          )}
        </div>
      )}

      {/* INVENTORY */}
      {reportType === 'inventory' && !loading && reportData?.data && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Inventory Status</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Item</th>
                    <th className="px-4 py-2 text-left font-semibold">Category</th>
                    <th className="px-4 py-2 text-right font-semibold">Stock</th>
                    <th className="px-4 py-2 text-right font-semibold">Min/Reorder</th>
                    <th className="px-4 py-2 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData.data.data || []).slice(0, 50).map((row: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-semibold">{row.name}</td>
                      <td className="px-4 py-2 text-gray-600">{row.category}</td>
                      <td className="px-4 py-2 text-right">{row.current_stock}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{row.min_stock}/{row.reorder_level}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            row.stock_status === 'Reorder'
                              ? 'bg-red-100 text-red-700'
                              : row.stock_status === 'Low Stock'
                                ? 'bg-yellow-100 text-yellow-700'
                                : row.stock_status === 'Overstock'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {row.stock_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNTING */}
      {reportType === 'accounting' && !loading && reportData?.data && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Accounting & Tax Summary</h2>

            {/* GST Breakdown Card */}
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-bold mb-4 text-gray-900">GST Breakdown (5%)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Base Amount</p>
                  <p className="text-2xl font-bold text-gray-900">₹{((reportData.data.total_sales || 0) / 1.05).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">GST Collected (5%)</p>
                  <p className="text-2xl font-bold text-orange-600">₹{(((reportData.data.total_sales || 0) / 1.05) * 0.05).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Sales (Inc. GST)</p>
                  <p className="text-2xl font-bold text-gray-900">₹{(reportData.data.total_sales || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold">{reportData.data.total_transactions || 0}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold">₹{(reportData.data.total_sales || 0).toFixed(2)}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Orders</p>
                <p className="text-2xl font-bold">{reportData.data.order_count || 0}</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Avg Order Value</p>
                <p className="text-2xl font-bold">₹{((reportData.data.total_sales || 0) / (reportData.data.order_count || 1)).toFixed(2)}</p>
              </div>
            </div>

            <h3 className="text-lg font-bold mb-4 text-gray-900">Payment Methods</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="border rounded-lg p-4 bg-blue-50">
                <p className="text-sm text-gray-600">Cash Received</p>
                <p className="text-xl font-bold">₹{(reportData.data.cash_received || 0).toFixed(2)}</p>
              </div>
              <div className="border rounded-lg p-4 bg-green-50">
                <p className="text-sm text-gray-600">Card Payments</p>
                <p className="text-xl font-bold">₹{(reportData.data.card_received || 0).toFixed(2)}</p>
              </div>
              <div className="border rounded-lg p-4 bg-purple-50">
                <p className="text-sm text-gray-600">Digital (UPI, etc)</p>
                <p className="text-xl font-bold">₹{(reportData.data.digital_received || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCTS REPORT (Top items) */}
      {reportType === 'products' && !loading && reportData?.data && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Top Selling Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Item</th>
                    <th className="px-4 py-2 text-left font-semibold">Category</th>
                    <th className="px-4 py-2 text-right font-semibold">Qty</th>
                    <th className="px-4 py-2 text-right font-semibold">Base Amount</th>
                    <th className="px-4 py-2 text-right font-semibold">GST (5%)</th>
                    <th className="px-4 py-2 text-right font-semibold">Total Revenue</th>
                    <th className="px-4 py-2 text-right font-semibold">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData.data.data || []).map((row: any, idx: number) => {
                    const baseAmount = row.total_revenue ? row.total_revenue / 1.05 : 0
                    const gst = row.total_revenue ? row.total_revenue - baseAmount : 0
                    return (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-semibold">{row.name}</td>
                        <td className="px-4 py-2 text-gray-600">{row.category}</td>
                        <td className="px-4 py-2 text-right">{row.total_quantity}</td>
                        <td className="px-4 py-2 text-right">₹{baseAmount.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right text-orange-600 font-semibold">₹{gst.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right font-bold">₹{row.total_revenue?.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">{row.order_count}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMERS REPORT */}
      {reportType === 'customers' && !loading && reportData?.data && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Customer Analytics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold">{reportData.data.metrics?.total_customers || 0}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Active This Period</p>
                <p className="text-2xl font-bold">{reportData.data.metrics?.active_customers || 0}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">New Customers</p>
                <p className="text-2xl font-bold">{reportData.data.metrics?.new_customers || 0}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Avg Spend</p>
                <p className="text-2xl font-bold">₹{(reportData.data.metrics?.avg_customer_spend || 0).toFixed(2)}</p>
              </div>
            </div>

            <h3 className="text-lg font-bold mb-3">Top Customers</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Name</th>
                    <th className="px-4 py-2 text-left font-semibold">Phone</th>
                    <th className="px-4 py-2 text-right font-semibold">Orders</th>
                    <th className="px-4 py-2 text-right font-semibold">Total Spent</th>
                    <th className="px-4 py-2 text-right font-semibold">Avg Order</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData.data.topCustomers || []).slice(0, 20).map((row: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-semibold">{row.name}</td>
                      <td className="px-4 py-2 text-gray-600">{row.phone || 'N/A'}</td>
                      <td className="px-4 py-2 text-right">{row.order_count}</td>
                      <td className="px-4 py-2 text-right font-semibold">₹{row.total_spent?.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">₹{row.avg_order_value?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REVENUE REPORT */}
      {reportType === 'revenue' && !loading && reportData?.data && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Revenue Report</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">₹{reportData.data.summary?.totalRevenue?.toFixed(2)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold">{reportData.data.summary?.totalOrders}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Periods</p>
                <p className="text-2xl font-bold">{reportData.data.summary?.periods}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Period</th>
                    <th className="px-4 py-2 text-right font-semibold">Orders</th>
                    <th className="px-4 py-2 text-right font-semibold">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData.data.data || []).map((row: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{row.period}</td>
                      <td className="px-4 py-2 text-right">{row.orders}</td>
                      <td className="px-4 py-2 text-right font-semibold">₹{row.total?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
