import React, { useState, useEffect } from 'react'
import { api } from '@/services/api'
import { ChevronDown, ChevronUp, Plus, Trash2, Eye, EyeOff } from 'lucide-react'

interface Product {
  id: number
  name: string
  category: string
  price: number
  position: number
  veg_type: 'veg' | 'non_veg' | 'not_applicable'
  is_active: boolean
  is_beverage: boolean
}

interface CategorySection {
  id: string
  name: string
  position: number
  products: Product[]
}

interface EditingState {
  productId: number | null
  field: 'name' | 'price'
  value: string
}

interface DragState {
  draggedItem: Product | null
  draggedItemIndex: number | null
  draggedFromCategory: string | null
}

const MenuManagement: React.FC = () => {
  const [categories, setCategories] = useState<CategorySection[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [dragState, setDragState] = useState<DragState>({
    draggedItem: null,
    draggedItemIndex: null,
    draggedFromCategory: null,
  })
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    price: '',
    veg_type: 'not_applicable' as 'veg' | 'non_veg' | 'not_applicable',
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modifiedItems, setModifiedItems] = useState<Set<number>>(new Set())
  const [modifiedCategories, setModifiedCategories] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Fetch all products and organize by category
  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await api.getProducts()
      console.log('Raw API Response:', response)
      console.log('Response structure:', {
        isArray: Array.isArray(response),
        hasData: !!response?.data,
        hasProducts: !!response?.data?.products,
        dataIsArray: Array.isArray(response?.data),
      })

      // Handle different response structures
      // The API wraps responses as { success: true, data: { count, products } }
      let products: Product[] = []
      if (Array.isArray(response)) {
        products = response
      } else if (response?.data?.products && Array.isArray(response.data.products)) {
        products = response.data.products
      } else if (response?.products && Array.isArray(response.products)) {
        products = response.products
      } else if (Array.isArray(response?.data)) {
        products = response.data
      }

      console.log('Extracted products:', products)
      console.log('Sample product IDs:', products.slice(0, 3).map((p: any) => ({ name: p.name, id: p.id })))
      console.log('Products with null IDs:', products.filter((p: any) => p.id == null).map((p: any) => ({ name: p.name, category: p.category })))

      // Ensure products is an array
      if (!Array.isArray(products)) {
        console.error('Products is not an array:', typeof products, products)
        setError('Failed to parse menu items from server')
        setLoading(false)
        return
      }

      // Fetch categories with their IDs and positions
      const categoriesResponse = await api.getCategories()
      const categoryMap: { [key: string]: { id: string; position: number } } = {}

      // Handle both response structures (wrapped in .data or direct)
      const categoryDetails = categoriesResponse?.data?.categoryDetails || categoriesResponse?.categoryDetails

      if (categoryDetails && Array.isArray(categoryDetails)) {
        categoryDetails.forEach((cat: any) => {
          categoryMap[cat.name] = { id: cat.id, position: cat.position }
        })
      }

      // Group by category and sort by position within each category
      const grouped: { [key: string]: Product[] } = {}
      products.forEach((product: Product) => {
        const category = product.category || 'Uncategorized'
        if (!grouped[category]) {
          grouped[category] = []
        }
        grouped[category].push(product)
      })

      // Sort products within each category by position
      Object.keys(grouped).forEach((category) => {
        grouped[category].sort((a, b) => (a.position || 0) - (b.position || 0))
      })

      // Convert to CategorySection array, sorted by position from database
      const categorySections: CategorySection[] = Object.entries(grouped)
        .map(([name, products]) => {
          const catInfo = categoryMap[name] || { id: `cat-${name}`, position: 999 }
          return {
            id: catInfo.id,
            name,
            position: catInfo.position,
            products,
          }
        })
        .sort((a, b) => a.position - b.position)

      setCategories(categorySections)
      // Expand all categories by default
      setExpandedCategories(new Set(categorySections.map((c) => c.name)))
    } catch (err) {
      setError('Failed to load menu items')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Save all modified items to the database
  const saveModifiedItems = async () => {
    if (modifiedItems.size === 0 && !modifiedCategories) {
      console.log('No modified items or categories to save')
      return
    }

    console.log(`Saving ${modifiedItems.size} modified items and ${modifiedCategories ? '1 category reorder' : '0 category reorders'}...`)
    setIsSaving(true)
    try {
      // Save category reorder if modified
      if (modifiedCategories) {
        try {
          const categoryUpdates = categories.map((cat, index) => ({
            id: cat.id,
            position: index,
          }))
          await api.batchReorderCategories(categoryUpdates)
          setModifiedCategories(false)
        } catch (catErr) {
          console.error('Failed to update category order:', catErr)
        }
      }

      // Collect all modified items from categories and build position updates
      const itemsToSave: any[] = []
      const positionUpdates: Array<{ id: string; position: number }> = []

      let globalPosition = 0
      categories.forEach((category) => {
        category.products.forEach((product) => {
          // Update position for all items (since order may have changed)
          if (product.position !== globalPosition) {
            positionUpdates.push({ id: String(product.id), position: globalPosition })
          }

          // Collect items that need field updates
          if (modifiedItems.has(product.id)) {
            itemsToSave.push(product)
          }

          globalPosition++
        })
      })

      console.log('Items to save:', itemsToSave)
      console.log('Position updates:', positionUpdates)

      // Batch update positions if any have changed
      if (positionUpdates.length > 0) {
        try {
          await api.batchReorderProducts(positionUpdates)
          console.log(`✅ Updated ${positionUpdates.length} item positions`)
        } catch (posErr) {
          console.error('Failed to update positions:', posErr)
        }
      }

      // Save each modified item's other fields
      let savedCount = 0
      for (const item of itemsToSave) {
        try {
          await api.updateProduct(String(item.id), {
            name: item.name,
            category: item.category,
            price: item.price,
            is_active: item.is_active,
            veg_type: item.veg_type,
          })
          savedCount++
        } catch (itemErr) {
          console.error(`Failed to save item ${item.id}:`, itemErr)
        }
      }

      console.log(`✅ Saved ${savedCount}/${itemsToSave.length} field changes`)
      setModifiedItems(new Set())
    } catch (err) {
      console.error('Failed to save changes:', err)
      setError('Failed to auto-save changes')
    } finally {
      setIsSaving(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchProducts()
  }, [])

  // Auto-save every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (modifiedItems.size > 0 || modifiedCategories) {
        console.log('Auto-save triggered...')
        saveModifiedItems()
      }
    }, 60000) // 60 seconds

    return () => clearInterval(interval)
  }, [modifiedItems, modifiedCategories, categories])

  // Save before navigation away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (modifiedItems.size > 0 || modifiedCategories) {
        e.preventDefault()
        e.returnValue = ''

        // Trigger save - note: this is async but we show the warning
        console.warn(`⚠️ Unsaved changes detected: ${modifiedItems.size} items, ${modifiedCategories ? '1 category reorder' : '0 category reorders'}`)
        saveModifiedItems()

        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [modifiedItems, modifiedCategories, categories])

  const calculatePrices = (price: number) => ({
    preTax: price.toFixed(2),
    postTax: (price * 1.05).toFixed(2),
  })

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName)
    } else {
      newExpanded.add(categoryName)
    }
    setExpandedCategories(newExpanded)
  }

  const handleDragStart = (e: React.DragEvent, product: Product, fromCategory: string, index: number) => {
    setDragState({
      draggedItem: product,
      draggedItemIndex: index,
      draggedFromCategory: fromCategory,
    })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDropOnCategory = async (e: React.DragEvent, targetCategory: string) => {
    e.preventDefault()
    if (!dragState.draggedItem || !dragState.draggedFromCategory) return

    // If moving to a different category, update the product
    if (dragState.draggedFromCategory !== targetCategory) {
      try {
        // Update local state
        const newCategories = categories.map((cat) => {
          if (cat.name === dragState.draggedFromCategory) {
            return {
              ...cat,
              products: cat.products.filter((p) => p.id !== dragState.draggedItem!.id),
            }
          }
          if (cat.name === targetCategory) {
            return {
              ...cat,
              products: [...cat.products, dragState.draggedItem],
            }
          }
          return cat
        })

        setCategories(newCategories)

        // Mark item as modified for auto-save
        setModifiedItems((prev) => new Set([...prev, dragState.draggedItem!.id]))
      } catch (err) {
        setError('Failed to move item')
        console.error(err)
      }
    }

    setDragState({ draggedItem: null, draggedItemIndex: null, draggedFromCategory: null })
  }

  const handleDropOnProduct = async (e: React.DragEvent, targetProduct: Product, targetCategory: string, targetIndex: number) => {
    e.preventDefault()
    if (!dragState.draggedItem || !dragState.draggedFromCategory) return

    // Only reorder within the same category for now
    if (dragState.draggedFromCategory !== targetCategory) {
      handleDropOnCategory(e, targetCategory)
      return
    }

    // Reorder items within same category
    if (dragState.draggedItemIndex === null || dragState.draggedItemIndex === targetIndex) {
      setDragState({ draggedItem: null, draggedItemIndex: null, draggedFromCategory: null })
      return
    }

    const newCategories = categories.map((cat) => {
      if (cat.name === dragState.draggedFromCategory) {
        const newProducts = [...cat.products]
        const draggedProduct = newProducts[dragState.draggedItemIndex!]
        newProducts.splice(dragState.draggedItemIndex!, 1)
        newProducts.splice(targetIndex, 0, draggedProduct)
        return { ...cat, products: newProducts }
      }
      return cat
    })

    setCategories(newCategories)

    // Mark the dragged item as modified (position changed)
    setModifiedItems((prev) => new Set([...prev, dragState.draggedItem!.id]))

    setDragState({ draggedItem: null, draggedItemIndex: null, draggedFromCategory: null })
  }

  const handleReorderProduct = async (categoryName: string, productId: number, direction: 'up' | 'down') => {
    const categoryIndex = categories.findIndex((c) => c.name === categoryName)
    if (categoryIndex === -1) return

    const products = categories[categoryIndex].products
    const productIndex = products.findIndex((p) => p.id === productId)
    if (productIndex === -1) return

    // Check boundaries
    if ((direction === 'up' && productIndex === 0) || (direction === 'down' && productIndex === products.length - 1)) {
      return
    }

    // Swap positions
    const newCategories = [...categories]
    const newProducts = [...products]
    const swapIndex = direction === 'up' ? productIndex - 1 : productIndex + 1
    ;[newProducts[productIndex], newProducts[swapIndex]] = [newProducts[swapIndex], newProducts[productIndex]]

    newCategories[categoryIndex] = { ...newCategories[categoryIndex], products: newProducts }
    setCategories(newCategories)

    // Mark both items as modified
    setModifiedItems((prev) => new Set([...prev, productId, newProducts[swapIndex].id]))
  }

  const handleReorderCategory = async (categoryName: string, direction: 'up' | 'down') => {
    const categoryIndex = categories.findIndex((c) => c.name === categoryName)
    if (categoryIndex === -1) return

    // Check boundaries
    if ((direction === 'up' && categoryIndex === 0) || (direction === 'down' && categoryIndex === categories.length - 1)) {
      return
    }

    // Swap positions
    const newCategories = [...categories]
    const swapIndex = direction === 'up' ? categoryIndex - 1 : categoryIndex + 1
    ;[newCategories[categoryIndex], newCategories[swapIndex]] = [newCategories[swapIndex], newCategories[categoryIndex]]

    setCategories(newCategories)
    setModifiedCategories(true)
  }

  const handleEditStart = (productId: number, field: 'name' | 'price', currentValue: string | number) => {
    setEditing({
      productId,
      field,
      value: String(currentValue),
    })
  }

  const handleEditSave = async () => {
    if (!editing) return

    try {
      const updateData = {
        [editing.field]: editing.field === 'price' ? parseFloat(editing.value) : editing.value,
      }

      // Update local state immediately for responsiveness
      const newCategories = categories.map((cat) => ({
        ...cat,
        products: cat.products.map((p) => (p.id === editing.productId ? { ...p, ...updateData } : p)),
      }))

      setCategories(newCategories)

      // Mark item as modified for auto-save
      setModifiedItems((prev) => new Set([...prev, editing.productId]))

      setEditing(null)
    } catch (err) {
      setError('Failed to save changes')
      console.error(err)
    }
  }

  const handleToggleAvailability = async (productId: number, currentStatus: boolean) => {
    try {
      // Update local state immediately
      const newCategories = categories.map((cat) => ({
        ...cat,
        products: cat.products.map((p) => (p.id === productId ? { ...p, is_active: !currentStatus } : p)),
      }))

      setCategories(newCategories)

      // Mark item as modified for auto-save
      setModifiedItems((prev) => new Set([...prev, productId]))
    } catch (err) {
      setError('Failed to update availability')
      console.error(err)
    }
  }

  const handleDeleteItem = async (productId: number | null, product?: Product, category?: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return

    try {
      // If productId is null, delete by name and category
      // Otherwise, make API call to delete from database using ID
      if (productId !== null && productId !== undefined) {
        console.log(`Deleting product with ID: ${productId}`)
        const response = await api.deleteProduct(String(productId))
        console.log('Delete response:', response)
      } else if (product && category) {
        console.log(`Deleting corrupted item by name and category: ${product.name} in ${category}`)
        await api.deleteProduct('null', { name: product.name, category })
      } else {
        console.log('Cannot delete: missing product information')
        setError('Cannot delete: missing product information')
        return
      }

      // Update local state
      const newCategories = categories
        .map((cat) => ({
          ...cat,
          products: cat.products.filter((p) => p.id !== productId),
        }))
        .filter((cat) => cat.products.length > 0)

      setCategories(newCategories)
      setError(null)
      console.log('Item deleted successfully')
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error?.message || err?.message || 'Failed to delete item'
      setError(`Delete failed: ${errorMessage}`)
      console.error('Delete error:', err)
    }
  }

  const handleAddItem = async (closeModal: boolean = true) => {
    if (!newItem.name || !newItem.category || !newItem.price) {
      setError('Please fill in all fields')
      return
    }

    try {
      // Convert post-tax price to pre-tax price
      // The input is post-tax (with 5% tax already included)
      // preTax = postTax / 1.05
      const postTaxPrice = parseFloat(newItem.price)
      const preTaxPrice = Math.round((postTaxPrice / 1.05) * 100) / 100 // Round to 2 decimal places

      // Calculate position as the end of the category
      // Use Math.max of existing positions + 1 (not just length, in case items were deleted/reordered)
      const categoryIndex = categories.findIndex(c => c.name === newItem.category)
      let position = 0
      if (categoryIndex >= 0 && categories[categoryIndex].products.length > 0) {
        const maxPosition = Math.max(...categories[categoryIndex].products.map(p => p.position || 0))
        position = maxPosition + 1
      }

      const response = await api.createProduct({
        name: newItem.name,
        category: newItem.category,
        price: preTaxPrice,
        is_active: true,
        is_beverage: false,
        veg_type: newItem.veg_type,
        position: position,
      })

      // Construct the product object from the response and input data
      // The API wraps the response as { success: true, data: { id, message } }
      console.log('Create product response:', response)
      console.log('Response structure check - response.data:', response?.data)
      console.log('Response structure check - response.data.id:', response?.data?.id)

      const productId = response?.data?.id || response?.id || null
      if (!productId) {
        console.error('ERROR: Could not extract product ID from response:', response)
        setError('Product created but ID not returned from server. Try reloading.')
        return
      }
      console.log('Using product ID:', productId)

      const newProduct: Product = {
        id: productId,
        name: newItem.name,
        category: newItem.category,
        price: preTaxPrice,
        is_active: true,
        is_beverage: false,
        veg_type: newItem.veg_type,
        position: position,
      }

      // Update categories
      const newCategories = categories.map((cat) => {
        if (cat.name === newItem.category) {
          return { ...cat, products: [...cat.products, newProduct] }
        }
        return cat
      })

      // If category doesn't exist, create it
      if (!newCategories.some((c) => c.name === newItem.category)) {
        newCategories.push({
          name: newItem.category,
          products: [newProduct],
        })
        setExpandedCategories((prev) => new Set([...prev, newItem.category]))
      }

      setCategories(newCategories)
      setNewItem({ name: '', category: '', price: '', veg_type: 'not_applicable' })
      setError(null)

      if (closeModal) {
        setIsAddModalOpen(false)
      }
    } catch (err) {
      setError('Failed to add item')
      console.error(err)
    }
  }

  if (loading) {
    return <div className="p-6 text-center">Loading menu items...</div>
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Menu Management</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
          >
            <Plus size={18} /> Add Menu Item
          </button>
          {(modifiedItems.size > 0 || modifiedCategories) && (
            <div className="flex items-center gap-2 text-sm">
              <div className={`px-3 py-1 rounded ${isSaving ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {isSaving ? '💾 Saving...' : `${modifiedItems.size + (modifiedCategories ? 1 : 0)} unsaved change${modifiedItems.size + (modifiedCategories ? 1 : 0) !== 1 ? 's' : ''}`}
              </div>
              <button
                onClick={() => saveModifiedItems()}
                disabled={isSaving}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Save Now
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

      {/* Warning for null IDs */}
      {categories.some((cat) => cat.products.some((p) => p.id == null)) && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong>⚠️ Data Corruption Detected:</strong> Some items have invalid IDs (null). The delete button only removes them from view, not the database.
          <button
            onClick={() => fetchProducts()}
            className="ml-3 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 font-semibold"
          >
            Reload from DB to Get Real IDs
          </button>
        </div>
      )}

      {/* Add New Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-semibold mb-6">Add New Menu Item</h2>

            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Item Name *</label>
                <input
                  type="text"
                  placeholder="Enter item name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                  <option value="">Add to new category...</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price (post-tax) *</label>
                <input
                  type="number"
                  placeholder="Enter price"
                  step="0.01"
                  min="0"
                  value={newItem.price}
                  onChange={(e) => {
                    // Limit to 2 decimal places
                    let value = e.target.value
                    if (value && value.includes('.')) {
                      const parts = value.split('.')
                      if (parts[1].length > 2) {
                        value = parts[0] + '.' + parts[1].substring(0, 2)
                      }
                    }
                    setNewItem({ ...newItem, price: value })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Veg Type</label>
                <select
                  value={newItem.veg_type}
                  onChange={(e) => setNewItem({ ...newItem, veg_type: e.target.value as 'veg' | 'non_veg' | 'not_applicable' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="not_applicable">Not Applicable</option>
                  <option value="veg">Vegetarian</option>
                  <option value="non_veg">Non-Vegetarian</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setIsAddModalOpen(false)
                  setNewItem({ name: '', category: '', price: '', veg_type: 'not_applicable' })
                  setError(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddItem(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save & Add Another
              </button>
              <button
                onClick={() => handleAddItem(true)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories and Products */}
      <div className="space-y-4">
        {categories.map((category, categoryIndex) => (
          <div key={category.name} className="bg-white rounded-lg shadow overflow-hidden">
            {/* Category Header */}
            <div
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between cursor-pointer hover:from-blue-700 hover:to-blue-800"
              onClick={() => toggleCategory(category.name)}
            >
              <div className="flex items-center gap-3 flex-1">
                {expandedCategories.has(category.name) ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                <h3 className="text-lg font-semibold">{category.name}</h3>
                <span className="ml-2 bg-blue-500 text-white text-sm px-2 py-1 rounded">{category.products.length} items</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReorderCategory(category.name, 'up')
                  }}
                  disabled={categoryIndex === 0}
                  className="p-2 hover:bg-blue-500 rounded disabled:opacity-50"
                >
                  <ChevronUp size={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReorderCategory(category.name, 'down')
                  }}
                  disabled={categoryIndex === categories.length - 1}
                  className="p-2 hover:bg-blue-500 rounded disabled:opacity-50"
                >
                  <ChevronDown size={18} />
                </button>
              </div>
            </div>

            {/* Products List */}
            {expandedCategories.has(category.name) && (
              <div
                className="p-4 space-y-3"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnCategory(e, category.name)}
              >
                {category.products.map((product, productIndex) => {
                  const prices = calculatePrices(product.price)
                  const isEditing =
                    editing?.productId === product.id

                  const hasNullId = product.id == null
                  return (
                    <div
                      key={product.id ?? `null-${category.name}-${productIndex}`}
                      draggable={!hasNullId}
                      onDragStart={(e) => !hasNullId && handleDragStart(e, product, category.name, productIndex)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => !hasNullId && handleDropOnProduct(e, product, category.name, productIndex)}
                      className={`py-2 px-4 border rounded-lg flex items-center justify-between gap-3 ${
                        hasNullId ? 'bg-red-100 border-red-400 cursor-default' : 'cursor-move hover:bg-gray-50 transition'
                      } ${
                        !product.is_active && !hasNullId ? 'opacity-60 bg-gray-100' : ''
                      } ${dragState.draggedItem?.id === product.id && !hasNullId ? 'bg-blue-100 border-blue-500' : !hasNullId ? 'border-gray-200' : ''}`}
                    >
                      {/* Product Info - Aligned columns */}
                      <div className="flex-1 min-w-0 flex items-center gap-4">
                        {/* Name column - fixed width */}
                        <div className="w-48 flex-shrink-0">
                          {isEditing && editing.field === 'name' ? (
                            <input
                              autoFocus
                              value={editing.value}
                              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                              onBlur={handleEditSave}
                              onKeyPress={(e) => e.key === 'Enter' && handleEditSave()}
                              className="px-2 py-1 border border-gray-300 rounded w-full"
                            />
                          ) : (
                            <h4
                              onDoubleClick={() => handleEditStart(product.id, 'name', product.name)}
                              className="font-semibold text-gray-800 cursor-text hover:bg-gray-200 px-2 py-1 rounded truncate"
                            >
                              {product.name}
                            </h4>
                          )}
                        </div>

                        {/* Price column - fixed width */}
                        <div className="w-24 flex-shrink-0">
                          {isEditing && editing.field === 'price' ? (
                            <input
                              autoFocus
                              type="number"
                              value={editing.value}
                              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                              onBlur={handleEditSave}
                              onKeyPress={(e) => e.key === 'Enter' && handleEditSave()}
                              step="0.01"
                              className="px-2 py-1 border border-gray-300 rounded w-full text-right"
                            />
                          ) : (
                            <span
                              onDoubleClick={() => handleEditStart(product.id, 'price', product.price)}
                              className="text-gray-700 font-semibold cursor-text hover:bg-gray-200 px-2 py-1 rounded block text-right"
                            >
                              ₹{prices.postTax}
                            </span>
                          )}
                        </div>

                        {/* Veg Type dropdown - fixed width */}
                        <div className="w-32 flex-shrink-0">
                          <select
                            value={product.veg_type}
                            onChange={(e) => {
                              const newCategories = categories.map((cat) => ({
                                ...cat,
                                products: cat.products.map((p) =>
                                  p.id === product.id ? { ...p, veg_type: e.target.value as any } : p
                                ),
                              }))
                              setCategories(newCategories)
                              setModifiedItems((prev) => new Set([...prev, product.id]))
                            }}
                            className="px-2 py-1 border border-gray-300 rounded w-full text-sm"
                          >
                            <option value="veg">Veg</option>
                            <option value="non_veg">Non-Veg</option>
                            <option value="not_applicable">N/A</option>
                          </select>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {/* Reorder buttons - disabled for null IDs */}
                        <button
                          onClick={() => handleReorderProduct(category.name, product.id, 'up')}
                          disabled={productIndex === 0 || hasNullId}
                          className="p-2 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50"
                          title={hasNullId ? 'Cannot reorder corrupted items' : 'Move up'}
                        >
                          <ChevronUp size={18} />
                        </button>
                        <button
                          onClick={() => handleReorderProduct(category.name, product.id, 'down')}
                          disabled={productIndex === category.products.length - 1 || hasNullId}
                          className="p-2 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50"
                          title={hasNullId ? 'Cannot reorder corrupted items' : 'Move down'}
                        >
                          <ChevronDown size={18} />
                        </button>

                        {/* Availability toggle - disabled for null IDs */}
                        <button
                          onClick={() => !hasNullId && handleToggleAvailability(product.id, product.is_active)}
                          disabled={hasNullId}
                          className={`p-2 rounded transition ${
                            hasNullId
                              ? 'text-gray-400 opacity-50 cursor-not-allowed'
                              : product.is_active
                              ? 'text-green-600 hover:bg-green-100'
                              : 'text-gray-400 hover:bg-gray-200'
                          }`}
                          title={hasNullId ? 'Cannot toggle corrupted items' : product.is_active ? 'Hide item' : 'Show item'}
                        >
                          {product.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteItem(product.id, product, category.name)}
                          className={`p-2 rounded ${
                            hasNullId
                              ? 'text-red-700 bg-red-200 hover:bg-red-300 font-semibold'
                              : 'text-red-600 hover:bg-red-100'
                          }`}
                          title={hasNullId ? 'Click to remove corrupted item' : 'Delete item'}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No menu items yet. Add your first item above!</p>
        </div>
      )}
    </div>
  )
}

export default MenuManagement
