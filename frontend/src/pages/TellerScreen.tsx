import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import { setCurrentOrder, setPaymentMethod, setBillNumber, setPrintStatus, resetOrder } from '../store/slices/orderSlice';
import { clearCart } from '../store/slices/cartSlice';
import { api } from '../services/api';
import ProductGrid from '../components/ProductGrid';
import CartDisplay from '../components/CartDisplay';
import CheckoutModal from '../components/CheckoutModal';

interface Customer {
  id: string;
  name: string;
  phone: string;
}

export default function TellerScreen() {
  const dispatch = useAppDispatch();
  const { items } = useAppSelector(state => state.cart);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showNavBar, setShowNavBar] = useState(true);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const searchTimeout = React.useRef<NodeJS.Timeout | null>(null);

  const handlePhoneChange = async (phone: string) => {
    setCustomerPhone(phone);
    setShowCustomerDropdown(true);

    // Clear existing timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Only search if phone has at least 2 characters
    if (phone.length < 2) {
      setCustomerSuggestions([]);
      return;
    }

    // Debounce the search
    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await api.searchCustomers(phone);
        if (response.data && Array.isArray(response.data.customers)) {
          setCustomerSuggestions(response.data.customers);
        }
      } catch (error) {
        console.error('Failed to search customers:', error);
        setCustomerSuggestions([]);
      }
    }, 300);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setShowCustomerDropdown(false);
    setCustomerSuggestions([]);
  };

  const handleCheckout = async (paymentMethod: string, customerPhone?: string) => {
    try {
      setCheckoutLoading(true);

      // Create customer if phone is provided
      let customerId = undefined;
      if (customerPhone) {
        try {
          // Try to create customer (will fail if already exists, which is fine)
          const customerResponse = await api.createCustomer({
            phone: customerPhone,
            name: customerName || undefined
          });
          customerId = customerResponse.data.id;
        } catch (error: any) {
          // Customer likely already exists, try to fetch
          if (error.response?.status === 409) {
            const existingCustomer = await api.getCustomerByPhone(customerPhone);
            customerId = existingCustomer.data?.id;
          }
        }
      }

      // Create order
      const orderResponse = await api.createOrder({
        items: items.map(item => ({
          product_id: item.productId,
          quantity: item.quantity,
          price: item.price
        })),
        payment_method: paymentMethod,
        customer_id: customerId
      });

      const orderId = orderResponse.data.order_id;
      const totalAmount = orderResponse.data.total_amount;

      // Create bill from order
      const billResponse = await api.createBill({
        order_id: orderId,
        customer_phone: customerPhone || undefined,
        customer_id: customerId
      });

      const billId = billResponse.data.bill_id;
      const billNumber = billResponse.data.bill_number;

      // Print KOT and Bill
      try {
        // Print KOT (Kitchen Order Ticket)
        await api.printKOT(orderId);
        // Print Bill
        await api.printBill(billId);
      } catch (printError) {
        console.warn('Print request sent, but printer may not be available');
      }

      // Update Redux with order details
      dispatch(setCurrentOrder(orderId));
      dispatch(setPaymentMethod(paymentMethod as 'cash' | 'card' | 'upi'));
      dispatch(setBillNumber(parseInt(billNumber.replace('B', ''))));
      dispatch(setPrintStatus('success'));

      // Clear cart
      dispatch(clearCart());

      // Clear customer info
      setCustomerName('');
      setCustomerPhone('');

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

  const handleHoldBill = async () => {
    if (!customerPhone) {
      alert('Please enter customer phone number');
      return;
    }

    try {
      setCheckoutLoading(true);

      // Create customer if needed
      let customerId = undefined;
      if (customerPhone) {
        try {
          const customerResponse = await api.createCustomer({
            phone: customerPhone,
            name: customerName || undefined
          });
          customerId = customerResponse.data.id;
        } catch (error: any) {
          if (error.response?.status === 409) {
            const existingCustomer = await api.getCustomerByPhone(customerPhone);
            customerId = existingCustomer.data?.id;
          }
        }
      }

      // Create order
      const orderResponse = await api.createOrder({
        items: items.map(item => ({
          product_id: item.productId,
          quantity: item.quantity,
          price: item.price
        })),
        payment_method: 'cash',
        customer_id: customerId
      });

      const orderId = orderResponse.data.order_id;

      // Print KOT only
      try {
        await api.printKOT(orderId);
      } catch (printError) {
        console.warn('KOT print request sent, but printer may not be available');
      }

      // Clear cart
      dispatch(clearCart());

      // Clear customer info
      setCustomerName('');
      setCustomerPhone('');

      // Show success message
      setSuccessMessage(`✓ KOT printed for order #${orderId}`);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error: any) {
      alert('Failed to hold bill: ' + (error.message || 'Please try again.'));
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 relative">
      {/* Toggle Nav Bar Button */}
      <button
        onClick={() => setShowNavBar(!showNavBar)}
        className="absolute top-2 left-2 z-50 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
        title={showNavBar ? 'Hide navigation' : 'Show navigation'}
      >
        {showNavBar ? '▼' : '▲'}
      </button>

      {/* Header */}
      {showNavBar && (
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 shadow-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="Bao to the Wings" className="h-16 w-auto" />
              <div>
                <h1 className="text-3xl font-bold">Bao to the Wings</h1>
                <p className="text-red-100 text-sm">Fast & Delicious QSR Service</p>
              </div>
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
      )}

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
        <div className="flex flex-col gap-2">
          {/* Customer Info Section */}
          <div className="space-y-2">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer Name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="relative">
              <input
                type="tel"
                inputMode="numeric"
                value={customerPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onFocus={() => customerPhone.length >= 2 && setShowCustomerDropdown(true)}
                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                placeholder="Phone Number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />

              {/* Customer Dropdown */}
              {showCustomerDropdown && customerSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                  <div className="max-h-40 overflow-y-auto">
                    {customerSuggestions.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => handleSelectCustomer(customer)}
                        className="w-full text-left px-3 py-2 hover:bg-red-50 border-b border-gray-200 last:border-b-0 transition-colors"
                      >
                        <div className="text-sm font-semibold text-gray-800">{customer.name}</div>
                        <div className="text-xs text-gray-600">{customer.phone}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bill Section */}
          <CartDisplay
            onCheckout={() => setShowCheckout(true)}
            onHoldBill={handleHoldBill}
            checkoutLoading={checkoutLoading}
            hasCustomerInfo={!!customerName && !!customerPhone}
          />
        </div>
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        onSubmit={handleCheckout}
        loading={checkoutLoading}
        customerPhone={customerPhone}
      />
    </div>
  );
}
