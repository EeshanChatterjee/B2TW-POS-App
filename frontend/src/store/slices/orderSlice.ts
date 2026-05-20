import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface OrderState {
  currentOrderId: string | null
  isProcessing: boolean
  paymentMethod: 'cash' | 'card' | 'upi' | null
  billNumber: number | null
  printStatus: 'idle' | 'printing' | 'success' | 'error'
  printError: string | null
}

const initialState: OrderState = {
  currentOrderId: null,
  isProcessing: false,
  paymentMethod: null,
  billNumber: null,
  printStatus: 'idle',
  printError: null,
}

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    setCurrentOrder: (state, action: PayloadAction<string>) => {
      state.currentOrderId = action.payload
    },

    setPaymentMethod: (state, action: PayloadAction<'cash' | 'card' | 'upi'>) => {
      state.paymentMethod = action.payload
    },

    setProcessing: (state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload
    },

    setPrintStatus: (state, action: PayloadAction<OrderState['printStatus']>) => {
      state.printStatus = action.payload
    },

    setPrintError: (state, action: PayloadAction<string | null>) => {
      state.printError = action.payload
    },

    setBillNumber: (state, action: PayloadAction<number>) => {
      state.billNumber = action.payload
    },

    resetOrder: (state) => {
      state.currentOrderId = null
      state.paymentMethod = null
      state.billNumber = null
      state.printStatus = 'idle'
      state.printError = null
    },
  },
})

export const {
  setCurrentOrder,
  setPaymentMethod,
  setProcessing,
  setPrintStatus,
  setPrintError,
  setBillNumber,
  resetOrder,
} = orderSlice.actions

export default orderSlice.reducer
