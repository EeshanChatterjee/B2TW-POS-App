import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import { addToCart } from '../store/slices/cartSlice';
import { api } from '../services/api';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  is_active: number;
}

export default function ProductGrid() {
  const dispatch = useAppDispatch();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch products and categories on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch products
        const productsResponse = await api.getProducts();
        setProducts(productsResponse.data.products);

        // Fetch categories
        const categoriesResponse = await api.getCategories();
        setCategories(['All', ...categoriesResponse.data.categories]);

        setSelectedCategory('All');
      } catch (err) {
        setError('Failed to load products. Please try again.');
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter products by category
  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const handleAddToCart = (product: Product) => {
    dispatch(addToCart({
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1
    }));
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 overflow-auto flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto flex flex-col">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-lg">No products available in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 auto-rows-max">
          {filteredProducts.map(product => (
            <button
              key={product.id}
              onClick={() => handleAddToCart(product)}
              className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow hover:bg-gray-50 text-left group cursor-pointer"
            >
              {/* Product Image Placeholder */}
              <div className="w-full h-32 bg-gradient-to-br from-red-100 to-red-200 rounded mb-3 flex items-center justify-center group-hover:from-red-200 group-hover:to-red-300 transition-colors">
                <span className="text-4xl">🍗</span>
              </div>

              {/* Product Info */}
              <h3 className="font-bold text-sm truncate">{product.name}</h3>
              <p className="text-xs text-gray-600 mb-2 line-clamp-1">{product.description}</p>

              {/* Price and Category */}
              <div className="flex justify-between items-end">
                <span className="text-xs text-gray-500">{product.category}</span>
                <span className="text-lg font-bold text-red-600">₹{product.price}</span>
              </div>

              {/* Add Button Visual */}
              <div className="mt-2 text-center text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                + Add
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
