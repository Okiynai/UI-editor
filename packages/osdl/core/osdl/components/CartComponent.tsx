"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { atom, useAtom } from "jotai";
import Link from "next/link";
import type { ComponentNode } from "@/OSDL.types";

import { useCart } from "@/context/CartContext";
import { useSession } from "@/context/Session";
import { useData } from "@/osdl/contexts/DataContext";
import AuthModal from "@/components/auth/AuthModal";
import { CartItem, ProductCustomizations } from "@/types/cart";
import { calculatePriceAdjustment, calculateFinalPrice, calculateItemTotal } from "@/utils/variants";

import { X, Minus, Plus, Truck, Save, Loader2, Edit3, ShoppingCart, LucideIcon } from "lucide-react";

export const cartOpenAtom = atom(false);

const getIconComponent = (iconName?: string): LucideIcon => {
  // Map of common icon names to their components
  const iconMap: Record<string, LucideIcon> = {
    ShoppingCart,
    // Add more icons as needed
  };
  
  return iconMap[iconName || 'ShoppingCart'] || ShoppingCart;
};

const darkenColor = (hex: string, percent: number = 10): string => {
  let normalizedHex = hex?.startsWith('#') ? hex.slice(1) : hex || "";
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(normalizedHex)) {
    return hex || "#000000";
  }
  if (normalizedHex.length === 3) {
    normalizedHex = normalizedHex.split('').map(char => char + char).join('');
  }
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const p = Math.max(0, Math.min(100, percent));
  let r = parseInt(normalizedHex.substring(0, 2), 16);
  let g = parseInt(normalizedHex.substring(2, 4), 16);
  let b = parseInt(normalizedHex.substring(4, 6), 16);
  r = clamp(Math.floor(r * (100 - p) / 100));
  g = clamp(Math.floor(g * (100 - p) / 100));
  b = clamp(Math.floor(b * (100 - p) / 100));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const getCurrentVariantForItem = (item: CartItem) => {
  if (!item.product.customizations?.variants || !item.customizations?.options) return null;
  const selectedValues = item.customizations.options.map(opt => opt.value);
  return item.product.customizations.variants.find(variant => 
    variant.combination.length === selectedValues.length &&
    variant.combination.every(value => selectedValues.includes(value))
  );
};

const getMaxAvailableStockForItem = (item: CartItem) => {
  if (item.product.inventoryItem?.continueSellingOutOfStock) {
    return Infinity;
  }
  if (item.product.customizations?.variants?.length) {
    const variant = getCurrentVariantForItem(item);
    if (variant && typeof variant.quantity === 'number') {
      return Math.max(0, variant.quantity);
    }
    if (variant) {
      return Math.max(0, item.product.inventoryItem?.stockCount || 0);
    }
    const variantsWithQuantity = item.product.customizations.variants.filter(v => 
      v.quantity !== undefined && typeof v.quantity === 'number'
    );
    if (variantsWithQuantity.length > 0) {
      return Math.max(...variantsWithQuantity.map(v => v.quantity!));
    }
  }
  return Math.max(0, item.product.inventoryItem?.stockCount || 0);
};

const canIncreaseQuantityForItem = (item: CartItem) => {
  const maxStock = getMaxAvailableStockForItem(item);
  return maxStock === Infinity || item.quantity < maxStock;
};

const isItemOutOfStock = (item: CartItem) => {
  if (item.product.inventoryItem?.continueSellingOutOfStock) {
    return false;
  }
  return (item.product.inventoryItem?.stockCount || 0) <= 0;
};

const isVariantOptionOutOfStockForItem = (item: CartItem, optionName: string, optionValue: string) => {
  if (item.product.inventoryItem?.continueSellingOutOfStock) {
    return false;
  }
  const variantsWithThisOption = item.product.customizations?.variants?.filter(variant =>
    variant.combination.includes(optionValue)
  ) || [];
  if (variantsWithThisOption.length === 0) {
    return false;
  }
  const variantsWithQuantity = variantsWithThisOption.filter(v => 
    v.quantity !== undefined && typeof v.quantity === 'number'
  );
  if (variantsWithQuantity.length > 0) {
    return variantsWithQuantity.every(v => v.quantity! <= 0);
  }
  return (item.product.inventoryItem?.stockCount || 0) <= 0;
};

type CartSliderProps = {
  shopId: string;
  redirect: string;
  accentColor?: string;
  isCartLoading: boolean;
  nodeSchema?: any;
};

const CartSlider = ({ shopId, redirect, accentColor, isCartLoading, nodeSchema }: CartSliderProps) => {
  const [isCartOpen, setIsCartOpen] = useAtom(cartOpenAtom);
  const { cartItems, updateQuantity, removeFromCart, updateCustomizations } = useCart();
  const [shopCartItems, setShopCartItems] = useState<CartItem[]>([]);
  const { user } = useSession();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const handleLoginClick = () => setShowLoginModal(true);
  const [mounted, setMounted] = useState(false);

  // Resolve accent color and any interaction transitions coming from editor
  const resolveInteractionTransition = useCallback(() => {
    try {
      const wrapper = document.getElementById(`${shopId}-cart-wrapper`) || document.getElementById(`${shopId}`);
      // Look for inline interaction state transitions set by editor on wrapper or body
      // We use dataset to allow the editor to convey transitions without global styles
      const ds = (wrapper as any)?.dataset || (document.body as any)?.dataset || {};
      const accentTransition = ds.accentColorTransition || '';
      if (!accentTransition) return '';
      // Map generic accent-color transition to specific properties
      // e.g. "accent-color 200ms ease-in" -> background-color,color,border-color 200ms ease-in
      const parts = accentTransition.split(/\s+/);
      const duration = parts.find((p: string) => p.endsWith('ms') || p.endsWith('s')) || '200ms';
      const easing = parts.find((p: string) => /(ease|linear|cubic-bezier)/.test(p)) || 'ease-in-out';
      const delay = parts.find((p: string) => (p.endsWith('ms') || p.endsWith('s')) && p !== duration) || '0ms';
      return `background-color ${duration} ${easing} ${delay}, color ${duration} ${easing} ${delay}, border-color ${duration} ${easing} ${delay}`;
    } catch {
      return '';
    }
  }, [shopId]);

  const baseAccent: string = useMemo(() => {
    const schemaAccent = (nodeSchema as any)?.params?.accentColor as string | undefined;
    return schemaAccent || accentColor || "#111827";
  }, [nodeSchema, accentColor]);

  const hoverAccent: string | null = useMemo(() => {
    const hover = (nodeSchema as any)?.interactionStates?.hover;
    const color = hover?.inlineStyles?.accentColor as string | undefined;
    return color || null;
  }, [nodeSchema]);

  const accentTransition = useMemo(() => {
    const hover = (nodeSchema as any)?.interactionStates?.hover;
    const t = (hover?.transitions || []).find((tr: any) => tr?.prop === 'accent-color');
    if (!t) return resolveInteractionTransition();
    const duration = typeof t.durationMs === 'number' ? `${t.durationMs}ms` : '200ms';
    const easing = t.easing || 'ease-in-out';
    const delay = typeof t.waitDurationMs === 'number' ? `${t.waitDurationMs}ms` : '0ms';
    return `background-color ${duration} ${easing} ${delay}, color ${duration} ${easing} ${delay}, border-color ${duration} ${easing} ${delay}`;
  }, [nodeSchema, resolveInteractionTransition]);

  const [isActionHovered, setIsActionHovered] = useState(false);
  const accent = isActionHovered && hoverAccent ? hoverAccent : baseAccent;

  useEffect(() => {
    setMounted(true);
    console.log('[CartSlider] shopId prop:', shopId);
    console.log('[CartSlider] all cart items:', cartItems.map(i => ({ id: i.productId, qty: i.quantity, shop: i?.product?.shop?.id })));
    const filtered = shopId
      ? cartItems.filter(item => item.product.shop.id === shopId)
      : cartItems; // if missing, show all to avoid empty UI
    if (!shopId) console.warn('[CartSlider] shopId missing. Showing all cart items in slider.');
    console.log('[CartSlider] filtered items for shop:', filtered.length);
    setShopCartItems(filtered);
  }, [cartItems, shopId]);

  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCartOpen]);

  const handleClose = () => setIsCartOpen(false);

  const getItemPriceAdjustment = calculatePriceAdjustment;

  const getDefaultCurrency = () => {
    if (shopCartItems.length > 0 && shopCartItems[0].product.currency) {
      return shopCartItems[0].product.currency;
    }
    return "EGP";
  };

  const handleUpdateQuantity = async (item: CartItem, newQuantity: number) => {
    if (newQuantity < 1) return;
    const maxStock = getMaxAvailableStockForItem(item);
    const limitedQuantity = maxStock === Infinity ? newQuantity : Math.min(newQuantity, maxStock);
    updateQuantity(item.id, limitedQuantity);
  };

  const [isVarianceModalOpen, setIsVarianceModalOpen] = useState<string | null>(null);
  const varianceModal = (id: string) => setIsVarianceModalOpen(id);

  const formatCustomizationsDisplay = (customizations?: ProductCustomizations | null): string => {
    if (!customizations || !customizations.options || customizations.options.length === 0) return "";
    return customizations.options.map(opt => `${opt.name}: ${opt.value}`).join(", ");
  };

  const content = (
    <>
      <VarianceModal 
        isOpen={isVarianceModalOpen} 
        onClose={() => setIsVarianceModalOpen(null)} 
        cartItems={shopCartItems}
        updateCustomizations={updateCustomizations}
        accentColor={accent}
      />

      {isCartOpen && (
        <div className="fixed inset-0 bg-black/50 z-[9998] transition-opacity" onClick={handleClose} />
      )}

      <div 
        className={`fixed top-0 right-0 h-dvh w-80 bg-white shadow-lg z-[9999] transform transition-transform duration-300 ease-in-out ${ isCartOpen ? 'translate-x-0' : 'translate-x-full' } flex flex-col`}
        style={{ transitionProperty: 'transform', ...(accentTransition ? { transition: `${accentTransition}, transform 300ms ease-in-out` } : {}) }}>
        {isCartLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary-400" />
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-medium text-lg">Shopping Cart</h2>
              <button onClick={handleClose} className="text-gray-500 hover:text-gray-700" aria-label="Close cart">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {shopCartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-4">
                  <p className="text-gray-500 mb-2">Your cart is empty</p>
                  <button className={`text-sm hover:underline`} onClick={handleClose} style={{ color: accent }}>
                    Continue shopping
                  </button>
                </div>
              ) : (
                <div className="">
                  {shopCartItems.map((item) => {
                    const customizationsDisplay = formatCustomizationsDisplay(item.customizations);
                    const basePrice = item.product.price || 0;
                    const priceAdjustment = getItemPriceAdjustment(item);
                    const finalPrice = calculateFinalPrice(item);
                    const maxStock = getMaxAvailableStockForItem(item);
                    const isOutOfStock = isItemOutOfStock(item);
                    const canIncrease = canIncreaseQuantityForItem(item);
                    return (
                      <div key={item.id} className="p-4 border-b border-gray-100 last:border-b-0">
                        <div className="flex gap-3">
                          <div className="rounded-md overflow-hidden flex-shrink-0">
                            {item.product.images ? (
                              <img src={item.product.images[0]} alt={item.product.name} className="object-cover w-16 h-16 " />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                <span className="text-xs text-gray-400">No image</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-medium">{item.product.name}</h3>
                            {isOutOfStock && (
                              <span className="inline-block px-1 py-0.5 bg-red-500 text-white text-xs font-bold rounded mt-1">OUT OF STOCK</span>
                            )}
                            {customizationsDisplay && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-600 truncate">{customizationsDisplay}</span>
                                <button onClick={() => varianceModal(item.id)} className="text-gray-400 hover:text-gray-600 transition-colors" title="Edit options">
                                  <Edit3 size={12} />
                                </button>
                              </div>
                            )}
                            <div className="text-base font-medium mt-1" style={{ color: accent }}>
                              {item.product.currency || "EGP"}{finalPrice.toFixed(2)}
                              {item.product.priceBeforeDiscount && (
                                <span className="text-gray-400 line-through ml-2 text-xs">{item.product.currency || "EGP"}{item.product.priceBeforeDiscount.toFixed(2)}</span>
                              )}
                              {priceAdjustment !== 0 && (
                                <span className="text-xs text-gray-500 block">Base: {item.product.currency || "EGP"}{basePrice.toFixed(2)} {priceAdjustment > 0 ? '+' : ''}{item.product.currency || "EGP"}{priceAdjustment.toFixed(2)}</span>
                              )}
                            </div>
                            {!item.product.inventoryItem?.continueSellingOutOfStock && maxStock !== Infinity && (
                              <div className="mt-1">
                                {maxStock === 0 ? (
                                  <p className="text-xs font-medium text-red-600">Out of Stock</p>
                                ) : maxStock > 10 ? (
                                  <p className="text-xs font-medium text-green-600">In Stock</p>
                                ) : (
                                  <p className="text-xs font-medium text-orange-500">Only {maxStock} left</p>
                                )}
                              </div>
                            )}
                            <div className="mt-1 flex items-center">
                              <Truck className="h-3 w-3 mr-1 text-gray-500" />
                              <span className="text-xs text-gray-600">
                                {item.product.shipping?.hasMultipleRates ? (
                                  "Calculated at checkout"
                                ) : item.product.shipping?.shippingCost === 0 ? (
                                  <span className="text-green-600">Free shipping</span>
                                ) : (
                                  <span>{item.product.currency || "EGP"}{item.product.shipping?.shippingCost?.toFixed(2) || "0.00"}</span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center mt-2">
                              <button onClick={() => handleUpdateQuantity(item, item.quantity - 1)} className={`h-6 px-1 flex items-center justify-center rounded hover:bg-gray-100 transition-colors ${item.quantity <= 1 ? "opacity-50 cursor-not-allowed" : ""}`} disabled={item.quantity <= 1} aria-label="Decrease quantity">
                                <Minus size={16} />
                              </button>
                              <span className="h-6 px-2 flex items-center justify-center rounded text-sm">{item.quantity}</span>
                              <button onClick={() => handleUpdateQuantity(item, item.quantity + 1)} className={`h-6 px-1 flex items-center justify-center rounded hover:bg-gray-100 transition-colors ${!canIncrease ? "opacity-50 cursor-not-allowed" : ""}`} disabled={!canIncrease} aria-label="Increase quantity">
                                <Plus size={16} />
                              </button>
                              <button onClick={() => removeFromCart(item.id)} className="ml-auto text-xs text-red-400 hover:text-red-500 transition-colors" aria-label="Remove item">Remove</button>
                            </div>
                            {!item.product.inventoryItem?.continueSellingOutOfStock && maxStock !== Infinity && maxStock > 0 && (
                              <p className="text-xs text-gray-500 mt-1">Maximum available: {maxStock} {maxStock === 1 ? 'item' : 'items'}</p>
                            )}
                            {item.quantity >= maxStock && maxStock !== Infinity && !item.product.inventoryItem?.continueSellingOutOfStock && (
                              <p className="text-xs text-orange-600 mt-1">You've reached the maximum available quantity</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {shopCartItems.length > 0 && (
              <div className="border-t border-gray-200 p-4">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm">Subtotal</span>
                    <span className="text-sm">{getDefaultCurrency()}{shopCartItems.reduce((total, item) => total + calculateItemTotal(item), 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm">Shipping</span>
                    <span className="text-sm text-gray-600">
                      {shopCartItems.some(item => item.product.shipping?.hasMultipleRates) ? (
                        "Calculated at checkout"
                      ) : shopCartItems.every(item => item.product.shipping?.shippingCost === 0) ? (
                        <span className="text-green-600">Free</span>
                      ) : (
                        `${getDefaultCurrency()}${shopCartItems.reduce((total, item) => total + (item.product.shipping?.shippingCost || 0), 0).toFixed(2)}`
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col">
                  {!user ? (
                    <button className="w-full text-white py-2 px-4 rounded flex items-center justify-center transition-colors text-sm" style={{ background: accent, transition: accentTransition }} onMouseEnter={() => setIsActionHovered(true)} onMouseLeave={() => setIsActionHovered(false)} onClick={handleLoginClick}>
                      Proceed to Checkout
                    </button>
                  ) : (
                    <Link href={`/checkout?redirect=${redirect}&shopId=${shopId}`} className="w-full text-white py-2 px-4 rounded flex items-center justify-center transition-colors text-sm" style={{ background: accent, transition: accentTransition }} onMouseEnter={() => setIsActionHovered(true)} onMouseLeave={() => setIsActionHovered(false)} onClick={handleClose}>
                      Proceed to Checkout
                    </Link>
                  )}
                  <button onClick={handleClose} className="underline text-sm text-gray-800 hover:text-gray-900 text-center mt-2">Continue Shopping</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {showLoginModal && <AuthModal onClose={() => setShowLoginModal(false)} initialView="login" showAccountType={false} />}
    </>
  );

  // Render via portal to avoid stacking/overflow issues within wrappers/iframes
  if (!mounted) return null;
  return createPortal(content, document.body);
};

const VarianceModal = ({ 
  isOpen, 
  onClose, 
  cartItems, 
  updateCustomizations, 
  accentColor 
}: { 
  isOpen: string | null; 
  onClose: () => void;
  cartItems: CartItem[];
  updateCustomizations: (itemId: string, customizations: ProductCustomizations | null) => void;
  accentColor: string;
}) => {
  const [selectedCustomizations, setSelectedCustomizations] = useState<Record<string, string>>({});
  const [currentItem, setCurrentItem] = useState<CartItem | null>(null);

  useEffect(() => {
    if (isOpen) {
      const item = cartItems.find(i => i.id === isOpen);
      if (item) {
        setCurrentItem(item);
        const initial: Record<string, string> = {};
        if (item.customizations?.options) {
          item.customizations.options.forEach(opt => { initial[opt.name] = opt.value; });
        }
        setSelectedCustomizations(initial);
      }
    } else {
      setCurrentItem(null);
      setSelectedCustomizations({});
    }
  }, [isOpen, cartItems]);

  if (!isOpen || !currentItem) return null;

  const productCustomizations = currentItem.product.customizations;

  const getPriceAdjustmentForCombination = (customizations: Record<string, string>) => {
    if (!productCustomizations?.variants) return 0;
    const selectedValues = Object.values(customizations);
    const variant = productCustomizations.variants.find(variant => 
      variant.combination.length === selectedValues.length &&
      variant.combination.every(value => selectedValues.includes(value))
    );
    return variant?.price_adjustment || 0;
  };

  const handleCustomizationChange = (optionName: string, value: string) => {
    setSelectedCustomizations(prev => ({ ...prev, [optionName]: value }));
  };

  const handleSave = () => {
    const newCustomizations: ProductCustomizations = {
      options: Object.entries(selectedCustomizations).map(([name, value]) => ({ name, value }))
    };
    const priceAdjustment = getPriceAdjustmentForCombination(selectedCustomizations);
    const selectedValues = Object.values(selectedCustomizations);
    const variant = productCustomizations?.variants?.find(variant => 
      variant.combination.length === selectedValues.length &&
      variant.combination.every(value => selectedValues.includes(value))
    );
    const finalCustomizations = {
      ...newCustomizations,
      sku: variant?.sku,
      priceAdjustment: priceAdjustment
    } as any;
    updateCustomizations(currentItem.id, finalCustomizations);
    onClose();
  };

  const currentPriceAdjustment = getPriceAdjustmentForCombination(selectedCustomizations);

  return (
    <>
      <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 p-4"></div>
      <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white shadow-lg w-full max-w-md rounded-lg p-6 relative max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Product Options</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <img src={currentItem.product.images[0]} alt={currentItem.product.name} className="w-12 h-12 rounded object-cover" />
              <div>
                <h4 className="font-medium text-sm">{currentItem.product.name}</h4>
                <p className="text-xs text-gray-500">Quantity: {currentItem.quantity}</p>
                {currentPriceAdjustment !== 0 && (
                  <p className="text-xs text-gray-600">Price adjustment: {currentPriceAdjustment > 0 ? '+' : ''}{currentItem.product.currency}{currentPriceAdjustment.toFixed(2)}</p>
                )}
              </div>
            </div>
            {productCustomizations?.options && productCustomizations.options.length > 0 ? (
              <div className="space-y-4">
                {productCustomizations.options.map((option) => (
                  <div key={option.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{option.name} {option.required && <span className="text-red-500">*</span>}</label>
                    <div className="flex flex-wrap gap-2">
                      {option.values.map((value) => {
                        const isSelected = selectedCustomizations[option.name] === value;
                        const isVariantOutOfStock = isVariantOptionOutOfStockForItem(currentItem, option.name, value);
                        return (
                          <button
                            key={value}
                            onClick={() => !isVariantOutOfStock && handleCustomizationChange(option.name, value)}
                            disabled={isVariantOutOfStock}
                            className={`px-3 py-2 border rounded-lg text-sm font-medium transition-all duration-200 ${
                              isVariantOutOfStock ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60' : isSelected ? 'text-white shadow-sm' : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                            }`}
                            style={{ backgroundColor: isSelected && !isVariantOutOfStock ? accentColor : 'transparent', borderColor: isSelected && !isVariantOutOfStock ? accentColor : '' }}
                          >
                            {value}
                            {isVariantOutOfStock && (
                              <span className="block text-xs text-red-500 mt-1">Out of Stock</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No customization options available for this item.</p>
            )}
          </div>
          <div className="flex justify-end space-x-3">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors flex items-center gap-2 text-sm font-medium" style={{ backgroundColor: accentColor }}>
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

type CartComponentProps = {
  shopId: string;
  redirect?: string;
  accentColor?: string;
  showBadge?: boolean;
  iconName?: string;
  nodeSchema?: ComponentNode;
};

export default function CartComponent({ shopId, redirect, accentColor, showBadge = true, iconName, nodeSchema }: CartComponentProps) {
  const { cartItems: allCartItems, isInitLoading } = useCart();
  const [_, setIsCartOpen] = useAtom(cartOpenAtom);
  
  // Get shopId from data context as fallback
  const { siteInfo } = useData();
  const effectiveShopId = shopId || siteInfo?.shop?.id;

  const totalCartItems = allCartItems
    .filter(item => item.product.shop.id === effectiveShopId)
    .reduce((total, item) => total + item.quantity, 0);

  const finalRedirect = useMemo(() => {
    if (redirect) return redirect;
    if (typeof window !== 'undefined') {
      return encodeURIComponent(window.location.pathname + window.location.search);
    }
    return '';
  }, [redirect]);

  return (
    <>
      <button className="relative text-gray-700 flex items-center justify-center rounded-md bg-transparent hover:text-gray-900" onClick={() => setIsCartOpen(true)} aria-label="Open cart">
        {(() => {
          const Icon = getIconComponent(iconName);
          return <Icon className="w-5 h-5" />
        })()}
        {showBadge && totalCartItems > 0 && (
          <span className={`absolute -top-[6px] -right-[6px] text-white text-[10px] rounded-full py-[3px] px-[5px] inline-flex items-center justify-center font-medium border-2 border-white leading-none`} style={{ background: accentColor || "#111827" }}>
            {totalCartItems > 99 ? "99+" : totalCartItems}
          </span>
        )}
      </button>
      <CartSlider accentColor={accentColor} shopId={effectiveShopId} redirect={finalRedirect} isCartLoading={isInitLoading} nodeSchema={nodeSchema} />
    </>
  );
}

