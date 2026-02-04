"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
	ArrowLeft,
	CreditCard,
	Check,
	Truck,
	Plus,
	AlertTriangle,
	X,
	Loader2,
	Info,
	MapPin,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useSession } from "@/context/Session";
import { toast } from "react-hot-toast";
import * as checkoutAPI from "@/services/api/checkout";
import * as userAPI from "@/services/api/user";
import OrderSummary from "@/components/checkout/OrderSummary";
import ShippingProfileGroups, { ShippingProfileGroup, ShippingRate as ProfileGroupShippingRate } from "@/components/checkout/ShippingProfileGroups";
import { UserAddress } from "@/types/user";

import { useForm } from "react-hook-form";
import { userSettingsAPI } from "@/services/api/user";

import { useQuery } from '@tanstack/react-query';
import { CartItem, formatCustomizationsForAPI } from "@/types/cart";

import { checkoutApi, PlaceOrderPayload } from "@/services/api/checkout";
import { ShippingCalculator, type ShippingRate } from "@/utils/shipping";
import { ShippingCalculator as ShippingCalculatorService } from "@/utils/shipping";
import { usePageTitle } from "@/hooks/usePageTitle";
import { calculateFinalPrice } from "@/utils/variants";

// Import the location API from shipping settings
import { getLocationData, LocationData } from "@/services/api/shop-manager/shipping";
import { City } from "@/services/api/locations";
import { useData } from "@/osdl/contexts/DataContext";
import { useNavigation } from "@/app/shop-manager/website/edit/iframe/utils/context/NavigationProvider";
import SignInRequiredOverlay from "@/osdl/components/utils/SignInRequiredOverlay";
import { Inter } from "next/font/google";

// -----------------------------
// Mock data for editor previews
// -----------------------------
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const MOCK_CART_ITEMS = [
    {
        id: "cart_item_1",
        productId: "prod_123",
        quantity: 1,
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        product: {
            id: "prod_123",
            name: "Sample Product",
            price: 299.99,
            priceBeforeDiscount: 349.99,
            currency: "EGP",
            images: ["/placeholder.png"],
            inventoryItem: {
                stockCount: 50,
                continueSellingOutOfStock: false,
            },
            shop: { id: "shop_123", name: "Demo Shop", logo: "/logo.png" },
            shipping: {
                shippingProfileId: "profile_a",
                shippingCost: 50,
                hasMultipleRates: true,
            },
            customizations: {
                options: [],
                variants: [],
            },
        },
        customizations: { options: [] },
    },
] as unknown as CartItem[];

const MOCK_ADDRESSES: UserAddress[] = [
    {
        id: "addr_1",
        isDefault: true,
        addressType: "apartment",
        buildingNumber: "12",
        streetName: "Nile St",
        district: "Zamalek",
        city: "CAI",
        governate: "Cairo",
        region: "EGY",
        zipCode: "11561",
        deliveryNotes: "Call on arrival",
    } as any,
    {
        id: "addr_2",
        isDefault: false,
        addressType: "office",
        buildingNumber: "221",
        streetName: "Tahrir Sq",
        district: "Downtown",
        city: "CAI",
        governate: "Cairo",
        region: "EGY",
        zipCode: "11511",
        deliveryNotes: "Reception desk",
    } as any,
];

const MOCK_SHIPPING_OPTIONS = [
    { id: "rate_standard", name: "Standard Shipping", price: 50, estimatedDelivery: "2-5 days" },
    { id: "rate_express", name: "Express Shipping", price: 120, estimatedDelivery: "1-2 days" },
];

const MOCK_PROFILE_GROUPS: ShippingProfileGroup[] = [
    {
        profileId: "profile_a",
        profileName: "Default Profile" as any,
        productNames: ["Sample Product"],
        rates: [
            { id: "pg_rate_a", name: "Courier", description: "Ground", price: 50, method: "courier", minHandlingTime: 2, maxHandlingTime: 5, handlingTimeUnit: "days", rateType: "flat" as any, profileId: "profile_a", estimatedDelivery: "2-5 days" },
            { id: "pg_rate_b", name: "Express", description: "Air", price: 120, method: "express", minHandlingTime: 1, maxHandlingTime: 2, handlingTimeUnit: "days", rateType: "flat" as any, profileId: "profile_a", estimatedDelivery: "1-2 days" },
        ],
        selectedRate: { id: "pg_rate_a", name: "Courier", description: "Ground", price: 50, method: "courier", minHandlingTime: 2, maxHandlingTime: 5, handlingTimeUnit: "days", rateType: "flat" as any, profileId: "profile_a", estimatedDelivery: "2-5 days" },
    } as any,
    {
        profileId: "profile_b",
        profileName: "Heavy Items" as any,
        productNames: ["Large Item"],
        rates: [
            { id: "pg_rate_c", name: "Freight", description: "Truck", price: 200, method: "freight", minHandlingTime: 3, maxHandlingTime: 7, handlingTimeUnit: "days", rateType: "flat" as any, profileId: "profile_b", estimatedDelivery: "3-7 days" },
            { id: "pg_rate_d", name: "Priority Freight", description: "Truck Express", price: 350, method: "freight_express", minHandlingTime: 2, maxHandlingTime: 4, handlingTimeUnit: "days", rateType: "flat" as any, profileId: "profile_b", estimatedDelivery: "2-4 days" },
        ],
        selectedRate: { id: "pg_rate_c", name: "Freight", description: "Truck", price: 200, method: "freight", minHandlingTime: 3, maxHandlingTime: 7, handlingTimeUnit: "days", rateType: "flat" as any, profileId: "profile_b", estimatedDelivery: "3-7 days" },
    } as any,
];

type PaymentMethod = {
	id: string;
	type: "creditCard" | "paypal" | "applePay" | "googlePay" | "cash";
	label: string;
};

type PlaceOrderResponse = {
	success: boolean;
	orderId?: string;
	orderIds?: string[];
	error?: string;
};

type CheckoutFormData = {
	email: string;
	selectedAddressId: string;
	selectedShippingOption: string;
	paymentMethod: string;
	phoneNumber: string;
};

const paymentMethods: PaymentMethod[] = [
	// { id: "credit_card", type: "creditCard", label: "Credit / Debit Card" },
	// { id: "paypal", type: "paypal", label: "PayPal" },
	// { id: "applePay", type: "applePay", label: "Apple Pay" },
	// { id: "googlePay", type: "googlePay", label: "Google Pay" },
	{ id: "cash", type: "cash", label: "Cash on Delivery" },
	// { id: "vodafone_cash", type: "creditCard", label: "Vodafone Cash" },
	// { id: "sympl", type: "creditCard", label: "Sympl" },
	// { id: "okiyinai", type: "creditCard", label: "Okiyinai Credit" },
	// { id: "instapay", type: "creditCard", label: "InstaPay" },
];

function useValidatedCartItems(): { cartItems: CartItem[]; shopId: string | null, redirectUrl: string | null, isBuyNow?: boolean } {
	const router = useRouter();
	const { cartItems, buyNowItem } = useCart();
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const [validItems, setValidItems] = useState<any>(null);

	const redirectUrl = searchParams.get("redirect")
	const shopId = searchParams.get("shopId")
	const decodedUrl = decodeURIComponent(redirectUrl || "");
	const isBuyNow = searchParams.get('isBuyNow') === '1';

	useEffect(() => {
		if (!shopId) {
			router.replace("/account-settings");
			return;
		}

		if(isBuyNow && !buyNowItem) {
			// If it's a buy now flow but buyNowItem is null (likely due to page refresh),
			// redirect back to the redirect URL to prevent infinite loading
			if (redirectUrl) {
				console.log("Buy now item lost on refresh, redirecting back to:", decodedUrl);
				router.replace(decodedUrl);
			} else {
				router.replace(`/`);
			}
			return;
		}

		isBuyNow ? setValidItems([buyNowItem]) : setValidItems(cartItems.filter(item => item.product.shop.id === shopId));
	}, [cartItems, pathname, buyNowItem, isBuyNow, redirectUrl, decodedUrl, shopId, router]);

	return { cartItems: validItems ?? [], shopId, redirectUrl, isBuyNow };
}

// Process the order and handle the checkout flow

const placeOrder = async (
	user: any,
	// the naming here might cause some confusion. But here, cartItems are not always cart items, they might be the buyNowItem in an array or some shit yk.
	// so we pass the setBuyNowItem to null as the clearCart item. So make sure to see the function call to this function to know what's going on.
	cartItems: CartItem[],
	clearCart: () => void,
	shippingAddress: UserAddress,
	email: string,
	paymentMethod: string,
	phoneNumber: string,
	selectedShippingOptions?: Record<string, string>,
	profileRateSelections?: Record<string, string>
) => {
	try {
		if (!user) {
			return {
				success: false,
				error: "Please sign in to place an order",
			};
		}

		// Calculate shipping using the ShippingCalculator
		const avaliableRates = cartItems.map(item => ({ 
			type: 'flat' as any,
			id: item.product.shipping?.shippingProfileId || '',
			priceInCents: (item.product.shipping?.shippingCost || 0) * 100
		}));

		const shippingResult = ShippingCalculator.calculateShippingCost(cartItems, avaliableRates);

		// Create checkout payload
		const checkoutData: PlaceOrderPayload = {
			items: cartItems.map((item) => ({
				productId: item.productId,
				quantity: item.quantity,
				customizations: item.customizations
					? (formatCustomizationsForAPI(item.customizations) as any)
					: undefined,
			})),
			email: email,
			paymentMethod: validatePaymentMethod(paymentMethod),
			notes: "",
			deliveryInstructions: shippingAddress.deliveryNotes || "",
		};

		// Add shipping rate IDs from either per-profile selection or shop-wide selection
		if (profileRateSelections && Object.keys(profileRateSelections).length > 0) {
			// Use the profile-specific rate selections
			checkoutData.shippingRateIds = profileRateSelections;
			console.log("Using profile-specific shipping rates:", profileRateSelections);
		} else if (selectedShippingOptions && Object.keys(selectedShippingOptions).length > 0) {
			// Use the shop-wide rate selection (legacy)
			checkoutData.shippingRateIds = selectedShippingOptions;
			console.log("Using shop-wide shipping rates:", selectedShippingOptions);
			// Add shippingCost as fallback for backwards compatibility
			checkoutData.shippingCost = shippingResult.totalShippingCost;
		} else {
			// No shipping rate IDs - use the old way with only shippingCost
			checkoutData.shippingCost = shippingResult.totalShippingCost;
			console.log("No specific shipping rates selected, using total cost:", shippingResult.totalShippingCost);
		}

		// If the address has an ID, it's a saved address - send the ID
		if (shippingAddress.id) {
			checkoutData.shippingAddressId = shippingAddress.id;
		} else {
			// Only use manual address if no ID (new address)
			checkoutData.manualShippingAddress = {
				recipientName: user?.displayName || "Customer",
				phone: phoneNumber,
				region: shippingAddress.region,
				governorate: shippingAddress.governate,
				city: shippingAddress.city,
				district: shippingAddress.district || "",
				streetName: shippingAddress.streetName,
				buildingNumber: shippingAddress.buildingNumber,
				postalCode: shippingAddress.zipCode || "",
				addressType: shippingAddress.addressType,
				deliveryNotes: shippingAddress.deliveryNotes,
			};
		}

		// Use the placeOrder function
		const response = await checkoutApi.placeOrder(checkoutData);

		if (!response.success || !response.data) {
			return {
				success: false,
				error: response.error || "Checkout failed",
			};
		}

		// Clear the cart on successful order
		clearCart();

		// Handle the API response format and extract order information
		const firstOrder = response.data.orders[0];
		const allOrderIds = response.data.orders.map((order) => order.id).filter(Boolean) as string[];

		// Log what we're returning to help debug
		console.log("Returning from placeOrder:", {
			success: true,
			orderId: firstOrder?.id,
			orderIds: allOrderIds,
		});

		if (!firstOrder?.id && allOrderIds.length === 0) {
			console.warn("No order ID found in response:", response);
		}

		// Return success with order details
		return {
			success: true,
			orderId: firstOrder?.id,
			orderIds: allOrderIds.length > 0 ? allOrderIds : undefined,
		};
	} catch (error) {
		console.error("Error during checkout:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "An unexpected error occurred",
		};
	}
};

// Helper to validate payment method
const validatePaymentMethod = (method: string | number): string => {
	const validMethods = [
		"credit_card",
		"paypal",
		"applePay",
		"googlePay",
		"cash",
		"vodafone_cash",
		"sympl",
		"okiyinai",
		"instapay",
	];

	// If it's a string and valid, return it
	if (typeof method === "string" && validMethods.includes(method)) {
		return method;
	}

	// If it's a number, convert to string (like "20" to "card" as fallback)
	if (typeof method === "number") {
		console.warn(
			'Payment method was passed as a number instead of string. Converting to "credit_card".'
		);
		return "credit_card";
	}

	// Default fallback
	console.warn(`Invalid payment method: ${method}. Using "credit_card" as fallback.`);
	return "credit_card";
};

const CheckoutPage = () => {
	usePageTitle("Checkout | Okiynai");
	
    const router = useRouter();
 // NOTE: the user loading should be done via osdl
 // so that we won't have to do it here like this.
	const { user: sessionUser, isLoading: userLoading } = useSession();
    const { userInfo } = useData();

    const { isEditMode } = useNavigation();

    const isEditor = !!isEditMode || (typeof window !== 'undefined' && window.location.pathname.includes('/shop-manager/website/edit/'));

    const user = (userInfo && userInfo.profile) ? userInfo.profile : sessionUser;

    console.log("user", user, userInfo);

    const hasUser = !!(userInfo && userInfo.isAuthenticated && userInfo.profile);

	// Ensure URL has shopId to prevent redirects in useValidatedCartItems during editor preview
	useEffect(() => {
		if (typeof window === 'undefined') return;
		if (!(isEditor && !hasUser)) return;
		const params = new URLSearchParams(window.location.search);
		const currentShopId = params.get('shopId');
		const mockShopId = ((MOCK_CART_ITEMS[0] as any)?.product?.shop?.id) || 'shop_123';
		let changed = false;
		if (!currentShopId) {
			params.set('shopId', mockShopId);
			changed = true;
		}
		// Avoid buy-now redirect path in the hook
		if (params.get('isBuyNow') === '1') {
			params.delete('isBuyNow');
			changed = true;
		}
		if (changed) {
			const url = `${window.location.pathname}?${params.toString()}`;
			window.history.replaceState({}, '', url);
		}
	}, [isEditor, hasUser]);

	const [isLoading, setIsLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isAddingAddress, setIsAddingAddress] = useState(false);
	const [isAddressSaving, setIsAddressSaving] = useState(false);
	const [profileGroups, setProfileGroups] = useState<ShippingProfileGroup[]>([]);
	const [selectedRateIds, setSelectedRateIds] = useState<Record<string, string>>({});
	const [totalProfileGroupsShipping, setTotalProfileGroupsShipping] = useState(0);

	const [formData, setFormData] = useState<CheckoutFormData>({
		email: "",
		selectedAddressId: "",
		selectedShippingOption: "",
		paymentMethod: paymentMethods[0].id,
		phoneNumber: "",
	});

	const { isSyncing, clearCart, setBuyNowItem } = useCart();
	const mockShopId = ((MOCK_CART_ITEMS[0] as any)?.product?.shop?.id || 'shop_123');
	
	// Always call the hook, but conditionally use its result
	const validatedCartCtx = useValidatedCartItems();
	
	const rawCartCtx = isEditor
		? { cartItems: (MOCK_CART_ITEMS as unknown as CartItem[]), shopId: mockShopId, redirectUrl: '', isBuyNow: false }
		: validatedCartCtx;
	const redirectShopId = rawCartCtx.shopId;
	const cartItems = rawCartCtx.cartItems;
	const redirectUrl = rawCartCtx.redirectUrl;
	const isBuyNow = rawCartCtx.isBuyNow;

	// In editor preview, override runtime loading flags to avoid spinner lock
	const loadingUser = isEditor ? false : userLoading;
	const loadingSync = isEditor ? false : isSyncing;

	// Check authentication status (skip redirect in editor preview)
	useEffect(() => {
		if (!isEditor && user === null && !isLoading && !userLoading) {
			router.replace('/');
		} else if (user?.email) {
			setFormData((prev) => ({
				...prev,
				email: user.email || "",
				phoneNumber: user.phoneNumber || "",
			}));
		}
	}, [user, router, isLoading, isEditor]);

	// Load user addresses
	const { data: apiAddresses = [], isLoading: isAddressesLoadingApi, refetch: refetchAddresses, isRefetching: isRefetchingApi } = useQuery({
		queryKey: ['userAddresses', user?.id, isLoading],
		queryFn: async () => {
			if (!user) return [];
			const response = await userAPI.userSettingsAPI.getUserAddresses();
			if (Array.isArray(response)) {
				const sortedAddresses = response.sort((a, b) =>
					a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1
				);
				// Select default or first address after loading
				const defaultAddress = sortedAddresses.find((addr) => addr.isDefault);
				if (defaultAddress) {
					setFormData((prev) => ({
						...prev,
						selectedAddressId: defaultAddress.id || "",
					}));
				} else if (sortedAddresses.length > 0) {
					setFormData((prev) => ({
						...prev,
						selectedAddressId: sortedAddresses[0].id || "",
					}));
				}
				return sortedAddresses;
			} else {
				console.log("No addresses found or error loading addresses");
				return [];
			}
		},
		enabled: !!user, // Only run the query if the user is logged in
	});

	const addresses: UserAddress[] = (isEditor) ? (MOCK_ADDRESSES as UserAddress[]) : (apiAddresses as UserAddress[]);
	const isAddressesLoading = (isEditor) ? false : isAddressesLoadingApi;
	const isRefetching = (isEditor) ? false : isRefetchingApi;

	const { data: apiShippingOptions = [], isLoading: isShippingLoadingApi } = useQuery({
		queryKey: ['shippingOptions', redirectShopId, cartItems, formData.selectedAddressId, addresses.length],
		queryFn: async () => {
			if (!cartItems) {
				return [];
			}

			if(!redirectShopId) return;

			// Get the selected address object instead of just the ID
			const selectedAddress = addresses.find(addr => addr.id === formData.selectedAddressId);
			if (!selectedAddress) {
				throw new Error('Please select a shipping address');
			}

			const response = await checkoutAPI.getShippingRates(
				redirectShopId,
				cartItems,
				selectedAddress // Pass the full address object instead of just ID
			);
			
			if (!response.success) {
				// Handle specific error for no shipping in governorate
				if (response.error && response.error.includes('No shipping available')) {
					throw new Error(`No shipping available for ${selectedAddress.governate} governorate yet. Please select a different address or contact support.`);
				}
				console.error(`Failed to get shipping rates for shop ${redirectShopId}:`, response.error);
				throw new Error(response.error || 'Failed to fetch shipping rates');
			}
			
			if (!response.data) {
				throw new Error('No shipping rates available');
			}
			
			console.log(`Shipping rates for shop ${redirectShopId}:`, response.data);
			
			// Check if we have profile groups in the response
			if (response.profileGroups && response.profileGroups.length > 0) {
				// Initialize with product names if not already set
				const groupsWithProducts = response.profileGroups.map(group => {
					// Find products that belong to this profile
					const productsInGroup = cartItems.filter(item => 
						item.product.shipping?.shippingProfileId === group.profileId
					);
					
					// Convert API shipping rates to ProfileGroupShippingRate format
					const formattedRates: ProfileGroupShippingRate[] = group.rates.map(rate => ({
						id: rate.id,
						name: rate.name,
						description: rate.method || '',
						price: rate.price,
						method: rate.method,
						minHandlingTime: rate.minHandlingTime,
						maxHandlingTime: rate.maxHandlingTime,
						handlingTimeUnit: rate.handlingTimeUnit || 'days',
						rateType: rate.rateType,
						profileId: rate.profileId,
						estimatedDelivery: rate.estimatedDelivery || `${rate.minHandlingTime || 1}-${rate.maxHandlingTime || 5} days`
					}));

					// Format the selected rate
					const formattedSelectedRate: ProfileGroupShippingRate = {
						id: group.selectedRate.id,
						name: group.selectedRate.name,
						description: group.selectedRate.method || '',
						price: group.selectedRate.price,
						method: group.selectedRate.method,
						minHandlingTime: group.selectedRate.minHandlingTime,
						maxHandlingTime: group.selectedRate.maxHandlingTime,
						handlingTimeUnit: group.selectedRate.handlingTimeUnit || 'days',
						rateType: group.selectedRate.rateType,
						profileId: group.selectedRate.profileId,
						estimatedDelivery: group.selectedRate.estimatedDelivery || `${group.selectedRate.minHandlingTime || 1}-${group.selectedRate.maxHandlingTime || 5} days`
					};
					
					// Add product names to the group
					return {
						...group,
						rates: formattedRates,
						selectedRate: formattedSelectedRate,
						productNames: productsInGroup.map(item => item.product.name)
					} as ShippingProfileGroup;
				});
				
				setProfileGroups(groupsWithProducts);
				
				// Let the ShippingProfileGroups component handle rate selection via useEffect
				// This ensures proper timing and avoids race conditions
			} else {
				setProfileGroups([]);
				setTotalProfileGroupsShipping(0);
			}
			
			// Set the default single shipping option if there are no profile groups
			// or only one profile group - selection will be handled in useEffect
			// after shippingOptions are processed
			
			// Normalize price if needed
			return response.data.map((rate) => {
				if (rate.price > 1000) {
					return {
						...rate,
						price: rate.price / 100,
					};
				}
				return rate;
			});
		},
		enabled: !isEditor && !!cartItems && addresses.length > 0 && !!formData.selectedAddressId,
	});

	const shippingOptions: { id: string; name: string; price: number; estimatedDelivery: string }[] = (isEditor)
		? (MOCK_SHIPPING_OPTIONS as any)
		: (apiShippingOptions as any);
	const isShippingLoading = (isEditor) ? false : isShippingLoadingApi;

	// In editor without user, seed profile groups with mock data
	useEffect(() => {
		if (isEditor) {
			setProfileGroups(MOCK_PROFILE_GROUPS);
			// Select the first rate in each profile by default
			const defaultSelections: Record<string, string> = {};
			MOCK_PROFILE_GROUPS.forEach(group => {
				defaultSelections[group.profileId] = group.selectedRate.id;
			});
			setSelectedRateIds(defaultSelections);
		}
	}, [isEditor]);

	useEffect(() => {
		if(addresses.length > 0 && !formData.selectedAddressId) {
			setFormData((prev) => ({
				...prev,
				selectedAddressId: addresses[0].id!,
			}));
		}

		// Auto-select first shipping option when shipping options are loaded
		// or when the address changes.
		if(shippingOptions.length > 0 && (!profileGroups || profileGroups.length <= 1)) {
			setFormData((prev) => ({
				...prev,
				selectedShippingOption: shippingOptions[0].id,
			}));
		}
	}, [addresses, shippingOptions, profileGroups, formData.selectedAddressId]);

	// Clear selected rate IDs when address changes to ensure first rates are selected in new zone
	useEffect(() => {
		// Clear selections when address changes to force re-selection of first rates
		setSelectedRateIds({});
		setTotalProfileGroupsShipping(0);
	}, [formData.selectedAddressId]);

	const handleShippingOptionChange = (optionId: string) => {
		setFormData((prev) => ({
			...prev,
			selectedShippingOption: optionId,
		}));
	};
	
	const handleProfileRateSelect = (profileId: string, rateId: string) => {
		setSelectedRateIds(prev => ({
			...prev,
			[profileId]: rateId
		}));
		
		// Update total shipping cost when a rate is selected
		if (profileGroups.length > 0) {
			const newTotal = profileGroups.reduce((total, group) => {
				// For the current profile, find the newly selected rate
				if (group.profileId === profileId) {
					const selectedRate = group.rates.find(rate => rate.id === rateId);
					return total + (selectedRate?.price || 0);
				}
				// For other profiles, use the existing selected rate
				const existingRateId = selectedRateIds[group.profileId];
				const existingRate = group.rates.find(rate => rate.id === existingRateId);
				return total + (existingRate?.price || 0);
			}, 0);
			
			setTotalProfileGroupsShipping(newTotal);
		}
	};

	const handlePaymentMethodChange = (methodId: string) => {
		setFormData((prev) => ({
			...prev,
			paymentMethod: methodId,
		}));
	};

	const handleAddressSelection = (addressId: string) => {
		setFormData((prev) => ({
			...prev,
			selectedAddressId: addressId,
		}));
	};

	const handlePhoneNumberChange = (phoneNumber: string) => {
		setFormData((prev) => ({
			...prev,
			phoneNumber,
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// In editor preview, make the button a no-op
		if (isEditor) {
			return;
		}

		if (!user) {
			router.replace('/');
			return;
		}

		if (!formData.selectedAddressId) {
			toast.error("Please select a shipping address");
			return;
		}

		setIsSubmitting(true);
		setErrorMessage(null);

		try {
			const selectedAddress = addresses.find((addr) => addr.id === formData.selectedAddressId);
			if (!selectedAddress) {
				throw new Error("Selected address not found");
			}

			if(!redirectShopId) return;

			// Update user phone number if they entered one and don't have one saved
			if (!user.phoneNumber && formData.phoneNumber.trim()) {
				try {
					await userAPI.userSettingsAPI.updateUserPhoneNumber(formData.phoneNumber.trim());
					console.log("Phone number updated successfully");
				} catch (phoneError) {
					console.warn("Failed to update phone number:", phoneError);
					// Don't block the order if phone update fails, just log it
				}
			}

			// Determine which shipping options to use (profile-based or single)
			const useProfileRates = profileGroups && profileGroups.length > 1;
			
			let selectedShippingOptions: Record<string, string> = {};
			
			if (!useProfileRates) {
				// Single shipping option for the entire order
				selectedShippingOptions = {
					[redirectShopId]: formData.selectedShippingOption,
				};
			}

			console.log("Using profile-based shipping:", useProfileRates);
			if (useProfileRates) {
				console.log("Selected profile rates:", selectedRateIds);
			} else {
				console.log("Selected shipping option:", selectedShippingOptions);
			}

			// Place the order with the appropriate shipping options
			const response: PlaceOrderResponse = await placeOrder(
				user,
				cartItems,
				isBuyNow ? () => setBuyNowItem(null) : clearCart,
				selectedAddress,
				user.email || formData.email,
				formData.paymentMethod,
				user.phoneNumber || formData.phoneNumber,
				selectedShippingOptions,
				useProfileRates ? selectedRateIds : undefined
			);

			if (!response.success) {
				if (response.error && response.error.includes("Not enough inventory")) {
					const productMatch = response.error.match(/Product (\d+)/);
					const productId = productMatch ? productMatch[1] : null;
					if (productId) {
						const productItem = cartItems.find((item) => item.productId === productId);
						if (productItem) {
							throw new Error(
								`Not enough inventory available for "${productItem.product.name}". Please reduce the quantity or remove this item from your cart.`
							);
						}
					}
					throw new Error(`${response.error}. Please update your cart with a lower quantity.`);
				}
				throw new Error(response.error || "Failed to place order");
			}

			if (!response.orderId && !response.orderIds?.length) {
				console.error("Missing order information in response:", response);
				throw new Error(
					"Order was placed but no order ID was returned. Please check your orders in your account."
				);
			}

			console.log(
				"Order placed successfully, redirecting to confirmation page",
				response.orderIds || response.orderId
			);

			toast.success("Order placed successfully!");

			setTimeout(() => {
				if (response.orderIds && response.orderIds.length > 1) {
					router.push(`/checkout/confirmation?orderIds=${response.orderIds.join(",")}&redirect=${encodeURIComponent(redirectUrl || "")}`);
				} else {
					const orderId = response.orderId || response.orderIds?.[0];
					router.push(`/checkout/confirmation?orderId=${orderId}&redirect=${encodeURIComponent(redirectUrl || "")}`);
				}
			}, 200);
		} catch (error) {
			console.error("Error during checkout:", error);
			setErrorMessage(
				error instanceof Error
					? error.message
					: "There was an error processing your order. Please try again."
			);
			toast.error(
				error instanceof Error ? error.message : "Order processing failed. Please try again."
			);
			setIsSubmitting(false);
		}
	};

	useEffect(() => {
		// Skip empty-cart redirection in editor preview
		if (isEditor) return;
		if (!isLoading && !cartItems && !isSubmitting) {
			if (redirectShopId) {
				router.push(`/shops/${redirectShopId}`);
			} else {
				router.push("/account-settings");
			}
		}
	}, [isLoading, cartItems, router, isSubmitting, redirectShopId, isEditor]);

	if(!redirectShopId) {
		router.replace('/account-settings');
		return;
	}

	if (!isEditor && (isLoading || cartItems.length === 0 || isSyncing || userLoading)) {
		return (
			<div className={`${inter.className} w-full h-screen py-10 px-4 z-[900]`} style={{
				backgroundColor: "var(--background-color)"
			}}>
				<div className="flex justify-center items-center h-full">
					<p className="text-lg">Loading checkout...</p>
				</div>
			</div>
		);
	}



	if (!isEditor && user === null && !userLoading) {
		return (
			<div className={`${inter.className} container mx-auto py-10 px-4`}>
				<div className="flex flex-col items-center justify-center h-64">
					<AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
					<h2 className="text-xl font-medium mb-2">Sign in required</h2>
					<p className="text-gray-600 mb-6">Please sign in to complete your checkout</p>
					<Link
						href={"/"}
						className="bg-[#2D8080] text-white py-3 px-6 rounded hover:bg-[#236363] transition-colors"
					>
						Sign in to continue
					</Link>
				</div>
			</div>
		);
	}

	const selectedOption = shippingOptions.find((option) => option.id === formData.selectedShippingOption);

	const handleSubmittedAddress = async () => {
		setIsAddingAddress(false);
		refetchAddresses();
	};

	const isPlaceOrderDisabled =
		isSubmitting ||
		isAddressSaving ||
		isLoading ||
		isShippingLoading ||
		addresses.length === 0 ||
		!formData.selectedAddressId ||
		!formData.paymentMethod ||
		(!user?.phoneNumber && !formData.phoneNumber.trim()) ||
		(profileGroups.length > 1
			? Object.keys(selectedRateIds).length !== profileGroups.length || Object.values(selectedRateIds).some((v) => !v)
			: !formData.selectedShippingOption && shippingOptions.length > 0);

	return (
		<div className={`${inter.className} container mx-auto py-10 px-4 max-w-6xl`}>
			<div className="flex items-center text-sm text-gray-600 mb-6">
				<Link href={redirectUrl || "/"} className="hover:text-primary-500 flex items-center">
					<ArrowLeft size={16} className="mr-2" />
					<p>Back to shopping</p>
				</Link>
			</div>

			<h1 className="text-3xl font-medium mb-8">Checkout</h1>

			{errorMessage && (
				<div className="bg-error-100 border border-error-200 text-error-700 px-4 py-3 rounded mb-6">
					{errorMessage}
				</div>
			)}

			<div className="flex flex-col lg:flex-row gap-8">
				<div className="lg:w-8/12">
					{/* Contact Information */}
					<div className="bg-white border border-gray-200 rounded-lg mb-6">
						<div className="bg-primary-100/40 p-4 border-b border-gray-200">
							<h2 className="text-xl font-medium flex items-center">
								<Info className="h-5 w-5 mr-2" />
								Contact Information
							</h2>
						</div>

						<div className="p-6">
							<div className="flex flex-col sm:flex-row gap-4 sm:gap-3 sm:items-center rounded">
								<div className="flex-shrink-0">
									<div className="h-10 w-10 bg-primary-500 rounded-full items-center justify-center text-white font-medium">
										{
											user?.profilePic ? <img src={user.profilePic} alt="Profile Picture" className="h-10 w-10 rounded-full" /> 
												:
												<div className="h-10 w-10 rounded-full bg-primary-500 text-white font-medium">{user?.displayName?.[0] || "U"}</div>
										}
									</div>
								</div>
								<div className="border-b sm:border-b-0 sm:border-r border-gray-200 pb-4 sm:pb-0 sm:pr-5 sm:mr-3">
									<div className="font-medium">{user?.displayName}</div>
									<div className="text-sm text-gray-600">{user?.email}</div>
								</div>

								<div className="text-gray-700 text-sm">
									{user?.phoneNumber ? (
										<p>Phone Number: {user.phoneNumber}</p>
									) : (
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">
												Phone Number <span className="text-red-500">*</span>
											</label>
											<input
												type="tel"
												value={formData.phoneNumber}
												onChange={(e) => handlePhoneNumberChange(e.target.value)}
												placeholder="Enter your phone number"
												className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
											/>
											{!formData.phoneNumber.trim() && (
												<p className="mt-1 text-xs text-red-600">Phone number is required</p>
											)}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>

					{/* Shipping Address Selection */}
					<div className="bg-white border border-gray-200 rounded-lg mb-6">
						<div className="bg-primary-100/40 p-4 border-b border-gray-200">
							<h2 className="text-xl font-medium flex items-center">
								<MapPin className="h-5 w-5 mr-2" />
								Shipping Addresses
							</h2>
						</div>
						<div className="p-6">
							{addresses.length === 0 ? (
								<>
									{isAddressesLoading ? 
										<div className="flex justify-center items-center min-h-[150px]">
											<Loader2 className="animate-spin text-primary-500" size={40} />
										</div>
										:

										<div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
											<p className="text-gray-600 mb-4">You don't have any saved addresses</p>
											<button
												type="button"
												onClick={() => setIsAddingAddress(true)}
												className="inline-flex items-center px-4 py-2 border border-transparent rounded-md 
												shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600"
											>
												<Plus className="h-4 w-4 mr-2" />
												Add New Address
											</button>
										</div>
									}
								</> 
							) : (
									<>
										<div className="grid gap-4 md:grid-cols-2 mb-4">
											{addresses.map((address) => (
												<div
													key={address.id}
													onClick={() => handleAddressSelection(address.id || "")}
													className={`border rounded-lg p-4 cursor-pointer relative transition-all ${
formData.selectedAddressId === address.id
? "border-primary-500 bg-primary-100/50 shadow-sm"
: "border-gray-200 hover:border-gray-300"
}`}
												>
													{formData.selectedAddressId === address.id && (
														<div className="absolute top-2 right-2 h-6 w-6 bg-primary-500 rounded-full flex items-center justify-center">
															<Check className="h-4 w-4 text-white" />
														</div>
													)}
													<div className="font-medium mb-1 flex items-center gap-2">
														{address.addressType.charAt(0).toUpperCase() + address.addressType.slice(1)}
														{address.isDefault && (
															<span className="inline-block bg-info-100 text-info-700 text-xs px-2 py-0.5 rounded">
																Default
															</span>
														)}
													</div>
													<div className="text-sm text-gray-600">
														<p>
															{address.buildingNumber} {address.streetName}
														</p>
														<p>
															{address.district && `${address.district}, `}
															{address.city}
														</p>
														<p>
															{address.governate}, {address.region}
														</p>
														<p>{address.zipCode}</p>
													</div>
													{address.deliveryNotes && (
														<div className="mt-2 text-xs text-gray-500">
															<p>Notes: {address.deliveryNotes}</p>
														</div>
													)}
												</div>
											))}
											{isRefetching || isAddressSaving ?
												<div className="flex justify-center items-center p-4">
													<Loader2 className="animate-spin text-gray-400" size={24} />
												</div>
											:
											<div
												onClick={() => setIsAddingAddress(true)}
												className="border border-dashed border-gray-300 rounded-lg p-4 cursor-pointer flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
											>
												<Plus className="h-6 w-6 mb-2" />
												<span>Add New Address</span>
											</div> }
										</div>
									</>
								)}
							{isAddingAddress && (
								<div className="border border-gray-200 p-4 rounded-lg mt-4">
									<div className="flex justify-between items-center mb-4">
										<h3 className="text-lg font-medium">Add New Address</h3>
										<button
											type="button"
											disabled={isAddressSaving || isRefetching}
											onClick={() => setIsAddingAddress(false)}
											className="text-gray-400 hover:text-gray-500 disabled:text-gray-200 disabled:hover:text-gray-200"
										>
											<X size={20} />
										</button>
									</div>
									<AddressForm setIsLoading={setIsAddressSaving} onSubmitted={handleSubmittedAddress} onCancel={() => setIsAddingAddress(false)} isFirstAddress={addresses.length === 0} />
								</div>
							)}
						</div>
					</div>

					{/* Shipping Options for the single shop */}
					<div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
						<div className="bg-primary-100/40 p-4 border-b border-gray-200">
							<h2 className="text-xl font-medium flex items-center">
								<Truck className="h-5 w-5 mr-2" />
								Shipping Options
							</h2>
						</div>
						<div className="p-6">
							{isShippingLoading && ( 
								<div className="flex justify-center items-center min-h-[300px]">
									<Loader2 className="h-10 w-10 animate-spin text-gray-400" />
								</div>
							)}
							
							{!isShippingLoading && (
								<>
									{/* Show profile groups if there are multiple */}
									{profileGroups && profileGroups.length > 1 ? (
										<ShippingProfileGroups
											profileGroups={profileGroups}
											onRateSelect={handleProfileRateSelect}
											selectedRates={selectedRateIds}
											isLoading={isShippingLoading}
											currency={cartItems[0]?.product?.currency || 'EGP'}
										/>
									) : (
										// Show regular shipping options if only one profile or no profiles
										<div className="space-y-3">
											{shippingOptions.length === 0 ? (
												<div className="text-center py-6 text-gray-500">
													<p>No shipping options available for the selected address.</p>
													<p className="text-sm mt-2">Please select a different address or contact support.</p>
												</div>
											) : (
												shippingOptions.map((option) => (
													<div
														key={option.id}
														className={`border rounded p-3 cursor-pointer flex items-start transition-all ${
															formData.selectedShippingOption === option.id
																? "border-primary-500 bg-primary-100/50"
																: "border-gray-200 hover:border-gray-300"
														}`}
														onClick={() => handleShippingOptionChange(option.id)}
													>
														{/* Custom radio button replacement */}
														<div className="flex-shrink-0 mt-1 mr-3">
															<div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
																formData.selectedShippingOption === option.id
																	? "border-primary-500 bg-primary-500" 
																	: "border-gray-300"
															}`}>
																{formData.selectedShippingOption === option.id && (
																	<div className="w-2 h-2 rounded-full bg-white"></div>
																)}
															</div>
														</div>
														
														<div className="flex-1">
															<div className="block font-medium cursor-pointer">
																{option.name} {option.price > 0 ? `($${option.price.toFixed(2)})` : "(Free)"}
															</div>
															<div className="text-sm text-gray-600">{option.estimatedDelivery}</div>
														</div>
													</div>
												))
											)}
										</div>
									)}
									
									{/* Validation message for shipping rates */}
									{!isShippingLoading && (
										(profileGroups.length > 1 && (Object.keys(selectedRateIds).length !== profileGroups.length || Object.values(selectedRateIds).some((v) => !v))) ||
										(profileGroups.length <= 1 && shippingOptions.length > 0 && !formData.selectedShippingOption)
									) && (
										<div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
											<div className="flex items-center">
												<AlertTriangle className="h-4 w-4 text-amber-600 mr-2" />
												<p className="text-sm text-amber-700">
													Please select a shipping option to continue.
												</p>
											</div>
										</div>
									)}
								</>
							)}
						</div>
					</div>

					{/* Payment Method */}
					<div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
						<div className="bg-primary-100/40 p-4 border-b border-gray-200">
							<h2 className="text-xl font-medium flex items-center">
								<CreditCard className="h-5 w-5 mr-2" />
								Payment Method
							</h2>
						</div>
						<div className="p-6 space-y-3">
							{paymentMethods.map((method: any) => (
								<div
									key={method.id}
									className={`border rounded p-3 cursor-pointer flex items-center transition-all ${
formData.paymentMethod === method.id
? "border-primary-500 bg-primary-100/50"
: "border-gray-200 hover:border-gray-300"
}`}
									onClick={() => handlePaymentMethodChange(method.id)}
								>
									{/* Custom radio button replacement */}
									<div className="flex-shrink-0 mr-3">
										<div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
											formData.paymentMethod === method.id
												? "border-primary-500 bg-primary-500" 
												: "border-gray-300"
										}`}>
											{formData.paymentMethod === method.id && (
												<div className="w-2 h-2 rounded-full bg-white"></div>
											)}
										</div>
									</div>
									
									<div className="font-medium cursor-pointer flex-1">
										{method.label}
									</div>
									{method.type === "creditCard" && (
										<div className="flex space-x-1">
											<img
												src="/brands-logos/visa.svg"
												alt="Visa"
												className="h-6 w-10 object-contain"
											/>
											<img
												src="/brands-logos/mastercard.svg"
												alt="Mastercard"
												className="h-6 w-10 object-contain"
											/>
										</div>
									)}
									{method.type === "paypal" && (
										<img
											src="/brands-logos/paypal.svg"
											alt="PayPal"
											className="h-6 w-10 object-contain"
										/>
									)}
									{method.type === "cash" && (
									<Truck className="h-6 w-10 object-contain" />
									)}
									{method.type === "applePay" && (
										<svg
											className="h-6 w-10"
											viewBox="0 0 38 24"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
										>
											<rect width="38" height="24" rx="4" fill="#F5F5F7" />
											<path
												d="M13.305 7.516c-.595.722-.937 1.623-.937 2.58 0 .821.304 1.587.835 2.174.532.587 1.262.937 2.055.987-.04.683-.351 1.341-.873 1.825-.524.484-1.214.752-1.936.752-.258 0-.514-.034-.763-.103-.249-.069-.489-.17-.712-.304-.224-.134-.431-.301-.613-.496-.183-.194-.339-.417-.464-.658-.125-.241-.215-.5-.269-.765-.054-.267-.08-.538-.08-.81 0-.365.043-.726.127-1.072.085-.347.209-.674.367-.976.159-.304.355-.585.584-.841.228-.256.483-.475.755-.658.271-.183.557-.329.851-.436.294-.107.594-.162.889-.162.254 0 .507.033.756.103.249.069.487.17.705.304.219.134.421.301.6.496.18.194.334.418.458.658.125.24.214.5.268.764.053.267.08.539.08.811 0 .365-.043.726-.127 1.072-.085.346-.209.673-.366.976-.158.303-.35.588-.571.851-.22.264-.468.489-.735.672-.267.183-.548.329-.837.436-.289.107-.584.162-.877.162h-.15"
												fill="#000"
											/>
											<path
												d="M25.55 7.778c-.168.212-.301.45-.394.703-.93.252-.145.518-.154.788-.008.269.029.538.108.797.08.259.198.504.349.724.151.22.335.412.545.57.21.159.444.282.69.364.247.082.505.123.764.123.258 0 .515-.041.761-.123.247-.082.48-.205.691-.364.21-.158.395-.35.546-.57.15-.22.268-.465.348-.724.08-.26.116-.528.108-.797-.009-.27-.06-.536-.153-.788-.093-.253-.226-.491-.394-.703a2.526 2.526 0 00-1.907-.864c-.362 0-.72.07-1.05.21-.332.141-.631.347-.858.654zm-2.072.186c.1-.253.233-.49.396-.704.163-.215.352-.407.563-.57.211-.162.444-.293.689-.39.245-.096.502-.16.763-.19a4.21 4.21 0 01.823-.018c.271.017.538.062.797.134.26.072.51.17.747.294a3.98 3.98 0 011.288 1.03c.168.22.311.456.43.703.118.247.212.505.278.772.067.268.107.54.12.815a4.36 4.36 0 01-.064.833 4.28 4.28 0 01-.247.802 4.094 4.094 0 01-.41.736 3.975 3.975 0 01-.558.636 3.906 3.906 0 01-.686.508 3.851 3.851 0 01-.775.352 3.807 3.807 0 01-1.728.089 3.719 3.719 0 01-.81-.236 3.675 3.675 0 01-.722-.405 3.63 3.63 0 01-.61-.55 3.573 3.573 0 01-.473-.665 3.519 3.519 0 01-.314-.747 3.462 3.462 0 01-.139-.79 3.413 3.413 0 01.045-.797c.041-.264.11-.522.204-.77z"
												fill="#000"
											/>
										</svg>
									)}
									{method.type === "googlePay" && (
										<svg
											className="h-6 w-10"
											viewBox="0 0 38 24"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
										>
											<rect width="38" height="24" rx="4" fill="#F5F5F7" />
											<path
												d="M19.512 12.286v2.286h-1.024v-5.714h2.702c.55 0 1.024.195 1.42.587.397.39.595.862.595 1.412 0 .56-.198 1.034-.595 1.424-.396.39-.87.586-1.42.586h-1.678zm0-2.429v1.429h1.699c.305 0 .559-.098.763-.293.204-.196.306-.434.306-.715 0-.272-.102-.505-.306-.7a1.03 1.03 0 00-.763-.292h-1.699zm5.469-1v5.715h-1.024v-5.714h1.024zm3.115-.857a.621.621 0 01.451.183.601.601 0 01.185.45.601.601 0 01-.185.45.621.621 0 01-.451.183.621.621 0 01-.452-.182.601.601 0 01-.185-.45c0-.178.062-.328.185-.45a.621.621 0 01.452-.184zM27.584 9v5.714h-1.024V9h1.024zm3.14 5.857c-.578 0-1.052-.193-1.42-.578-.368-.385-.551-.866-.551-1.443v-.107c0-.382.073-.728.22-1.036a1.69 1.69 0 01.628-.729c.272-.182.572-.273.9-.273.549 0 .977.187 1.283.56.306.373.459.902.459 1.587v.321h-2.466a1.18 1.18 0 00.371.836c.21.206.476.309.797.309.459 0 .84-.187 1.146-.56l.437.51a1.674 1.674 0 01-.666.525 2.153 2.153 0 01-.917.178zm-.242-3.322c-.263 0-.486.095-.667.286-.182.19-.294.459-.338.807h1.93v-.059c-.025-.33-.116-.585-.273-.764-.157-.18-.371-.27-.644-.27zm-17.387-1.678a2.3 2.3 0 00-.371-.029c-.69 0-1.155.262-1.393.786V14.5h-1.024V9h.997l.014.592c.331-.457.792-.685 1.382-.685.194 0 .34.026.438.078l-.043 1.072z"
												fill="#3C4043"
											/>
										</svg>
									)}
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Right column - Order Summary */}
				<div className="md:w-5/12 lg:w-4/12 mt-8 md:mt-0">
					<div className="sticky top-20">
						<OrderSummary
							items={cartItems}
							subtotal={cartItems.reduce((total, item) => {
								const finalPrice = calculateFinalPrice(item);
								return total + (finalPrice * item.quantity);
							}, 0)}
							shippingCost={profileGroups.length > 1 ? totalProfileGroupsShipping : (selectedOption?.price || 0)}
							isCheckoutPage={true}
							isShippingLoading={isShippingLoading}
						/>
						<div className="mt-2">
							<button
								type="submit"
								onClick={handleSubmit}
								className={`w-full py-3 px-4 bg-primary-500 disabled:bg-primary-200 text-white rounded-md font-medium focus:outline-none \
focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 hover:bg-primary-600 transition-colors ${
isPlaceOrderDisabled ? "opacity-70 cursor-not-allowed" : ""
}`}
								disabled={isPlaceOrderDisabled}
							>
								{isSubmitting ? "Processing..." : "Place Order"}
							</button>
							
							{/* Validation messages */}
							{isPlaceOrderDisabled && !isSubmitting && !isLoading && !isShippingLoading && (
								<div className="mt-2 text-sm text-red-600 space-y-1">
									{!user?.phoneNumber && !formData.phoneNumber.trim() && (
										<p>• Phone number is required</p>
									)}
									{(profileGroups.length > 1 
										? Object.keys(selectedRateIds).length !== profileGroups.length || Object.values(selectedRateIds).some((v) => !v)
										: !formData.selectedShippingOption && shippingOptions.length > 0
									) && (
										<p>• Please select a shipping option</p>
									)}
									{addresses.length === 0 && (
										<p>• Please add a shipping address</p>
									)}
									{!formData.selectedAddressId && addresses.length > 0 && (
										<p>• Please select a shipping address</p>
									)}
									{!formData.paymentMethod && (
										<p>• Please select a payment method</p>
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

interface AddressFormProps {
	onCancel: () => void;
	initialAddress?: UserAddress;
	isFirstAddress?: boolean;
	setIsLoading: (isLoading: boolean) => void;
	onSubmitted: () => void;
}

const AddressForm = ({
	onCancel,
	initialAddress,
	setIsLoading,
	onSubmitted,
	isFirstAddress,
}: AddressFormProps) => {
	const [isSaving, setIsSaving] = useState(false);
	const [locationData, setLocationData] = useState<LocationData[]>([]);
	const [isLoadingLocations, setIsLoadingLocations] = useState(false);
	const [availableCities, setAvailableCities] = useState<City[]>([]);
	const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
	} = useForm<UserAddress>({
		defaultValues: initialAddress || {},
	});

	// Watch governorate for dynamic city updates
	const watchGovernorate = watch("governate");
	const watchCity = watch("city");

	// Load location data on component mount
	useEffect(() => {
		const fetchLocationData = async () => {
			setIsLoadingLocations(true);
			try {
				const response = await getLocationData();
				if (response.success && response.data) {
					setLocationData(response.data);
				} else {
					toast.error("Failed to load location data");
				}
			} catch (error) {
				console.error("Error fetching location data:", error);
				toast.error("Failed to load location data");
			} finally {
				setIsLoadingLocations(false);
			}
		};

		fetchLocationData();
	}, []);

	// Update available cities when governorate changes
	useEffect(() => {
		if (watchGovernorate && locationData.length > 0) {
			const governorate = locationData.find(gov => gov.code === watchGovernorate);
			if (governorate) {
				setAvailableCities(governorate.cities);
				// Reset city when governorate changes
				setValue("city", "");
				setValue("district", "");
			} else {
				setAvailableCities([]);
			}
		} else {
			setAvailableCities([]);
		}
	}, [watchGovernorate, locationData, setValue]);

	// Update available districts when city changes
	useEffect(() => {
		if (watchCity) {
			const city = availableCities.find(c => c.code === watchCity);
			if (city && city.districts) {
				setAvailableDistricts(city.districts);
			} else {
				setAvailableDistricts([]);
			}
			// Reset district when city changes
			setValue("district", "");
		} else {
			setAvailableDistricts([]);
		}
	}, [watchCity, availableCities, setValue]);

	// Handle the case where this is the first address
	useEffect(() => {
		if (isFirstAddress) {
			setValue("isDefault", true);
		}
	}, [isFirstAddress, setValue]);

	const handleSaveAddress = async (data: UserAddress) => {
		try {
			setIsSaving(true);
			setIsLoading(true);
			onCancel();

			let savedAddress: UserAddress;

			if (initialAddress?.id) {
				// Update existing address
				savedAddress = await userSettingsAPI.updateUserAddress(initialAddress.id, data);
			} else {
				// Add new address
				savedAddress = await userSettingsAPI.addUserAddress(data);
			}

			// onSubmit({ ...savedAddress, id: savedAddress.id! } as UserAddress);
			toast.success("Address saved successfully");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to save address");
		} finally {
			setIsLoading(false);
			setIsSaving(false);
			onSubmitted();
		}
	};

	return (
		<form
			onSubmit={handleSubmit(handleSaveAddress)}
			className="space-y-4 sm:space-y-6"
		>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
						Region <span className="text-red-500 ml-1">*</span>
					</label>
					<select
						{...register("region", { required: true })}
						className={`w-full p-2.5 border rounded-md focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none transition-colors ${errors.region ? 'border-red-500' : 'border-gray-300'}`}
					>
						<option value="EGY">Egypt</option>
					</select>
					{errors.region && <p className="mt-1 text-sm text-red-600">Region is required</p>}
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
						Governorate <span className="text-red-500 ml-1">*</span>
					</label>
					{isLoadingLocations ? (
						<div className="w-full p-2.5 border border-gray-300 rounded-md bg-gray-50">
							<Loader2 className="h-4 w-4 animate-spin text-gray-400" />
						</div>
					) : (
						<select
							{...register("governate", { required: true })}
							className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none transition-colors"
						>
							<option value="">Select Governorate</option>
							{locationData.map((governorate) => (
								<option key={governorate.code} value={governorate.code}>
									{governorate.name}
								</option>
							))}
						</select>
					)}
					{errors.governate && (
						<p className="mt-1 text-sm text-red-600">Governorate is required</p>
					)}
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
						City <span className="text-red-500 ml-1">*</span>
					</label>
					<select
						{...register("city", { required: true })}
						className={`w-full p-2.5 border rounded-md focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none transition-colors ${errors.city ? 'border-red-500' : 'border-gray-300'}`}
						disabled={!watchGovernorate || availableCities.length === 0}
					>
						<option value="">Select City</option>
						{availableCities.map((city) => (
							<option key={city.code} value={city.code}>
								{city.name}
							</option>
						))}
					</select>
					{errors.city && <p className="mt-1 text-sm text-red-600">City is required</p>}
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">District</label>
					<select
						{...register("district")}
						className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none transition-colors"
						disabled={availableDistricts.length === 0}
					>
						<option value="">{availableDistricts.length > 0 ? "Select District" : "No districts available (Optional)"}</option>
						{availableDistricts.map((district) => (
							<option key={district} value={district}>
								{district}
							</option>
						))}
					</select>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
						Street Name <span className="text-red-500 ml-1">*</span>
					</label>
					<input
						{...register("streetName", { required: true })}
						className={`w-full p-2.5 border rounded-md focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none transition-colors ${errors.streetName ? 'border-red-500' : 'border-gray-300'}`}
					/>
					{errors.streetName && (
						<p className="mt-1 text-sm text-red-600">Street name is required</p>
					)}
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Building Number
					</label>
					<input
						{...register("buildingNumber", { required: true })}
						className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none transition-colors"
					/>
					{errors.buildingNumber && (
						<p className="mt-1 text-sm text-red-600">Building number is required</p>
					)}
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
					<input
						{...register("zipCode")}
						className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none transition-colors"
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Address Type</label>
					<select
						{...register("addressType")}
						className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none transition-colors"
					>
						<option value="apartment">Apartment</option>
						<option value="office">Office</option>
						<option value="villa">Villa</option>
						<option value="other">Other</option>
					</select>
				</div>

				<div className="col-span-1 md:col-span-2">
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Package Location
					</label>
					<input
						{...register("packageLocation")}
						className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none transition-colors"
					/>
				</div>

				<div className="col-span-1 md:col-span-2">
					<label className="block text-sm font-medium text-gray-700 mb-1">Delivery Notes</label>
					<textarea
						{...register("deliveryNotes")}
						className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none transition-colors"
						rows={2}
					></textarea>
				</div>

				<div className="col-span-1 md:col-span-2">
					<label
						className={`flex items-start ${isFirstAddress ? "cursor-not-allowed" : ""}`}
					>
						<input
							type="checkbox"
							disabled={isFirstAddress}
							className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-200 mr-2 mt-0.5 flex-shrink-0"
							{...register("isDefault")}
						/>
						<div className="flex flex-col">
							<span className="text-sm">Set as default address</span>
							{isFirstAddress && (
								<span className="text-xs text-gray-600 mt-1">
									Your first address will be set as default automatically
								</span>
							)}
						</div>
					</label>
				</div>
			</div>

			<div className="flex flex-col sm:flex-row gap-3 pt-2">
				<button
					type="submit"
					disabled={isSaving}
					className={`px-4 py-2 ${
isSaving ? "bg-primary-200" : "bg-primary-500"
} text-white rounded-md hover:bg-primary-600 transition-colors flex items-center justify-center min-w-[120px]`}
				>
					{isSaving ? (
						<>
							<Loader2 className="animate-spin mr-2" size={16} />
							<span>Saving...</span>
						</>
					) : (
							"Save Address"
						)}
				</button>
				<button
					type="button"
					onClick={onCancel}
					disabled={isSaving}
					className={`px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors ${
isSaving ? "opacity-50 cursor-not-allowed" : ""
}`}
				>
					Cancel
				</button>
			</div>
		</form>
	);
};

export default CheckoutPage;
