import React, { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import DashboardOverview from '@/components/DashboardOverview'
import ReportsView from '@/components/ReportsView'
import HeldBillsView from '@/components/HeldBillsView'
import InventoryView from '@/components/InventoryView'
import SettingsView from '@/components/SettingsView'
import MenuManagement from '@/pages/AdminPanel/MenuManagement'

/**
 * AdminPanel Component
 * Admin interface for menu management, reporting, and bill management
 *
 * TODO: Implement:
 * - Menu management (add/edit/delete products)
 * - Full bill history & editing
 */
export default function AdminPanel() {
  const location = useLocation()
  const activeTab = useMemo(() => {
    return new URLSearchParams(location.search).get('tab') || 'dashboard'
  }, [location.search])

  return (
    <div className="flex-1 p-8 bg-gray-100 overflow-auto">
        {activeTab === 'dashboard' && (
          <DashboardOverview />
        )}

        {activeTab === 'menu' && (
          <MenuManagement />
        )}

        {activeTab === 'reports' && (
          <ReportsView />
        )}

        {activeTab === 'bills' && (
          <HeldBillsView />
        )}

        {activeTab === 'inventory' && (
          <InventoryView />
        )}

        {activeTab === 'customers' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-3xl font-bold mb-6">Customers</h1>
            <p className="text-gray-600">Customer analytics and history</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <SettingsView />
        )}
    </div>
  )
}
