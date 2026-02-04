'use client';

import { useEffect } from 'react';
import { useSiteSettings } from '@/osdl/contexts/SiteSettingsContext';

const SiteSettingsLogger: React.FC = () => {
  const siteSettings = useSiteSettings();

  useEffect(() => {
    console.log('SiteSettingsLogger: SiteSettings from context:', siteSettings);
  }, [siteSettings]);

  return null; // This component does not render anything
};

export default SiteSettingsLogger; 