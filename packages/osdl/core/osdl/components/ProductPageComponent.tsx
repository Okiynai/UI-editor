'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';
import { Truck, RotateCcw } from 'lucide-react';
import { CartItem } from '@/types/cart';
import { useSession } from '@/context/Session';
import { useData } from '@/osdl/contexts/DataContext';
import ModalButtonComponent from './ModalButtonComponent';
import { usePathname, useSearchParams } from 'next/navigation';
import { useNavigation } from '@/app/shop-manager/website/edit/iframe/utils/context/NavigationProvider';

interface ProductData {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  stockCount: number;
  shop?: {
    id: string;
    name: string;
    logo?: string;
  };
  shipping?: {
    shippingProfileId: string;
    shippingCost: number;
    estimatedDeliveryDays: string;
  };
}

interface ProductPageComponentProps {
  productId?: string;
  size?: string;
  color?: string;
}

const ProductPageComponent: React.FC<ProductPageComponentProps> = ({ 
  productId,
  size,
  color 
}) => {
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  
  const { addToCart, updateBuyNowItem } = useCart();
  const router = useRouter();
  const { user: sessionUser } = useSession();
  const { userInfo, pageInfo } = useData();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { navigate } = useNavigation();

  // Check authentication status like checkout page
  const user = (userInfo && userInfo.profile) ? userInfo.profile : sessionUser;
  const isAuthenticated = !!(userInfo && userInfo.isAuthenticated && userInfo.profile);

  // Prefer route param, then prop; if neither provided, backend fallback will apply
  const effectiveProductId = pageInfo?.routeParams?.productId || productId;

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/rql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productDetail: {
              contract: 'product.get',
              params: effectiveProductId ? { productId: effectiveProductId } : undefined,
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                  currency: true,
                  images: true,
                  stockCount: true,
                  shop: true,
                  shipping: true
                }
            }
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.errors && result.errors.length > 0) {
          throw new Error(result.errors[0].message);
        }

        setProduct(result.data?.productDetail || null);
      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [effectiveProductId]);

  const handleAddToCart = () => {
    if (!product) return;

    const cartItem: Omit<CartItem, 'id' | 'synced'> = {
      productId: product.id,
      quantity,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        currency: product.currency,
        images: product.images,
        inventoryItem: {
          stockCount: product.stockCount,
          continueSellingOutOfStock: false
        },
        shop: { 
          id: product.shop?.id || "unknown-shop", 
          name: product.shop?.name || "Unknown Shop" 
        },
        shipping: { 
          shippingProfileId: product.shipping?.shippingProfileId || "standard-shipping", 
          shippingCost: product.shipping?.shippingCost ? product.shipping.shippingCost / 100 : 50 
        }
      }
    };

    addToCart(cartItem);
  };

  const handleBuyNow = () => {
    if (!product) return;

    const cartItem: CartItem = {
      id: `buy-now-${Date.now()}`,
      productId: product.id,
      quantity,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false,
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        currency: product.currency,
        images: product.images,
        inventoryItem: {
          stockCount: product.stockCount,
          continueSellingOutOfStock: false
        },
        shop: { 
          id: product.shop?.id || 'unknown-shop',
          name: product.shop?.name || 'Unknown Shop'
        },
        shipping: { 
          shippingProfileId: product.shipping?.shippingProfileId || 'standard-shipping', 
          shippingCost: product.shipping?.shippingCost ? product.shipping.shippingCost / 100 : 50 
        },
        // Pass through any available customizations structure if present
        // @ts-ignore optional in API response
        customizations: (product as any)?.customizations
      }
    };

    updateBuyNowItem(cartItem);

    // Build redirect URL for current page
    const currentParams = searchParams?.toString() || '';
    const currentPageUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${pathname || ''}${currentParams ? `?${currentParams}` : ''}`
      : '';

    const shopId = product.shop?.id || 'unknown-shop';
    const checkoutUrl = `/checkout?redirect=${encodeURIComponent(currentPageUrl)}&shopId=${shopId}&isBuyNow=1`;

    // Use unified navigation helper (handles editor vs router internally)
    navigate(checkoutUrl);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-200 rounded-lg h-[520px] animate-pulse"></div>
            <div className="space-y-4">
              <div className="bg-gray-200 h-8 rounded animate-pulse"></div>
              <div className="bg-gray-200 h-6 rounded animate-pulse"></div>
              <div className="bg-gray-200 h-4 rounded animate-pulse"></div>
              <div className="bg-gray-200 h-20 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h2>
          <p className="text-gray-600">{error || 'The requested product could not be found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-16">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-lg border border-gray-200 overflow-hidden">
              <img
                src={product.images[0] || '/placeholder-product.jpg'}
                alt={product.name}
                className="w-full h-full object-contain"
                style={{ objectFit: 'contain' }}
              />
            </div>
            {/* Thumbnail */}
            <div className="w-20 h-20 bg-white rounded-lg border border-gray-200 overflow-hidden">
              <img
                src={product.images[0] || '/placeholder-product.jpg'}
                alt={product.name}
                className="w-full h-full object-contain"
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">{product.name}</h1>
              <div className="flex items-baseline space-x-2 mb-3">
                <span className="text-sm text-gray-600">{product.currency}</span>
                <span className="text-3xl font-bold text-gray-900">{product.price}</span>
              </div>
              <p className={`text-sm font-medium ${
                product.stockCount > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {product.stockCount > 0 ? 'In Stock' : 'Out of Stock'}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600 leading-relaxed">{product.description}</p>
            </div>

            {/* Quantity Controls */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Quantity</span>
              <div className="flex items-center border border-gray-300 rounded-lg w-fit">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 border-r border-gray-300"
                >
                  −
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-3 py-2 text-center border-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 border-l border-gray-300"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-gray-500">Maximum available: {product.stockCount} items</p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={handleAddToCart}
                disabled={product.stockCount === 0}
                className="flex-1 bg-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Add to Cart
              </button>
              {isAuthenticated ? (
                <button
                  onClick={handleBuyNow}
                  disabled={product.stockCount === 0}
                  className="flex-1 bg-gray-800 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Buy Now
                </button>
              ) : (
                <ModalButtonComponent
                  id="buy-now-modal-button"
                  nodeSchema={{} as any}
                  content="Buy Now"
                  className="flex-1"
                  style={{
                    width: '100%',
                    backgroundColor: '#1f2937',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                />
              )}
            </div>

            {/* Shipping & Returns */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping & Returns</h3>
              
              {/* Delivery Options */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Truck className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="text-sm text-gray-700">Standard Shipping</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Est. Delivery: {product.shipping?.estimatedDeliveryDays || '1-3 days'}</p>
                    <p className="text-sm font-medium text-gray-900">{product.currency} {product.shipping?.shippingCost ? product.shipping.shippingCost / 100 : 50}</p>
                  </div>
                </div>
                
                <div className="border-t border-gray-100"></div>
                
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Truck className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="text-sm text-gray-700">Express Shipping</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Est. Delivery: {product.shipping?.estimatedDeliveryDays || '2-4 days'}</p>
                    <p className="text-sm font-medium text-gray-900">{product.currency} {product.shipping?.shippingCost ? (product.shipping.shippingCost / 100) * 2 : 100}</p>
                  </div>
                </div>
              </div>

              {/* Return Policy */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <RotateCcw className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Return Policy</span>
                  <p className="text-sm text-red-600">No returns allowed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPageComponent;
