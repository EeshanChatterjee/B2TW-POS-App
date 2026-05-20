import React, { useState } from 'react';
import { useAppSelector } from '../hooks/useStore';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (paymentMethod: string, customerPhone?: string) => Promise<void>;
  loading?: boolean;
  customerPhone?: string;
}

export default function CheckoutModal({ isOpen, onClose, onSubmit, loading = false, customerPhone: initialPhone = '' }: CheckoutModalProps) {
  const { items, total } = useAppSelector(state => state.cart);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [customerPhone, setCustomerPhone] = useState<string>(initialPhone);
  const [error, setError] = useState<string>('');

  // Sync phone from parent when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setCustomerPhone(initialPhone);
    }
  }, [isOpen, initialPhone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    try {
      await onSubmit(paymentMethod, customerPhone || undefined);
    } catch (err: any) {
      setError(err.message || 'Checkout failed. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-screen overflow-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 flex justify-between items-center sticky top-0">
          <h2 className="text-2xl font-bold">Checkout</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-2xl leading-none hover:opacity-80 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          {/* Order Summary */}
          <div className="mb-6 pb-6 border-b-2 border-gray-200">
            <h3 className="font-bold text-gray-800 mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm mb-3 max-h-40 overflow-y-auto">
              {items.map(item => (
                <div key={item.productId} className="flex justify-between text-gray-700">
                  <span>{item.productName} × {item.quantity}</span>
                  <span className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            {(() => {
              const subtotal = total;
              const tax = subtotal * 0.05;
              const finalTotal = subtotal + tax;

              return (
                <>
                  <div className="flex justify-between pt-3 text-sm border-t border-gray-200 mb-2">
                    <span className="text-gray-700">Subtotal</span>
                    <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-gray-700">Tax (5% GST)</span>
                    <span className="font-semibold">₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t-2 border-gray-300">
                    <span className="font-bold text-gray-800">Total Amount</span>
                    <span className="text-2xl font-bold text-red-600">₹{finalTotal.toFixed(2)}</span>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Customer Phone (Optional) */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Customer Phone (Optional)
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              placeholder="9876543210"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">To save order history and customer details</p>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Payment Method
            </label>
            <div className="space-y-2">
              {[
                { id: 'cash', label: '💵 Cash', icon: '💵' },
                { id: 'card', label: '💳 Card', icon: '💳' },
                { id: 'upi', label: '📱 UPI', icon: '📱' }
              ].map(method => (
                <label
                  key={method.id}
                  className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === method.id
                      ? 'border-red-600 bg-red-50'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    onChange={e => setPaymentMethod(e.target.value)}
                    disabled={loading}
                    className="w-4 h-4 text-red-600 cursor-pointer"
                  />
                  <span className="ml-3 font-semibold text-gray-700">{method.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  Processing...
                </>
              ) : (
                <>
                  ✓ Complete Order
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            After checkout, bill will be printed automatically
          </p>
        </form>
      </div>
    </div>
  );
}
