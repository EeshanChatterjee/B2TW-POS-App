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
        setCategories(categoriesResponse.data.categories);
      } catch (err) {
        setError('Failed to load products. Please try again.');
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Group products by category
  const groupedProducts = categories.reduce((acc, category) => {
    acc[category] = products.filter(p => p.category === category);
    return acc;
  }, {} as Record<string, Product[]>);

  const handleAddToCart = (product: Product) => {
    dispatch(addToCart({
      productId: String(product.id),
      productName: product.name,
      price: product.price,
      isBeverage: product.category === 'Beverages',
      quantity: 1
    }));
  };

  const getProductColor = (product: Product) => {
    // Beverages - light blue
    if (product.category === 'Beverages') {
      return 'bg-blue-100 hover:bg-blue-200';
    }

    // Desserts - light orange
    if (product.category === 'Dessert Bao') {
      return 'bg-orange-100 hover:bg-orange-200';
    }

    // Determine veg vs non-veg from product name
    const name = product.name.toLowerCase();

    // Non-veg items take priority - explicitly labeled as "Non Veg"
    if (name.includes('non veg')) {
      return 'bg-orange-200 hover:bg-orange-300';
    }

    // Veg items - explicitly labeled as "Veg" or contain veg keywords
    const vegKeywords = ['veg', 'paneer', 'soya', 'sabz', 'corn', 'spring roll', 'potato', 'crispy', 'pizza'];
    const isVeg = vegKeywords.some(keyword => name.includes(keyword));

    // Veg items - light green
    if (isVeg) {
      return 'bg-green-100 hover:bg-green-200';
    }

    // Non-veg items - darker orange
    return 'bg-orange-200 hover:bg-orange-300';
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

      {/* Products organized by category */}
      {products.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-lg">No products available</p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category, categoryIndex) => {
            const categoryProducts = groupedProducts[category];
            if (categoryProducts.length === 0) return null;

            return (
              <div key={category}>
                {/* Category Header with separator */}
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-lg font-bold text-gray-800 whitespace-nowrap w-32">{category}</h2>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>

                {/* Category Products Grid */}
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 auto-rows-max">
                  {categoryProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => handleAddToCart(product)}
                      className={`${getProductColor(product)} p-2 rounded-lg shadow hover:shadow-lg transition-all text-left cursor-pointer`}
                    >
                      <h3 className="font-semibold text-sm truncate text-gray-800">{product.name}</h3>
                    </button>
                  ))}
                </div>

                {/* Separator between categories */}
                {categoryIndex < categories.length - 1 && (
                  <div className="mt-6 h-px bg-gray-200"></div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
