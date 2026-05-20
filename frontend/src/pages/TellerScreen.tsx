import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import { setOrderData } from '../store/slices/orderSlice';
import { clearCart } from '../store/slices/cartSlice';
import { api } from '../services/api';
import ProductGrid from '../components/ProductGrid';
import CartDisplay from '../components/CartDisplay';
import CheckoutModal from '../components/CheckoutModal';

export default function TellerScreen() {
  const dispatch = useAppDispatch();
  const { items } = useAppSelector(state => state.cart);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const handleCheckout = async (paymentMethod: string, customerPhone?: string) => {
    try {
      setCheckoutLoading(true);

      // Create order
      const orderResponse = await api.createOrder({
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price
        })),
        payment_method: paymentMethod
      });

      const orderId = orderResponse.data.order_id;
      const totalAmount = orderResponse.data.total_amount;

      // Create bill from order
      const billResponse = await api.createBill({
        order_id: orderId,
        customer_phone: customerPhone
      });

      const billId = billResponse.data.bill_id;
      const billNumber = billResponse.data.bill_number;

      // Print bill
      try {
        await api.printBill(billId);
      } catch (printError) {
        console.warn('Print request sent, but printer may not be available');
      }

      // Update Redux with order details
      dispatch(setOrderData({
        currentOrderId: orderId,
        paymentMethod,
        printStatus: 'printed',
        billNumber
      }));

      // Clear cart
      dispatch(clearCart());

      // Show success message
      setSuccessMessage(`✓ Order #${billNumber} completed successfully!`);
      setShowCheckout(false);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error: any) {
      throw new Error(error.message || 'Checkout failed. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">🍗 Bao to the Wings</h1>
            <p className="text-red-100 text-sm">Fast & Delicious QSR Service</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-red-100">
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </p>
            <p className="text-red-100">
              {new Date().toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mx-4 mt-4 rounded shadow">
          <div className="flex items-center gap-2">
            <span className="text-xl">✓</span>
            <p className="font-semibold">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden gap-4 p-4">
        {/* Product Grid - Left Side */}
        <ProductGrid />

        {/* Cart & Checkout - Right Side */}
        <CartDisplay
          onCheckout={() => setShowCheckout(true)}
          checkoutLoading={checkoutLoading}
        />
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        onSubmit={handleCheckout}
        loading={checkoutLoading}
      />
    </div>
  );
}
