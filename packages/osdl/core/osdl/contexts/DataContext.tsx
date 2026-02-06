import React from 'react';
import { DataRequirementConfig } from '@/OSDL.types';

export interface PageInfo {
  id?: string; // From PageDefinition.id
  name?: string; // From PageDefinition.name
  route?: string; // From PageDefinition.route
  routeParams?: Record<string, string>; // From URL
  // Convenience aliases for dynamic route usage in templates
  slug?: string; // First dynamic route value when present
  slugName?: string; // First dynamic route param name when present
  slugs?: Record<string, string>; // Alias to routeParams for readability
}

export interface NodeDataRequirementState {
  data: any;
  isLoading: boolean;
  error: Error | null;
  timestamp: number;
}

// TODO: Define more specific types as we progress
// For now, mainPageData can be any, but ideally, it would be typed based on expected data sources.
export interface DataContextValue {
  mainPageData: any;
  isMainPageDataLoading: boolean;
  mainPageDataError: Error | null;
  pageInfo?: PageInfo;
  
  // Enhanced for dataRequirements support
  userInfo?: any; // Current user information
  siteInfo?: any; // Global site information beyond settings
  
  // Function to fetch data for a node's specific requirements
  fetchNodeRequirement: (nodeId: string, requirementConfig: DataRequirementConfig) => Promise<{ data: any; error: Error | null }>;
  
  // Tracked state for all observed node requirements
  // Key format: `${nodeId}_${requirementKey}`
  observedNodeRequirements: Record<string, NodeDataRequirementState>;
  
  // Function to get the current state of a specific node requirement
  getNodeRequirementState: (nodeId: string, requirementKey: string) => NodeDataRequirementState | undefined;

  // NEW: Function to trigger a refetch of the main page data
  refetchMainPageData: () => void;
}

const DataContext = React.createContext<DataContextValue | undefined>(undefined);

export const useData = (): DataContextValue => {
  const context = React.useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

// Note: The actual DataProvider logic (fetching data based on pageDefinition.dataSource)
// will be handled by a client component `OkiynaiPageWithDataContext` that wraps OkiynaiPageRenderer.
// This file primarily defines the context type and hook.
// The provider component itself will be more dynamic.

export default DataContext;
