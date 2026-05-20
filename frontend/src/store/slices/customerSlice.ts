import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface Customer {
  id: string
  phone: string
  name?: string
  email?: string
  isActive: boolean
  createdAt: string
}

export interface CustomerState {
  selectedCustomer: Customer | null
  recentCustomers: Customer[]
  searchResults: Customer[]
  loading: boolean
  error: string | null
}

const initialState: CustomerState = {
  selectedCustomer: null,
  recentCustomers: [],
  searchResults: [],
  loading: false,
  error: null,
}

const customerSlice = createSlice({
  name: 'customer',
  initialState,
  reducers: {
    setSelectedCustomer: (state, action: PayloadAction<Customer | null>) => {
      state.selectedCustomer = action.payload
    },

    setRecentCustomers: (state, action: PayloadAction<Customer[]>) => {
      state.recentCustomers = action.payload
    },

    setSearchResults: (state, action: PayloadAction<Customer[]>) => {
      state.searchResults = action.payload
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },

    clearSelection: (state) => {
      state.selectedCustomer = null
    },

    clearSearch: (state) => {
      state.searchResults = []
    },
  },
})

export const {
  setSelectedCustomer,
  setRecentCustomers,
  setSearchResults,
  setLoading,
  setError,
  clearSelection,
  clearSearch,
} = customerSlice.actions

export default customerSlice.reducer
