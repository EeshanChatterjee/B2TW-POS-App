import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface AuthState {
  isLoggedIn: boolean
  username: string | null
  role: 'operator' | 'manager' | 'admin' | null
  token: string | null
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  isLoggedIn: false,
  username: null,
  role: null,
  token: null,
  loading: false,
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },

    loginSuccess: (state, action: PayloadAction<{ username: string; role: 'operator' | 'manager' | 'admin'; token: string }>) => {
      state.isLoggedIn = true
      state.username = action.payload.username
      state.role = action.payload.role
      state.token = action.payload.token
      state.loading = false
      state.error = null
    },

    loginError: (state, action: PayloadAction<string>) => {
      state.isLoggedIn = false
      state.username = null
      state.role = null
      state.token = null
      state.loading = false
      state.error = action.payload
    },

    logout: (state) => {
      state.isLoggedIn = false
      state.username = null
      state.role = null
      state.token = null
      state.error = null
    },

    clearError: (state) => {
      state.error = null
    },
  },
})

export const { setLoading, loginSuccess, loginError, logout, clearError } = authSlice.actions
export default authSlice.reducer
