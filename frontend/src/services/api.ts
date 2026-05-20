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
  logout: () => apiClient.post('/auth/logout'),

  // Products
  getProducts: () => apiClient.get('/products'),
  getProductById: (id: string) => apiClient.get(`/products/${id}`),
  getCategories: () => apiClient.get('/products/categories/list'),
  createProduct: (data: any) => apiClient.post('/products', data),
  updateProduct: (id: string, data: any) => apiClient.put(`/products/${id}`, data),
  deleteProduct: (id: string) => apiClient.delete(`/products/${id}`),

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
  cancelBill: (id: string, reason?: string) =>
    apiClient.post(`/bills/${id}/cancel`, { reason }),

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
  getTopProducts: (limit: number = 10) =>
    apiClient.get('/reports/top-products', { params: { limit } }),
  getCustomerMetrics: () => apiClient.get('/reports/customers'),
  getMonthlyRevenue: () => apiClient.get('/reports/revenue'),

  // Printer
  testPrinter: () => apiClient.post('/printer/test'),
  getPrinterStatus: () => apiClient.get('/printer/status'),
}

export default apiClient
