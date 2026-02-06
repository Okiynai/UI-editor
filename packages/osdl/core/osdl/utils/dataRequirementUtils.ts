import { NodeDataSource } from '@/OSDL.types';
import { RQL_ENDPOINT } from '@/services/api/rql';

/**
 * Generates a cache key for a data requirement based on its resolved source
 */
export function generateDataRequirementCacheKey(resolvedSource: NodeDataSource): string {
  let sourceString: string;
  if (resolvedSource.type === 'rql') {
      sourceString = JSON.stringify({
          type: resolvedSource.type,
          queries: resolvedSource.queries
      });
  } else {
      sourceString = JSON.stringify({
          type: resolvedSource.type,
          query: resolvedSource.query,
          variables: resolvedSource.variables || {},
          dataPath: resolvedSource.dataPath,
      });
  }
  
  // Simple hash function for the cache key
  let hash = 0;
  for (let i = 0; i < sourceString.length; i++) {
    const char = sourceString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `req_${Math.abs(hash)}`;
}

/**
 * Generates the full key for tracking a node requirement state
 */
export function generateNodeRequirementStateKey(nodeId: string, requirementKey: string): string {
  return `${nodeId}_${requirementKey}`;
}

/**
 * Fetches data from server based on a data requirement config
 * This is a simplified implementation - in a real app you'd have more sophisticated routing
 */
export async function fetchDataFromSource(source: NodeDataSource): Promise<any> {
  console.log('[fetchDataFromSource] Fetching data for source:', source);
  
  switch (source.type) {
    case 'rql': {
      if (!RQL_ENDPOINT) {
        return { data: {} };
      }
      const response = await fetch(RQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(source.queries),
      });

      if (!response.ok) {
          throw new Error(`RQL HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.errors && result.errors.length > 0) {
          const errorMessage = result.errors.map((e: any) => `QueryKey "${e.queryKey}": ${e.message} (${e.code})`).join('; ');
          console.log('RQL errors: ', errorMessage);
          return {
            error: errorMessage,
            data: null
          };
      }

      console.log('RQL result: ', result);
      return result.data;
    }
    case 'apiEndpoint': {
      const url = source.query;
      const options: RequestInit = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      // If variables exist, append as query params for GET or use as body for POST
      if (source.variables && Object.keys(source.variables).length > 0) {
        if (url.includes('?')) {
          const searchParams = new URLSearchParams();
          Object.entries(source.variables).forEach(([key, value]) => {
            searchParams.append(key, String(value));
          });
          const finalUrl = `${url}&${searchParams.toString()}`;
          const response = await fetch(finalUrl, options);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const rawData = await response.json();
          return source.dataPath ? getNestedValue(rawData, source.dataPath) : rawData;
        } else {
          // For simplicity, assume GET with query params
          const searchParams = new URLSearchParams();
          Object.entries(source.variables).forEach(([key, value]) => {
            searchParams.append(key, String(value));
          });
          const finalUrl = `${url}?${searchParams.toString()}`;
          const response = await fetch(finalUrl, options);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const rawData = await response.json();
          return source.dataPath ? getNestedValue(rawData, source.dataPath) : rawData;
        }
      } else {
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const rawData = await response.json();
        return source.dataPath ? getNestedValue(rawData, source.dataPath) : rawData;
      }
    }
    
    case 'graphQLQuery': {
      // Simplified GraphQL implementation
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: source.query,
          variables: source.variables || {},
        }),
      });
      
      if (!response.ok) {
        throw new Error(`GraphQL HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.errors) {
        throw new Error(`GraphQL errors: ${result.errors.map((e: any) => e.message).join(', ')}`);
      }
      
      const data = result.data;
      return source.dataPath ? getNestedValue(data, source.dataPath) : data;
    }
    
    case 'mockData': {
      // For development/testing purposes
      console.log('[fetchDataFromSource] Simulating mock data fetch...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      
      // Return mock data based on the query
      const queryText = typeof source.query === 'string' ? source.query : JSON.stringify(source.query || '');
      if (queryText.includes('relatedProducts')) {
        return [
          { id: 'rel-1', name: 'Related Widget A', price: 24.99, categoryId: 'test-category-001' },
          { id: 'rel-2', name: 'Related Widget B', price: 34.99, categoryId: 'test-category-001' },
          { id: 'rel-3', name: 'Related Widget C', price: 19.99, categoryId: 'test-category-001' },
        ];
      } else if (queryText.includes('userReviews')) {
        return [
          { id: 1, rating: 5, comment: 'Excellent product! Highly recommended.', author: 'John D.', date: '2024-01-15' },
          { id: 2, rating: 4, comment: 'Very satisfied with the quality.', author: 'Jane S.', date: '2024-01-10' },
          { id: 3, rating: 5, comment: 'Perfect for my needs!', author: 'Mike R.', date: '2024-01-08' },
        ];
      } else if (queryText.includes('reviewSummary')) {
        return {
          averageRating: 4.7,
          totalReviews: 23,
          ratingDistribution: {
            5: 15,
            4: 6,
            3: 2,
            2: 0,
            1: 0
          }
        };
      } else if (queryText.includes('productAnalytics')) {
        return {
          views: 1547,
          purchases: 89,
          conversionRate: 0.0575,
          recommendation: 'This product is trending! Consider bundling with related items for better value.',
          lastUpdated: new Date().toISOString()
        };
      } else {
        return { message: 'Mock data for: ' + queryText, variables: source.variables };
      }
    }
    
    case 'cmsCollection': {
        throw new Error(`Data source type 'cmsCollection' is not yet implemented.`);
    }

    default:
      // This will catch any unhandled source types.
      // Using a never type here helps ensure all cases are handled.
      const exhaustiveCheck: never = source;
      throw new Error(`Unsupported data source type: ${(exhaustiveCheck as any).type}`);
  }
}

/**
 * Helper function to get nested values from an object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}
