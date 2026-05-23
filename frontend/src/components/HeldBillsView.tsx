import React, { useState, useEffect } from 'react'
import { api } from '@/services/api'

interface HeldBill {
  id: string
  bill_number: string
  customer_id: string
  total_amount: number
  payment_method: string
  status: string
  hold_id: string
  reason: string
  held_at: string
  notes: string
}

interface BillHold {
  id: string
  bill_id: string
  reason: string
  held_at: string
  resumed_at: string | null
  notes: string
}

export default function HeldBillsView() {
  const [heldBills, setHeldBills] = useState<HeldBill[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null)
  const [holdHistory, setHoldHistory] = useState<BillHold[]>([])
  const [showHoldDialog, setShowHoldDialog] = useState(false)
  const [holdReason, setHoldReason] = useState('')
  const [holdNotes, setHoldNotes] = useState('')
  const [billToHold, setBillToHold] = useState<string | null>(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)

  useEffect(() => {
    fetchHeldBills()
  }, [])

  const fetchHeldBills = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getHeldBills(50, 0)
      setHeldBills(data.data.bills || [])
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load held bills')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchBillHistory = async (billId: string) => {
    try {
      const data = await api.getBillHolds(billId)
      setHoldHistory(data.data.holds || [])
    } catch (err: any) {
      console.error('Error fetching history:', err)
    }
  }

  const handleResumeBill = async (billId: string) => {
    if (!window.confirm('Resume this held bill?')) return

    try {
      setLoading(true)
      setError(null)
      await api.resumeBill(billId)
      // Refresh list
      await fetchHeldBills()
      setSelectedBillId(null)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resume bill')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleHoldBill = async () => {
    if (!billToHold || !holdReason.trim()) {
      alert('Please select a bill and provide a reason')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await api.holdBill(billToHold, holdReason.trim(), holdNotes.trim() || undefined)
      // Reset form
      setShowHoldDialog(false)
      setHoldReason('')
      setHoldNotes('')
      setBillToHold(null)
      // Refresh list
      await fetchHeldBills()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to hold bill')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const openHistoryModal = (billId: string) => {
    setSelectedBillId(billId)
    fetchBillHistory(billId)
    setShowHistoryModal(true)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Held Bills Management</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowHoldDialog(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
        >
          Hold a Bill
        </button>
        <button
          onClick={fetchHeldBills}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
        >
          Refresh
        </button>
      </div>

      {/* Hold Dialog */}
      {showHoldDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Hold a Bill</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Search Bill Number or Amount
                </label>
                <input
                  type="text"
                  placeholder="e.g., B000001 or search amount"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  onChange={(e) => {
                    const searchTerm = e.target.value.toLowerCase()
                    const found = heldBills.length === 0
                      ? null // In real app, would search from all bills
                      : null
                    // For now, user manually selects
                  }}
                />
                <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg">
                  {/* List available bills to hold */}
                  <div className="text-sm text-gray-600 p-2">
                    Select from pending or printed bills (not yet implemented - use Bill ID below)
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bill ID
                </label>
                <input
                  type="text"
                  placeholder="Enter bill ID"
                  value={billToHold || ''}
                  onChange={(e) => setBillToHold(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason for Hold *
                </label>
                <textarea
                  placeholder="e.g., Payment pending, Customer not ready, Modification requested"
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 h-24"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  placeholder="Optional notes"
                  value={holdNotes}
                  onChange={(e) => setHoldNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 h-20"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleHoldBill}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50"
              >
                {loading ? 'Holding...' : 'Hold Bill'}
              </button>
              <button
                onClick={() => {
                  setShowHoldDialog(false)
                  setHoldReason('')
                  setHoldNotes('')
                  setBillToHold(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Held Bills List */}
      {loading && !showHoldDialog ? (
        <div className="text-center py-8 text-gray-600">Loading held bills...</div>
      ) : heldBills.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-gray-600">No bills are currently on hold</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Bill Number</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Payment</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Hold Reason</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Held At</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {heldBills.map((bill, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {bill.bill_number}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      ₹{bill.total_amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">
                      {bill.payment_method || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="inline-block max-w-xs truncate" title={bill.reason}>
                        {bill.reason}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(bill.held_at).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center space-x-2">
                      <button
                        onClick={() => openHistoryModal(bill.id)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-semibold"
                      >
                        History
                      </button>
                      <button
                        onClick={() => handleResumeBill(bill.id)}
                        disabled={loading}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm font-semibold disabled:opacity-50"
                      >
                        Resume
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hold History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Hold History</h2>

            {holdHistory.length === 0 ? (
              <p className="text-gray-600">No hold history found</p>
            ) : (
              <div className="space-y-4">
                {holdHistory.map((hold, idx) => (
                  <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Reason</p>
                        <p className="font-semibold text-gray-900">{hold.reason}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Held At</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(hold.held_at).toLocaleString('en-IN')}
                        </p>
                      </div>
                      {hold.notes && (
                        <div className="col-span-2">
                          <p className="text-gray-600">Notes</p>
                          <p className="text-gray-900">{hold.notes}</p>
                        </div>
                      )}
                      {hold.resumed_at && (
                        <div className="col-span-2">
                          <p className="text-gray-600">Resumed At</p>
                          <p className="font-semibold text-green-600">
                            {new Date(hold.resumed_at).toLocaleString('en-IN')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowHistoryModal(false)}
              className="mt-6 w-full px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
