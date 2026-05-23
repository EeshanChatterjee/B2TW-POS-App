import axios, { AxiosInstance, AxiosError } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests if it exists
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle responses
apiClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError) => {
    console.error('API Error:', error.response?.data || error.message)
    throw error
  }
)

// ============================================
// API Service Methods
// ============================================

export const api = {
  // Health & Status
  health: () => apiClient.get('/health'),
  dbStatus: () => apiClient.get('/db/status'),

  // Authentication
  login: (username: string, password: string) =>
    apiClient.post('/auth/login', { username, password }),
  validateToken: () => apiClient.get('/auth/validate'),
  logout: () => apiClient.post('/auth/logout'),

  // Products
  getProducts: () => apiClient.get('/products'),
  getProductById: (id: string) => apiClient.get(`/products/${id}`),
  getCategories: () => apiClient.get('/products/categories/list'),
  createProduct: (data: any) => apiClient.post('/products', data),
  updateProduct: (id: string, data: any) => apiClient.put(`/products/${id}`, data),
  deleteProduct: (id: string, params?: any) => apiClient.delete(`/products/${id}`, { params }),
  batchReorderProducts: (updates: Array<{ id: string; position: number }>) =>
    apiClient.post('/products/batch/reorder', { updates }),
  batchReorderCategories: (updates: Array<{ id: string; position: number }>) =>
    apiClient.post('/products/categories/batch/reorder', { updates }),

  // Orders
  createOrder: (data: any) => apiClient.post('/orders', data),
  getOrder: (id: string) => apiClient.get(`/orders/${id}`),
  getOrders: (filters?: any) => apiClient.get('/orders', { params: filters }),
  updateOrder: (id: string, data: any) => apiClient.put(`/orders/${id}`, data),
  completeOrder: (id: string) => apiClient.post(`/orders/${id}/complete`),
  cancelOrder: (id: string, reason?: string) =>
    apiClient.post(`/orders/${id}/cancel`, { reason }),
  printKOT: (orderId: string) => apiClient.post(`/orders/${orderId}/print-kot`),

  // Bills
  createBill: (data: any) => apiClient.post('/bills', data),
  getBill: (id: string) => apiClient.get(`/bills/${id}`),
  getBills: (filters?: any) => apiClient.get('/bills', { params: filters }),
  printBill: (billId: string) => apiClient.post(`/bills/${billId}/print`),
  holdBill: (id: string, reason: string, notes?: string) =>
    apiClient.post(`/bills/${id}/hold`, { reason, notes }),
  resumeBill: (id: string) =>
    apiClient.post(`/bills/${id}/resume`),
  getHeldBills: (limit: number = 50, offset: number = 0) =>
    apiClient.get('/bills/held', { params: { limit, offset } }),
  getBillHolds: (id: string) =>
    apiClient.get(`/bills/${id}/holds`),

  // Customers
  searchCustomers: (query: string) =>
    apiClient.get('/customers/search', { params: { q: query } }),
  getCustomer: (id: string) => apiClient.get(`/customers/${id}`),
  getCustomerByPhone: (phone: string) =>
    apiClient.get('/customers/phone', { params: { phone } }),
  createCustomer: (data: any) => apiClient.post('/customers', data),
  updateCustomer: (id: string, data: any) =>
    apiClient.put(`/customers/${id}`, data),
  getCustomerHistory: (id: string) =>
    apiClient.get(`/customers/${id}/history`),

  // Reports & Analytics
  getSalesReport: (startDate: string, endDate: string) =>
    apiClient.get('/reports/sales', { params: { startDate, endDate } }),
  getTopProducts: (limit: number = 10, startDate?: string, endDate?: string) =>
    apiClient.get('/reports/top-products', { params: { limit, startDate, endDate } }),
  getCustomerMetrics: (startDate?: string, endDate?: string) =>
    apiClient.get('/reports/customers', { params: { startDate, endDate } }),
  getRevenueReport: (startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month' = 'day') =>
    apiClient.get('/reports/revenue', { params: { startDate, endDate, groupBy } }),
  getDashboardMetrics: () =>
    apiClient.get('/reports/dashboard', { params: { t: Date.now() } }),
  getCategorySalesReport: (startDate: string, endDate: string) =>
    apiClient.get('/reports/category-sales', { params: { startDate, endDate } }),
  getTodayVsLastWeek: () =>
    apiClient.get('/reports/comparison/today-vs-lastweek'),
  getDayOfWeekReport: (startDate: string, endDate: string) =>
    apiClient.get('/reports/comparison/day-of-week', { params: { startDate, endDate } }),
  getMonthOverMonthReport: (month?: string) =>
    apiClient.get('/reports/comparison/month-over-month', { params: { month } }),
  getInventoryReport: (category?: string, low_stock_only?: boolean) =>
    apiClient.get('/reports/inventory', { params: { category, low_stock_only } }),
  getInventorySummaryReport: () =>
    apiClient.get('/reports/inventory/summary'),
  getAccountingReport: (startDate: string, endDate: string) =>
    apiClient.get('/reports/accounting', { params: { startDate, endDate } }),

  // Inventory Management
  getInventory: (category?: string, lowStockOnly?: boolean) =>
    apiClient.get('/inventory', { params: { category, low_stock_only: lowStockOnly } }),
  getProductInventory: (productId: string) =>
    apiClient.get(`/inventory/${productId}`),
  adjustInventory: (productId: string, quantity_change: number, reason: string, transaction_type?: string) =>
    apiClient.post(`/inventory/${productId}/adjust`, { quantity_change, reason, transaction_type }),
  getActiveAlerts: (limit?: number, offset?: number) =>
    apiClient.get('/inventory/alerts/active', { params: { limit, offset } }),
  acknowledgeAlert: (alertId: string, acknowledged_by?: string) =>
    apiClient.post(`/inventory/alerts/${alertId}/acknowledge`, { acknowledged_by }),
  getInventoryLogs: (product_id?: string, transaction_type?: string, days?: number) =>
    apiClient.get('/inventory/logs/history', { params: { product_id, transaction_type, days } }),
  getInventorySummary: () =>
    apiClient.get('/inventory/summary/categories'),
  initializeInventory: (default_stock?: number, min_stock?: number, max_stock?: number) =>
    apiClient.post('/inventory/initialize', { default_stock, min_stock, max_stock }),

  // Printer
  testPrinter: () => apiClient.post('/printer/test'),
  getPrinterStatus: () => apiClient.get('/printer/status'),

  // Settings Management
  getSettings: (category?: string) =>
    apiClient.get('/settings', { params: { category } }),
  getSettingsByCategory: (category: string) =>
    apiClient.get(`/settings/categories/${category}`),
  getSetting: (key: string) =>
    apiClient.get(`/settings/${key}`),
  updateSetting: (key: string, value: any) =>
    apiClient.put(`/settings/${key}`, { setting_value: value }),
  initializeSettings: () =>
    apiClient.post('/settings/initialize'),

  // Staff Management
  getStaffList: (limit?: number, offset?: number, is_active?: boolean) =>
    apiClient.get('/settings/staff/list', { params: { limit, offset, is_active } }),
  getStaff: (id: string) =>
    apiClient.get(`/settings/staff/${id}`),
  createStaff: (data: any) =>
    apiClient.post('/settings/staff', data),
  updateStaff: (id: string, data: any) =>
    apiClient.put(`/settings/staff/${id}`, data),
  deleteStaff: (id: string) =>
    apiClient.delete(`/settings/staff/${id}`),
}

export default apiClient
