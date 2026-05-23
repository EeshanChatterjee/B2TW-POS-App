import React, { useState, useEffect } from 'react'
import { api } from '@/services/api'
import { AlertCircle, Check, X, Plus, Edit2, Trash2 } from 'lucide-react'

interface Setting {
  setting_key: string
  setting_value: any
  setting_type: string
  category: string
  description?: string
}

interface StaffMember {
  id: string
  username: string
  full_name: string
  email: string
  role: string
  is_active: boolean
  phone?: string
  hire_date?: string
}

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState('inventory')
  const [settings, setSettings] = useState<Setting[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showAddStaffModal, setShowAddStaffModal] = useState(false)
  const [showEditStaffModal, setShowEditStaffModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [newStaff, setNewStaff] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    role: 'operator',
    phone: '',
    address: '',
    hire_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    loadSettings()
    loadStaffMembers()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await api.getSettings()
      setSettings(data.data || [])
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const loadStaffMembers = async () => {
    try {
      const data = await api.getStaffList()
      setStaffMembers(data.data || [])
    } catch (err: any) {
      console.error('Failed to load staff:', err)
    }
  }

  const handleUpdateSetting = async (key: string, newValue: any) => {
    try {
      setLoading(true)
      await api.updateSetting(key, newValue)

      setSettings(settings.map(s =>
        s.setting_key === key ? { ...s, setting_value: newValue } : s
      ))

      setSuccessMessage('Setting updated successfully')
      setEditingKey(null)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update setting')
    } finally {
      setLoading(false)
    }
  }

  const handleInitializeSettings = async () => {
    if (confirm('This will initialize all default settings. Continue?')) {
      try {
        setLoading(true)
        await api.initializeSettings()
        await loadSettings()
        setSuccessMessage('Settings initialized successfully')
        setTimeout(() => setSuccessMessage(''), 3000)
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to initialize settings')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleAddStaff = async () => {
    if (!newStaff.username || !newStaff.password) {
      setError('Username and password are required')
      return
    }

    try {
      setLoading(true)
      await api.createStaff(newStaff)
      await loadStaffMembers()
      setShowAddStaffModal(false)
      setNewStaff({
        username: '',
        password: '',
        full_name: '',
        email: '',
        role: 'operator',
        phone: '',
        address: '',
        hire_date: new Date().toISOString().split('T')[0]
      })
      setSuccessMessage('Staff member added successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add staff member')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStaff = async () => {
    if (!selectedStaff) return

    try {
      setLoading(true)
      await api.updateStaff(selectedStaff.id, selectedStaff)
      await loadStaffMembers()
      setShowEditStaffModal(false)
      setSelectedStaff(null)
      setSuccessMessage('Staff member updated successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update staff member')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteStaff = async (id: string) => {
    if (confirm('Are you sure you want to deactivate this staff member?')) {
      try {
        setLoading(true)
        await api.deleteStaff(id)
        await loadStaffMembers()
        setSuccessMessage('Staff member deactivated successfully')
        setTimeout(() => setSuccessMessage(''), 3000)
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete staff member')
      } finally {
        setLoading(false)
      }
    }
  }

  const getSettingsByCategory = (category: string) => {
    return settings.filter(s => s.category === category)
  }

  const renderSettingInput = (setting: Setting) => {
    const isEditing = editingKey === setting.setting_key
    const value = isEditing ? editValue : setting.setting_value

    switch (setting.setting_type) {
      case 'boolean':
        return (
          <div className="flex items-center gap-4">
            <select
              value={value ? '1' : '0'}
              onChange={(e) => isEditing ? setEditValue(e.target.value === '1') : handleUpdateSetting(setting.setting_key, e.target.value === '1')}
              disabled={loading || !isEditing}
              className="px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="1">Enabled</option>
              <option value="0">Disabled</option>
            </select>
          </div>
        )
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => isEditing ? setEditValue(e.target.value) : handleUpdateSetting(setting.setting_key, parseFloat(e.target.value))}
            disabled={loading || !isEditing}
            className="px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 w-32"
          />
        )
      case 'json':
        return (
          <textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => isEditing ? setEditValue(e.target.value) : {}}
            disabled={loading || !isEditing}
            rows={3}
            className="px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 w-full font-mono text-sm"
          />
        )
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => isEditing ? setEditValue(e.target.value) : handleUpdateSetting(setting.setting_key, e.target.value)}
            disabled={loading || !isEditing}
            className="px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 w-64"
          />
        )
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Settings & Configuration</h1>
        <button
          onClick={handleInitializeSettings}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 text-sm"
        >
          Initialize Defaults
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded flex items-start gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b overflow-x-auto">
        {[
          { id: 'inventory', label: 'Inventory' },
          { id: 'payment', label: 'Payment Methods' },
          { id: 'printer', label: 'Printer' },
          { id: 'tax', label: 'Tax' },
          { id: 'business', label: 'Business' },
          { id: 'general', label: 'Discounts & Receipt' },
          { id: 'staff', label: 'Staff Management' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-red-600 border-b-2 border-red-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading && (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      )}

      {!loading && (
        <>
          {/* Inventory Settings */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Inventory Settings</h2>
              {getSettingsByCategory('inventory').map(setting => (
                <div key={setting.setting_key} className="flex items-center justify-between p-4 bg-gray-50 rounded">
                  <div className="flex-1">
                    <p className="font-medium">{setting.setting_key.replace(/_/g, ' ').toUpperCase()}</p>
                    <p className="text-sm text-gray-600">{setting.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderSettingInput(setting)}
                    {editingKey === setting.setting_key && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateSetting(setting.setting_key, editValue)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingKey(null)}
                          className="px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {editingKey !== setting.setting_key && (
                      <button
                        onClick={() => {
                          setEditingKey(setting.setting_key)
                          setEditValue(setting.setting_value)
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payment Settings */}
          {activeTab === 'payment' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Payment Methods</h2>
              {getSettingsByCategory('payment').map(setting => (
                <div key={setting.setting_key} className="flex items-center justify-between p-4 bg-gray-50 rounded">
                  <div className="flex-1">
                    <p className="font-medium">{setting.setting_key.replace(/_/g, ' ').toUpperCase()}</p>
                    <p className="text-sm text-gray-600">{setting.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderSettingInput(setting)}
                    {editingKey === setting.setting_key && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateSetting(setting.setting_key, editValue)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingKey(null)}
                          className="px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {editingKey !== setting.setting_key && (
                      <button
                        onClick={() => {
                          setEditingKey(setting.setting_key)
                          setEditValue(setting.setting_value)
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Printer Settings */}
          {activeTab === 'printer' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Printer Configuration</h2>
              {getSettingsByCategory('printer').map(setting => (
                <div key={setting.setting_key} className="flex items-center justify-between p-4 bg-gray-50 rounded">
                  <div className="flex-1">
                    <p className="font-medium">{setting.setting_key.replace(/_/g, ' ').toUpperCase()}</p>
                    <p className="text-sm text-gray-600">{setting.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderSettingInput(setting)}
                    {editingKey === setting.setting_key && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateSetting(setting.setting_key, editValue)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingKey(null)}
                          className="px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {editingKey !== setting.setting_key && (
                      <button
                        onClick={() => {
                          setEditingKey(setting.setting_key)
                          setEditValue(setting.setting_value)
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tax Settings */}
          {activeTab === 'tax' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Tax Settings</h2>
              {getSettingsByCategory('tax').map(setting => (
                <div key={setting.setting_key} className="flex items-center justify-between p-4 bg-gray-50 rounded">
                  <div className="flex-1">
                    <p className="font-medium">{setting.setting_key.replace(/_/g, ' ').toUpperCase()}</p>
                    <p className="text-sm text-gray-600">{setting.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderSettingInput(setting)}
                    {editingKey === setting.setting_key && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateSetting(setting.setting_key, editValue)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingKey(null)}
                          className="px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {editingKey !== setting.setting_key && (
                      <button
                        onClick={() => {
                          setEditingKey(setting.setting_key)
                          setEditValue(setting.setting_value)
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Business Settings */}
          {activeTab === 'business' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Business Information</h2>
              {getSettingsByCategory('business').map(setting => (
                <div key={setting.setting_key} className="flex items-center justify-between p-4 bg-gray-50 rounded">
                  <div className="flex-1">
                    <p className="font-medium">{setting.setting_key.replace(/_/g, ' ').toUpperCase()}</p>
                    <p className="text-sm text-gray-600">{setting.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderSettingInput(setting)}
                    {editingKey === setting.setting_key && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateSetting(setting.setting_key, editValue)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingKey(null)}
                          className="px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {editingKey !== setting.setting_key && (
                      <button
                        onClick={() => {
                          setEditingKey(setting.setting_key)
                          setEditValue(setting.setting_value)
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Discounts & Receipt Settings */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Discounts & Receipt Settings</h2>
              {getSettingsByCategory('general').map(setting => (
                <div key={setting.setting_key} className="flex items-center justify-between p-4 bg-gray-50 rounded">
                  <div className="flex-1">
                    <p className="font-medium">{setting.setting_key.replace(/_/g, ' ').toUpperCase()}</p>
                    <p className="text-sm text-gray-600">{setting.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderSettingInput(setting)}
                    {editingKey === setting.setting_key && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateSetting(setting.setting_key, editValue)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingKey(null)}
                          className="px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {editingKey !== setting.setting_key && (
                      <button
                        onClick={() => {
                          setEditingKey(setting.setting_key)
                          setEditValue(setting.setting_value)
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Staff Management */}
          {activeTab === 'staff' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Staff Members</h2>
                <button
                  onClick={() => setShowAddStaffModal(true)}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Staff
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Username</th>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2 text-left">Role</th>
                      <th className="px-4 py-2 text-left">Phone</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffMembers.map(staff => (
                      <tr key={staff.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">{staff.username}</td>
                        <td className="px-4 py-2">{staff.full_name || '-'}</td>
                        <td className="px-4 py-2">{staff.email || '-'}</td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {staff.role}
                          </span>
                        </td>
                        <td className="px-4 py-2">{staff.phone || '-'}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            staff.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                          >
                            {staff.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => {
                              setSelectedStaff(staff)
                              setShowEditStaffModal(true)
                            }}
                            disabled={loading}
                            className="inline-flex items-center gap-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(staff.id)}
                            disabled={loading}
                            className="inline-flex items-center gap-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Staff Member</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Username"
                value={newStaff.username}
                onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <input
                type="password"
                placeholder="Password"
                value={newStaff.password}
                onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <input
                type="text"
                placeholder="Full Name"
                value={newStaff.full_name}
                onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <input
                type="email"
                placeholder="Email"
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={newStaff.phone}
                onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <select
                value={newStaff.role}
                onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="operator">Operator</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <input
                type="date"
                value={newStaff.hire_date}
                onChange={(e) => setNewStaff({ ...newStaff, hire_date: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddStaff}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                Add Staff
              </button>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="flex-1 px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditStaffModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Staff Member</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Full Name"
                value={selectedStaff.full_name}
                onChange={(e) => setSelectedStaff({ ...selectedStaff, full_name: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <input
                type="email"
                placeholder="Email"
                value={selectedStaff.email}
                onChange={(e) => setSelectedStaff({ ...selectedStaff, email: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={selectedStaff.phone || ''}
                onChange={(e) => setSelectedStaff({ ...selectedStaff, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <select
                value={selectedStaff.role}
                onChange={(e) => setSelectedStaff({ ...selectedStaff, role: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="operator">Operator</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <select
                value={selectedStaff.is_active ? '1' : '0'}
                onChange={(e) => setSelectedStaff({ ...selectedStaff, is_active: e.target.value === '1' })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateStaff}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                Update
              </button>
              <button
                onClick={() => setShowEditStaffModal(false)}
                className="flex-1 px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
