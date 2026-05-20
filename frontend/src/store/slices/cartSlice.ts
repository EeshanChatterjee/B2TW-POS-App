import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface CartItem {
  productId: string
  productName: string
  price: number
  quantity: number
  isBeverage: boolean
  notes?: string
}

interface CartState {
  items: CartItem[]
  total: number
}

const initialState: CartState = {
  items: [],
  total: 0,
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<Omit<CartItem, 'quantity'> & { quantity?: number }>) => {
      const { productId, quantity = 1 } = action.payload
      const existingItem = state.items.find(item => item.productId === productId)

      if (existingItem) {
        existingItem.quantity += quantity
      } else {
        state.items.push({
          ...action.payload,
          quantity,
        })
      }

      cartSlice.caseReducers.updateTotal(state)
    },

    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.productId !== action.payload)
      cartSlice.caseReducers.updateTotal(state)
    },

    updateQuantity: (state, action: PayloadAction<{ productId: string; quantity: number }>) => {
      const item = state.items.find(item => item.productId === action.payload.productId)
      if (item) {
        item.quantity = action.payload.quantity
        if (item.quantity <= 0) {
          state.items = state.items.filter(i => i.productId !== action.payload.productId)
        }
      }
      cartSlice.caseReducers.updateTotal(state)
    },

    clearCart: (state) => {
      state.items = []
      state.total = 0
    },

    updateTotal: (state) => {
      state.total = state.items.reduce(
        (sum, item) => sum + (item.price * item.quantity),
        0
      )
    },
  },
})

export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions
export default cartSlice.reducer
