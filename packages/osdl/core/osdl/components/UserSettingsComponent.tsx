'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { userSettingsAPI } from '@/services/api/user';
import { toast } from 'react-toastify';
import { useData } from '@/osdl/contexts/DataContext';
import {
  InputSkeleton,
  SelectSkeleton,
  CheckboxGroupSkeleton,
  AddressCardSkeleton,
} from '@/components/settings/ui/skeletons';
import { ProfileSettings } from '@/components/settings/ui/profileSettings';
import { AddressSettings } from '@/components/settings/ui/addressSettings';
import { Menu, X } from 'lucide-react';
import { ComponentNode } from '@/OSDL.types';
import { useNavigation } from '@/app/shop-manager/website/edit/iframe/utils/context/NavigationProvider';
import SignInRequiredOverlay from '@/osdl/components/utils/SignInRequiredOverlay';

interface UserSettingsComponentProps {
  id: string;
  nodeSchema: ComponentNode;
  style?: React.CSSProperties;
  className?: string;
}

function safeDeepCopy<T>(data: T): T {
  if (data === undefined || data === null) return data as T;
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return Array.isArray(data)
      ? ([...data] as unknown as T)
      : typeof data === 'object'
      ? ({ ...(data as object) } as T)
      : data;
  }
}

export default function UserSettingsComponent({ id, style, className }: UserSettingsComponentProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [menuHeight, setMenuHeight] = useState<string>('50vh');
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [saveEnabled, setSaveEnabled] = useState<Record<string, boolean>>({
    profile: false,
    addresses: false,
  });
  const [initialLoad, setInitialLoad] = useState(true);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [originalData, setOriginalData] = useState<Record<string, any>>({});
  const [loadedTabs, setLoadedTabs] = useState<string[]>([]);
  const [loadingTabRef, setLoadingTabRef] = useState<string | null>(null);
  const currentLoadingTabRef = useRef<string | null>(null);

  const { userInfo } = useData();
  const { isEditMode } = useNavigation();
  const isEditor = !!isEditMode || (typeof window !== 'undefined' && window.location.pathname.includes('/shop-manager/website/edit/'));
  const hasUser = !!(userInfo && userInfo.isAuthenticated && userInfo.profile);

  const handleSnapOrClose = (currentVh: number) => {
    const defaultHeight = 50;
    const maxHeight = 80;
    if (currentVh < defaultHeight * 0.7) {
      setIsMobileMenuOpen(false);
      return `${defaultHeight}vh`;
    }
    return `${currentVh > (defaultHeight + maxHeight) / 2 ? maxHeight : defaultHeight}vh`;
  };

  useEffect(() => {
    if (initialLoad) {
      setIsLoading(true);
      setActiveTab('profile');
      setInitialLoad(false);
    }
  }, [initialLoad]);

  useEffect(() => {
    const preloadTabsSequentially = async () => {
      const allTabs = ['profile', 'addresses'];
      const tabsToPreload = allTabs
        .filter((tab) => !loadedTabs.includes(tab))
        .filter((tab) => tab !== currentLoadingTabRef.current)
        .filter((tab) => tab !== activeTab);
      if (tabsToPreload.length === 0) return;
      for (const tab of tabsToPreload) {
        if (currentLoadingTabRef.current && currentLoadingTabRef.current !== tab) continue;
        if (!loadedTabs.includes(activeTab)) break;
        try {
          await loadTabData(tab);
          await new Promise((resolve) => setTimeout(resolve, 400));
        } catch (error) {
          console.error(`Failed to preload ${tab} data:`, error);
        }
      }
    };
    if (!initialLoad && loadedTabs.includes(activeTab)) {
      preloadTabsSequentially();
    }
  }, [initialLoad, loadedTabs, activeTab]);

  const loadTabData = useCallback(
    async (tabName: string) => {
      if (loadedTabs.includes(tabName)) {
        if (tabName === activeTab) setIsLoading(false);
        return null;
      }
      currentLoadingTabRef.current = tabName;
      setLoadingTabRef(tabName);
      try {
        if (tabName === activeTab) setIsLoading(true);
        let data: any = null;
        switch (tabName) {
          case 'profile':
            data = await userSettingsAPI.getUserProfile();
            break;
          case 'addresses':
            data = await userSettingsAPI.getUserAddresses();
            break;
        }
        if (data) {
          setFormData((prev) => ({ ...prev, [tabName]: data }));
          setOriginalData((prev) => ({ ...prev, [tabName]: safeDeepCopy(data) }));
          setSaveEnabled((prev) => ({ ...prev, [tabName]: false }));
          setLoadedTabs((prev) => [...prev, tabName]);
        }
        return data;
      } catch (error) {
        if (tabName === activeTab) {
          toast.error(error instanceof Error ? error.message : 'Failed to load data');
        } else {
          console.error(`Failed to preload ${tabName} data:`, error);
        }
        return null;
      } finally {
        if (tabName === activeTab) setIsLoading(false);
        if (currentLoadingTabRef.current === tabName) currentLoadingTabRef.current = null;
      }
    },
    [activeTab, loadedTabs]
  );

  const handleTabChange = useCallback(
    (tabName: 'profile' | 'addresses') => {
      setActiveTab(tabName);
      if (!loadedTabs.includes(tabName)) setIsLoading(true);
      else setIsLoading(false);
    },
    [loadedTabs]
  );

  useEffect(() => {
    if (!initialLoad) {
      if (!loadedTabs.includes(activeTab)) loadTabData(activeTab);
      else setIsLoading(false);
    }
  }, [activeTab, initialLoad, loadTabData, loadedTabs]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      switch (activeTab) {
        case 'profile':
          await userSettingsAPI.updateUserProfile(formData.profile);
          setOriginalData((prev) => ({ ...prev, profile: safeDeepCopy(formData.profile) }));
          break;
        case 'addresses':
          // Implement address updates when API supports it
          break;
      }
      setSaveEnabled((prev) => ({ ...prev, [activeTab]: false }));
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateFormData = (tabName: string, data: any) => {
    const { _isUnchanged, ...cleanData } = data as { _isUnchanged?: boolean; [key: string]: any };
    const isUploading = Object.values(cleanData).some((value) => value === 'loading');
    if (isUploading) {
      setFormData((prev) => ({ ...prev, [tabName]: cleanData }));
      return;
    }
    setFormData((prev) => ({ ...prev, [tabName]: cleanData }));
    if (_isUnchanged !== undefined) {
      setSaveEnabled((prev) => ({ ...prev, [tabName]: !_isUnchanged }));
      return;
    }
    try {
      if (!originalData[tabName]) {
        setSaveEnabled((prev) => ({ ...prev, [tabName]: false }));
        return;
      }
      const original = originalData[tabName];
      const isChanged = Object.keys({ ...cleanData, ...original }).some((key) => {
        const originalValue = original[key] || '';
        const newValue = cleanData[key] || '';
        if (['profilePic', 'personalImage', 'idDocument', 'addressDocument'].includes(key)) {
          if (!originalValue && !newValue) return false;
          return originalValue !== newValue;
        }
        if (Array.isArray(originalValue) && Array.isArray(newValue)) {
          if (originalValue.length === 0 && newValue.length === 0) return false;
          if (
            originalValue.every((item: any) => typeof item !== 'object') &&
            newValue.every((item: any) => typeof item !== 'object')
          ) {
            return JSON.stringify([...originalValue].sort()) !== JSON.stringify([...newValue].sort());
          }
        }
        return JSON.stringify(originalValue) !== JSON.stringify(newValue);
      });
      setSaveEnabled((prev) => ({ ...prev, [tabName]: isChanged }));
    } catch (error) {
      console.warn(`Could not compare data for ${tabName}`, error);
      setSaveEnabled((prev) => ({ ...prev, [tabName]: false }));
    }
  };

  const components = {
    profile:
      isLoading || !formData.profile ? (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse"></div>
              <div className="h-8 w-40 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputSkeleton />
              <InputSkeleton />
              <InputSkeleton />
              <InputSkeleton />
              <InputSkeleton />
              <SelectSkeleton />
            </div>
            <CheckboxGroupSkeleton />
          </div>
        </div>
      ) : (
        <ProfileSettings onFormChange={(data) => updateFormData('profile', data)} initialData={formData.profile} />
      ),
    
    addresses:
      isLoading || !formData.addresses ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse ml-auto"></div>
          </div>
          <div className="space-y-4 mt-4">
            <AddressCardSkeleton />
            <AddressCardSkeleton />
          </div>
        </div>
      ) : (
        <AddressSettings onFormChange={(data) => updateFormData('addresses', data)} initialData={formData.addresses} />
      ),
  } as const;

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const handleMobileTabChange = (tabName: 'profile' | 'addresses') => {
    handleTabChange(tabName);
    setIsMobileMenuOpen(false);
  };

  // If we're in the editor and no user is available, show a blurred placeholder with guidance
  if (isEditor && !hasUser) {
    return (
      <div id={id} style={style} className={className}>
        <div className="relative">
          <div className="min-h-screen flex">
            {/* Sidebar skeleton */}
            <div className="hidden md:block w-64 border-r border-gray-100 p-3">
              <div className="mb-6">
                <div className="h-5 w-28 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-40 bg-gray-200 rounded" />
              </div>
              <div>
                <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
                <div className="space-y-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-9 bg-gray-200 rounded" />
                  ))}
                </div>
              </div>
            </div>

            {/* Main content skeleton */}
            <main className="flex-1 p-4 md:p-8 ">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md bg-gray-200 md:hidden" />
                    <div className="h-6 w-48 bg-gray-200 rounded" />
                  </div>
                  <div className="h-10 w-32 bg-gray-200 rounded" />
                </div>

                <div className="space-y-6">
                  {/* Avatar row */}
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-full bg-gray-200" />
                    <div className="flex-1">
                      <div className="h-5 w-40 bg-gray-200 rounded mb-2" />
                      <div className="h-4 w-32 bg-gray-200 rounded" />
                    </div>
                  </div>

                  {/* Inputs grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1,2,3,4,5,6].map(i => (
                      <div key={i} className="h-10 bg-gray-200 rounded" />
                    ))}
                  </div>

                  {/* Addresses cards */}
                  <div className="space-y-4">
                    {[1,2].map(i => (
                      <div key={i} className="h-24 bg-gray-200 rounded" />
                    ))}
                  </div>
                </div>
              </div>
            </main>
          </div>

          {/* Overlay message */}
          <SignInRequiredOverlay />
        </div>
      </div>
    );
  }

  return (
    <div id={id} style={style} className={className}>
      <div className="flex flex-col min-h-screen">
        <div className="flex flex-col md:flex-row flex-1">
          <div className="hidden md:block w-64 border-r border-gray-100 p-3">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-primary-600 mb-1">Settings</h2>
              <p className="text-xs text-gray-500">Manage your account preferences</p>
            </div>
            <nav className="text-sm">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-tigher mb-3">User Settings</h3>
              <div className="space-y-1 mb-6">
                <button
                  onClick={() => handleTabChange('profile')}
                  className={`w-full text-left py-2 px-3 rounded-md transition-colors ${
                    activeTab === 'profile' ? 'bg-primary-500 text-primary-100 font-medium' : 'text-gray-700 hover:bg-primary-100'
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => handleTabChange('addresses')}
                  className={`w-full text-left py-2 px-3 rounded-md transition-colors ${
                    activeTab === 'addresses' ? 'bg-primary-500 text-primary-100 font-medium' : 'text-gray-700 hover:bg-primary-100'
                  }`}
                >
                  Addresses
                </button>
                
              </div>
            </nav>
          </div>

          <main className="flex-1 p-4 md:p-8 ">
            <div className="max-w-3xl mx-auto">
              <div className="flex flex-col gap-4 mb-8 pb-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleMobileMenu}
                      className="p-2 rounded-md text-gray-600 hover:bg-gray-100 md:hidden"
                      aria-label="Toggle menu"
                    >
                      {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                    <h1 className="text-xl md:text-2xl font-bold text-primary-600">
                      {activeTab === 'profile' && 'Profile Settings'}
                      {activeTab === 'addresses' && 'My Addresses'}
                      
                    </h1>
                  </div>
                  {true && (
                    <button
                      onClick={handleSave}
                      disabled={!saveEnabled[activeTab] || isLoading || isSaving}
                      className={`px-5 py-2 rounded-md transition-colors md:w-auto ${
                        saveEnabled[activeTab] && !isLoading && !isSaving
                          ? 'bg-primary-500 text-white hover:bg-primay-600'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-lg">{components[activeTab]}</div>
            </div>
          </main>

          <div
            ref={menuRef}
            style={{ height: menuHeight }}
            className={`
              fixed inset-x-0 bottom-0
              transform ${isMobileMenuOpen ? 'translate-y-0' : 'translate-y-full'}
              ${!isDraggingRef.current ? 'transition-all duration-300 ease-in-out' : ''}
              md:hidden
              bg-white
              rounded-t-2xl
              shadow-lg
              z-[9999]
              overflow-y-auto
            `}
          >
            <div>
              <div
                className="sticky top-0 left-0 right-0 z-20 flex justify-center items-center h-8 touch-none bg-white rounded-t-2xl"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget || (e.target as HTMLElement).parentElement === e.currentTarget) {
                    isDraggingRef.current = true;
                    startYRef.current = e.clientY;
                    startHeightRef.current = menuRef.current?.offsetHeight || 0;
                    e.preventDefault();
                  }
                  const handleMouseMove = (e: MouseEvent) => {
                    if (!isDraggingRef.current) return;
                    const deltaY = startYRef.current - e.clientY;
                    const newHeight = startHeightRef.current + deltaY;
                    const vh = (newHeight / window.innerHeight) * 100;
                    setMenuHeight(`${vh}vh`);
                  };
                  const handleMouseUp = () => {
                    isDraggingRef.current = false;
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                    const currentVh = ((menuRef.current?.offsetHeight || 0) / window.innerHeight) * 100;
                    setMenuHeight(handleSnapOrClose(currentVh));
                  };
                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
                onTouchStart={(e) => {
                  if (e.target === e.currentTarget || (e.target as HTMLElement).parentElement === e.currentTarget) {
                    isDraggingRef.current = true;
                    startYRef.current = e.touches[0].clientY;
                    startHeightRef.current = menuRef.current?.offsetHeight || 0;
                    e.preventDefault();
                  }
                }}
                onTouchMove={(e) => {
                  if (!isDraggingRef.current) return;
                  e.preventDefault();
                  const deltaY = startYRef.current - e.touches[0].clientY;
                  const newHeight = startHeightRef.current + deltaY;
                  const vh = (newHeight / window.innerHeight) * 100;
                  setMenuHeight(`${vh}vh`);
                }}
                onTouchEnd={() => {
                  if (!isDraggingRef.current) return;
                  isDraggingRef.current = false;
                  const currentVh = ((menuRef.current?.offsetHeight || 0) / window.innerHeight) * 100;
                  setMenuHeight(handleSnapOrClose(currentVh));
                }}
              >
                <div className="w-8 h-1 bg-gray-300 rounded-full" />
              </div>
              <div className="p-4">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-primary-600 mb-1">Settings</h2>
                </div>
                <nav className="text-sm">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">User Settings</h3>
                  <div className="space-y-2 mb-6">
                    <button
                      onClick={() => handleMobileTabChange('profile')}
                      className={`w-full text-left py-3 px-4 rounded-md transition-colors ${
                        activeTab === 'profile' ? 'bg-primary-500 text-primary-100 font-medium' : 'text-gray-700 hover:bg-primary-100'
                      }`}
                    >
                      Profile
                    </button>
                    <button
                      onClick={() => handleMobileTabChange('addresses')}
                      className={`w-full text-left py-3 px-4 rounded-md transition-colors ${
                        activeTab === 'addresses' ? 'bg-primary-500 text-primary-100 font-medium' : 'text-gray-700 hover:bg-primary-100'
                      }`}
                    >
                      Addresses
                    </button>
                    
                  </div>
                </nav>
              </div>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div className="fixed inset-0 bg-black/50 z-[9998] md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
          )}
        </div>
      </div>
    </div>
  );
}

