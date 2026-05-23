import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import { removeFromCart, updateQuantity, clearCart } from '../store/slices/cartSlice';
import { getPriceBreakdown } from '../utils/priceCalculations';

interface CartDisplayProps {
  onCheckout: () => void;
  onHoldBill: () => void;
  checkoutLoading?: boolean;
  hasCustomerInfo?: boolean;
}

export default function CartDisplay({ onCheckout, onHoldBill, checkoutLoading = false, hasCustomerInfo = false }: CartDisplayProps) {
  const dispatch = useAppDispatch();
  const { items, total } = useAppSelector(state => state.cart);

  const handleRemoveItem = (productId: string) => {
    dispatch(removeFromCart(productId));
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      dispatch(removeFromCart(productId));
    } else {
      dispatch(updateQuantity({ productId, quantity }));
    }
  };

  const handleClearCart = () => {
    if (window.confirm('Clear all items from cart?')) {
      dispatch(clearCart());
    }
  };

  return (
    <div className="w-64 md:w-80 lg:w-96 bg-white shadow-lg flex flex-col border-l border-gray-200">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <h2 className="text-lg font-bold">Bill</h2>
        {items.length > 0 && (
          <button
            onClick={handleClearCart}
            className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-auto p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="text-4xl mb-2">🛒</div>
            <p className="text-center text-sm">Cart is empty</p>
            <p className="text-center text-xs mt-2">Add items from the menu</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.productId}
                className="bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                {/* Item Name and Price */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-gray-800">{item.productName}</h4>
                    <p className="text-xs text-gray-600">₹{item.price} each</p>
                  </div>
                  <p className="font-bold text-sm text-red-600">₹{(item.price * item.quantity).toFixed(2)}</p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-white border border-gray-300 rounded">
                    <button
                      onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                      className="w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-600 hover:bg-gray-100"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-600 hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item.productId)}
                    className="text-xs bg-red-100 text-red-600 hover:bg-red-200 px-2 py-1 rounded transition-colors font-semibold"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200"></div>

      {/* Totals and Checkout */}
      <div className="bg-gray-50 p-4">
        {(() => {
          // total is already GST-inclusive (total_price)
          // Calculate breakdown on-the-fly
          const breakdown = getPriceBreakdown(total);

          return (
            <>
              {/* Subtotal (base price) */}
              <div className="flex justify-between mb-3 text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">₹{breakdown.base_price.toFixed(2)}</span>
              </div>

              {/* Tax (5% GST) */}
              <div className="flex justify-between mb-4 text-sm">
                <span className="text-gray-600">Tax (5%)</span>
                <span className="font-semibold">₹{breakdown.gst_amount.toFixed(2)}</span>
              </div>

              {/* Total */}
              <div className="flex justify-between mb-4 pb-4 border-t-2 border-gray-300">
                <span className="font-bold text-gray-800">Total</span>
                <span className="text-2xl font-bold text-red-600">₹{breakdown.total_price.toFixed(2)}</span>
              </div>
            </>
          );
        })()}

        {/* Item Count */}
        <div className="text-center text-xs text-gray-500 mb-4">
          {items.length} item{items.length !== 1 ? 's' : ''} in cart
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onHoldBill}
            disabled={items.length === 0 || !hasCustomerInfo}
            className={`flex-1 py-3 rounded-lg font-bold transition-colors ${
              items.length === 0 || !hasCustomerInfo
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-yellow-500 text-white hover:bg-yellow-600 active:bg-yellow-700'
            }`}
            title={!hasCustomerInfo ? 'Please enter customer name and phone' : ''}
          >
            Hold Bill
          </button>
          <button
            onClick={onCheckout}
            disabled={items.length === 0 || checkoutLoading}
            className={`flex-1 py-3 rounded-lg font-bold text-white transition-colors ${
              items.length === 0 || checkoutLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 active:bg-red-800'
            }`}
          >
            {checkoutLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                Processing...
              </span>
            ) : (
              'Print Bill'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
