import { configureStore } from '@reduxjs/toolkit'
import cartReducer from './slices/cartSlice'
import orderReducer from './slices/orderSlice'
import authReducer from './slices/authSlice'
import customerReducer from './slices/customerSlice'

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    order: orderReducer,
    auth: authReducer,
    customer: customerReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store
