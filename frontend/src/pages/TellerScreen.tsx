import React from 'react'

/**
 * TellerScreen Component
 * Main POS interface for quick product selection and checkout
 *
 * TODO: Implement:
 * - Product grid with categories
 * - Shopping cart with item management
 * - Customer lookup/capture
 * - Payment method selection
 * - Bill & KOT printing
 */
export default function TellerScreen() {
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="bg-red-600 text-white p-4">
        <h1 className="text-2xl font-bold">Bao to the Wings - POS</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Product Grid - Left Side */}
        <div className="flex-1 p-6 overflow-auto">
          <h2 className="text-lg font-bold mb-4">Products</h2>
          <div className="grid grid-cols-3 gap-4">
            {/* TODO: Replace with actual products from API */}
            <div className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-lg">
              <div className="text-center">
                <p className="font-bold">Product 1</p>
                <p className="text-gray-600">₹150</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cart & Checkout - Right Side */}
        <div className="w-80 bg-white shadow-lg flex flex-col">
          <div className="bg-gray-800 text-white p-4">
            <h2 className="text-lg font-bold">Bill</h2>
          </div>

          <div className="flex-1 p-4 overflow-auto">
            {/* Cart items will go here */}
            <p className="text-gray-500 text-center">Cart is empty</p>
          </div>

          <div className="border-t p-4">
            <div className="flex justify-between mb-4">
              <span className="font-bold">Total:</span>
              <span className="text-2xl font-bold text-red-600">₹0</span>
            </div>
            <button className="w-full bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700">
              Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
