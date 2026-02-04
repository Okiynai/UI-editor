'use client';

import { useCallback } from 'react';
import { useUIState } from '../contexts/UIStateContext';
import { useFormState } from '../contexts/FormContext';
import { useData } from '../contexts/DataContext';
import { useRouter } from 'next/navigation';
import { handleInternalNavigation } from '@/app/shop-manager/website/edit/iframe/utils/handleInternalNavigation';
import { 
  Action, 
  ExecuteRQLParams, 
  UpdateNodeStateParams, 
  OpenModalParams, 
  CloseModalParams, 
  NavigateParams,
  SubmitDataParams,
  UpdateStateParams,
  AddItemToCartParams
} from '@/OSDL.types';
import { resolveDataBindingsInObject, evaluateVisibility } from '../utils/nodeProcessor';
import { RQL_ENDPOINT } from '@/services/api/rql';
import { useCart } from '@/context/CartContext';

export function useActionExecutor() {
  const uiState = useUIState();
  const formState = useFormState(); // Will be `undefined` if not inside a FormProvider
  const dataContext = useData();
  const router = useRouter();

  const cartContext = useCart();

  const executeActions = useCallback(async function run(actions: Action[] | undefined, triggeringNodeId: string | undefined, extraContext: Record<string, any> = {}) {
    if (!actions) return;

    // Create the full context for templating inside the action's params
    const actionTemplatingContext = {
      ...dataContext, // Includes mainPageData, pageInfo, userInfo, etc.
      formData: formState?.formValues || {}, // Critical for form submissions
      actionResults: extraContext.actionResults || {}, // Pass through results from previous steps
      ...extraContext, // For passing data between chained actions
    };

    for (const action of actions) {
      // Resolve templates in the action's params right before execution
      const resolvedParams = resolveDataBindingsInObject(action.params, actionTemplatingContext);
      
      // Check conditions before executing
      const conditions = action.conditions || [];
      const conditionLogic = action.conditionLogic || 'AND';
      if (conditions.length > 0 && !evaluateVisibility({ conditions, conditionLogic }, actionTemplatingContext)) {
          continue; // Skip this action if conditions are not met
      }

      try {
        let wasSuccessful = true;
        let resultData: any = null; // To hold API response data for potential chaining

        // A small delay if specified
        if (action.delayMs) {
            await new Promise(resolve => setTimeout(resolve, action.delayMs));
        }

        switch (action.type) {
          case 'updateNodeState': {
            const params = resolvedParams as UpdateNodeStateParams;
            if (params.targetNodeId && params.updates) {
                uiState.setNodeOverrides(params.targetNodeId, params.updates);
            }
            break;
          }

          case 'updateState': {
            const params = resolvedParams as UpdateStateParams;
            // Default to the triggering node's ID if targetNodeId is not specified.
            const targetId = params.targetNodeId || triggeringNodeId;
            if (targetId && params.updates) {
                // Call the new function from our UIStateContext.
                uiState.updateNodeInternalState(targetId, params.updates);
            }
            break;
          }

          // These are just convenient shortcuts for updateNodeState
          case 'openModal': {
            const params = resolvedParams as OpenModalParams;
            if(params.modalNodeId) {
                uiState.setNodeOverrides(params.modalNodeId, { visibility: { hidden: false } });
            }
            break;
          }
          case 'closeModal': {
            const params = resolvedParams as CloseModalParams;
            if(params.modalNodeId) {
                uiState.setNodeOverrides(params.modalNodeId, { visibility: { hidden: true } });
            }
            break;
          }

          case 'resetForm': {
            if (formState) {
              formState.resetForm();
            }
            break;
          }

          case 'addItemToCart': 
            const params = resolvedParams as AddItemToCartParams;
            if(params.productId) {
                cartContext.addToCart({
                  productId: params.productId,
                  quantity: params.quantity || 1,
                  customizations: params.customizations,
                  product: params.product,
                } as unknown as Parameters<typeof cartContext.addToCart>[0]);
            }
            break;

          case 'navigate': {
            const params = resolvedParams as NavigateParams;
            if(params.url) {
                // Determine if this is running inside the editor iframe
                const isEditorIframe = typeof window !== 'undefined'
                  && window.parent !== window
                  && window.location.pathname.includes('/shop-manager/website/edit/iframe');

                const isSameOrigin = (url: string) => {
                    try {
                        const link = new URL(url, window.location.origin);
                        return link.origin === window.location.origin;
                    } catch {
                        return false;
                    }
                };

                if (params.newTab) {
                    window.open(params.url, '_blank', 'noopener');
                } else if (!isSameOrigin(params.url)) {
                    // External links always open in a new tab
                    window.open(params.url, '_blank', 'noopener');
                } else if (isEditorIframe) {
                    // In editor: post a message to parent for internal navigation
                    handleInternalNavigation(params.url, undefined, 'push');
                } else {
                    // Normal site navigation
                    router.push(params.url);
                }
            }
            break;
          }

          case 'executeRQL': {
            const params = resolvedParams as ExecuteRQLParams;
            const response = await fetch(RQL_ENDPOINT, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ [params.resultKey || 'default']: params.query }),
            });

            if (!response.ok) {
              wasSuccessful = false;
              console.error(`executeRQL action failed with HTTP status: ${response.status}`, await response.text());
            } else {
              const rqlResult = await response.json();
              if (rqlResult.errors && rqlResult.errors.length > 0) {
                wasSuccessful = false;
                resultData = rqlResult;
                console.error(`executeRQL action failed with RQL errors:`, rqlResult.errors);
              } else {
                resultData = rqlResult.data;
              }
            }
            break;
          }

          case 'submitData': { // This can be considered a legacy action now
            const params = resolvedParams as SubmitDataParams;
            const response = await fetch(params.endpoint, {
              method: params.method || 'POST',
              headers: { 'Content-Type': 'application/json', ...(params.headers || {}) },
              body: JSON.stringify(params.body),
            });
            if (!response.ok) {
                wasSuccessful = false;
                console.error(`SubmitData action failed for endpoint: ${params.endpoint}`, response);
            }
            try { 
                resultData = await response.json();
            } catch {
                // Ignore if response is not json
            }
            break;
          }

          case 'refetchPageData': {
            dataContext.refetchMainPageData();
            break;
          }
        }

        // Handle chaining
        const nextContext = { ...extraContext };
        if (resultData && (action.type === 'executeRQL' || action.type === 'submitData')) {
            const resultKey = (action.params as ExecuteRQLParams)?.resultKey || 'lastResult';
            nextContext.actionResults = {
                ...actionTemplatingContext.actionResults,
                [resultKey]: resultData
            };
        }

        if (wasSuccessful && action.onSuccess) {
          await run(action.onSuccess, triggeringNodeId, nextContext);
        } else if (!wasSuccessful && action.onError) {
          await run(action.onError, triggeringNodeId, nextContext);
        }
      } catch (err) {
        console.error(`Action Executor: Failed to execute action "${action.id}" of type "${action.type}"`, err);
        if (action.onError) await run(action.onError, triggeringNodeId, { ...extraContext, error: err });
      }
    }
  }, [dataContext, formState, uiState, router]);

  return { executeActions };
} 
