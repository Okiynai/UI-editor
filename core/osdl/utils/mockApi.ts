import { DataSourceConfig } from '@/OSDL.types';

export async function fetchMockData(dataSourceConfig?: DataSourceConfig, routeParams?: Record<string, string>): Promise<any> {
  if (!dataSourceConfig) {
    console.log('[MockAPI] No data source config provided.');
    return null;
  }

  // routeParams here are the dynamic segments from the URL, e.g. { subdomain: 'xyz' }
  // dataSourceConfig.sourceParams contains parameters defined in the OSDL for the data source,
  // including the productId that might have been derived from routeParams or set to a default.
  console.log('[MockAPI] Fetching for dataSourceConfig:', dataSourceConfig, 'with routeParams:', routeParams);

  return new Promise(resolve => {
    setTimeout(() => {
      // Use productId from dataSourceConfig.sourceParams, which should be resolved by getPageData
      let effectiveProductId: string | undefined;
      
      if (dataSourceConfig.type === 'productDetail') {
        effectiveProductId = dataSourceConfig.sourceParams.productId;
      }

      if (dataSourceConfig.type === 'productDetail' && effectiveProductId) {
        console.log(`[MockAPI] Resolving productDetail for effectiveProductId: ${effectiveProductId}`);
        resolve({
          product: {
            id: effectiveProductId,
            name: `Awesome Mock Product ${effectiveProductId}`,
            description: `This is the detailed description for the fantastic product ${effectiveProductId}. It has many features and is generally great!`,
            price: parseFloat((Math.random() * 100 + 10).toFixed(2)),
            categoryName: 'Mock Category Alpha',
            categoryId: 'mock-cat-alpha-001',
            imageUrl: `https://via.placeholder.com/600x400.png?text=Product+${effectiveProductId.replace(/ /g, '+')}`,
            specs: {
              weight: `${(Math.random()*5).toFixed(1)}kg`,
              dimensions: '10x20x5 cm'
            }
          }
        });
      } else if (dataSourceConfig.type === 'staticContent') {
        console.log('[MockAPI] Resolving staticContent.');
        resolve(dataSourceConfig.sourceParams.content || { message: 'No static content defined in sourceParams.' });
      } else if (dataSourceConfig.type === 'mockData') {
        console.log('[MockAPI] Resolving mockData for test purposes.');
        const mockProductId = dataSourceConfig.sourceParams.mockProductId || '123';
        resolve({
          product: {
            id: mockProductId,
            name: `Test Product ${mockProductId}`,
            description: `This is a test product with ID ${mockProductId}. It demonstrates data requirements functionality.`,
            price: 29.99,
            categoryName: 'Test Category',
            categoryId: 'test-category-001',
            imageUrl: `https://via.placeholder.com/600x400.png?text=Test+Product+${mockProductId}`,
            inStock: true,
            specs: {
              weight: '2.5kg',
              dimensions: '15x25x8 cm'
            }
          }
        });
      } else {
        console.warn('[MockAPI] No specific mock data handler for type:', dataSourceConfig.type, 'or effectiveProductId is missing:', effectiveProductId);
        resolve({ message: `No specific mock data for config type: ${dataSourceConfig.type} or missing product ID.` });
      }
    }, 500 + Math.random() * 1000); // Simulate network delay
  });
} 