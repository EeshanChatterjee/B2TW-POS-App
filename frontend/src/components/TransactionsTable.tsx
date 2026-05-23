import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';

interface Transaction {
  id: string;
  order_id?: string;
  customer_phone?: string;
  total_amount: number;
  status: string;
  created_at: string;
  items_count?: number;
}

const ROWS_PER_PAGE = 20;

export default function TransactionsTable() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchTodayTransactions();
  }, []);

  const fetchTodayTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const startDate = startOfDay.toISOString().split('T')[0];
      const endDate = endOfDay.toISOString().split('T')[0];

      // Fetch both orders and bills
      const [ordersRes, billsRes] = await Promise.all([
        api.getOrders({ startDate, endDate }),
        api.getBills({ startDate, endDate })
      ]);

      // Combine orders and bills into transactions
      const orderTransactions: Transaction[] = (ordersRes.data?.orders || []).map((order: any) => ({
        id: `order-${order.id}`,
        order_id: order.id,
        customer_phone: order.customer_phone || 'N/A',
        total_amount: order.total_amount,
        status: order.status || 'completed',
        created_at: order.created_at,
        items_count: order.items_count || 0
      }));

      const billTransactions: Transaction[] = (billsRes.data?.bills || billsRes.data?.orders || []).map((bill: any) => ({
        id: `bill-${bill.id}`,
        order_id: bill.order_id,
        customer_phone: bill.customer_phone || 'N/A',
        total_amount: bill.total_amount,
        status: bill.status || 'completed',
        created_at: bill.created_at || bill.created_at,
        items_count: 0
      }));

      // Combine and sort by date (newest first)
      const combined = [...orderTransactions, ...billTransactions].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(combined);
      setCurrentPage(1); // Reset to first page
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load transactions');
      console.error('Transactions error:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(transactions.length / ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const currentTransactions = transactions.slice(startIndex, endIndex);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
  };

  if (loading) {
    return <div className="text-center py-8">Loading transactions...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Today's Transactions</h2>
        <button
          onClick={fetchTodayTransactions}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No transactions today
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Time</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Items</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {currentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">
                      {formatTime(transaction.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded text-xs font-semibold ${
                        transaction.id.startsWith('order')
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {transaction.id.startsWith('order') ? 'Order' : 'Bill'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-mono text-xs">
                      {transaction.order_id?.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {transaction.customer_phone}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-900">
                      {transaction.items_count > 0 ? transaction.items_count : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      ₹{(transaction.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded text-xs font-semibold ${
                        transaction.status === 'paid' || transaction.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : transaction.status === 'held'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.status === 'completed' ? 'Paid' : transaction.status === 'held' ? 'Held' : 'Paid'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, transactions.length)} of {transactions.length} transactions
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded text-sm font-medium ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'border hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
