import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, ShoppingCart, BarChart3, Settings, LogOut, ChevronRight, ChevronDown } from 'lucide-react'

interface SidebarProps {
  user?: any
  onLogout: () => void
}

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  // Initialize from localStorage, persist to localStorage
  const [expandedMenu, setExpandedMenu] = useState<string | null>(() => {
    return localStorage.getItem('sidebarExpandedMenu') || null
  })

  // Auto-expand Admin Panel when on admin routes
  useEffect(() => {
    if (location.pathname.startsWith('/admin')) {
      setExpandedMenu('/admin')
    }
  }, [location.pathname])

  // Persist expanded menu state to localStorage
  useEffect(() => {
    if (expandedMenu) {
      localStorage.setItem('sidebarExpandedMenu', expandedMenu)
    } else {
      localStorage.removeItem('sidebarExpandedMenu')
    }
  }, [expandedMenu])

  // Debug logging
  console.log('Sidebar - User object:', user)
  console.log('Sidebar - User role:', user?.role)

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const handleNavigation = (path: string) => {
    navigate(path)
  }

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      onLogout()
      navigate('/login')
    }
  }

  const menuItems = [
    {
      label: 'Home',
      icon: Home,
      path: '/',
      roles: ['operator', 'manager', 'admin']
    },
    {
      label: 'Teller Screen',
      icon: ShoppingCart,
      path: '/teller',
      roles: ['operator', 'manager', 'admin']
    },
    {
      label: 'Admin Panel',
      icon: BarChart3,
      path: '/admin',
      roles: ['admin', 'manager'],
      submenu: [
        { label: 'Dashboard', id: 'dashboard' },
        { label: 'Menu Management', id: 'menu' },
        { label: 'Reports', id: 'reports' },
        { label: 'Bills', id: 'bills' },
        { label: 'Inventory', id: 'inventory' },
        { label: 'Customers', id: 'customers' },
        { label: 'Settings', id: 'settings' }
      ]
    }
  ]

  // Filter menu items based on user role
  const visibleMenuItems = menuItems.filter(item =>
    !item.roles || item.roles.includes(user?.role || 'operator')
  )

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-screen shadow-lg">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-3xl">🍗</div>
          <div>
            <h1 className="text-lg font-bold">Bao to the Wings</h1>
            <p className="text-xs text-gray-400">POS System</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className="px-6 py-4 border-b border-gray-800 bg-gray-800 bg-opacity-50">
          <p className="text-sm font-medium text-gray-200">{user.username}</p>
          <p className="text-xs text-gray-400 capitalize">{user.role || 'User'}</p>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
        {visibleMenuItems.map((item: any) => {
          const Icon = item.icon
          const active = isActive(item.path)
          const hasSubmenu = item.submenu && item.submenu.length > 0
          const isExpanded = expandedMenu === item.path

          return (
            <div key={item.path}>
              <button
                onClick={() => {
                  if (hasSubmenu) {
                    setExpandedMenu(isExpanded ? null : item.path)
                  }
                  handleNavigation(item.path)
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition duration-200 ${
                  active
                    ? 'bg-red-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
                {active && <ChevronRight className="w-4 h-4" />}
                {hasSubmenu && (
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      isExpanded ? 'transform rotate-180' : ''
                    }`}
                  />
                )}
              </button>

              {/* Submenu */}
              {hasSubmenu && isExpanded && (
                <div className="pl-6 mt-2 space-y-1">
                  {item.submenu.map((subitem: any) => (
                    <button
                      key={subitem.id}
                      onClick={() => {
                        navigate(`${item.path}?tab=${subitem.id}`)
                      }}
                      className={`w-full text-left px-4 py-2 rounded text-sm transition duration-200 ${
                        location.pathname === item.path &&
                        new URLSearchParams(location.search).get('tab') === subitem.id
                          ? 'bg-red-600 text-white'
                          : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      {subitem.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-800 p-3 space-y-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-500 text-center">
        <p>© 2026 Cilunaire Firang</p>
        <p>v1.0</p>
      </div>
    </div>
  )
}
