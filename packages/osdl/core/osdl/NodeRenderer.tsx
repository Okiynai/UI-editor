'use client'; 

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { BaseNode, AtomNode, SectionNode, ComponentNode, CodeBlockNode, Node, LoadingBehaviorConfig, PageDefinition } from '@/OSDL.types';
import AtomRegistry from '../AtomRegisty';
import ComponentRegistry from '../ComponentRegistry';
import { processStylesAndLayout } from './utils/styleUtils';
import { useSiteSettings } from '@/osdl/contexts/SiteSettingsContext';
import { useLocale } from '@/osdl/contexts/LocaleContext';
import { useViewport } from '@/osdl/contexts/BreakpointContext';
import { useData } from '@/osdl/contexts/DataContext';
import { applyResponsiveOverrides, applyLocaleOverrides, resolveDataBindingsInObject, resolveDataBindingsInString, evaluateVisibility, nodeDependsOnDataContext, getPath, generateRepeatedNode } from './utils/nodeProcessor';
import { generateNodeRequirementStateKey } from './utils/dataRequirementUtils';
import { useInteractionStates } from './hooks/useInteractionStates';
import { useNodeAnimations } from './hooks/useNodeAnimations';
import { useActionExecutor } from './hooks/useActionExecutor';
import { useUIState } from './contexts/UIStateContext';
import { FormProvider, useFormState } from './contexts/FormContext';
import merge from 'lodash.merge';

// Import Placeholders
import SkeletonPlaceholder from './placeholders/SkeletonPlaceholder';
import SpinnerPlaceholder from './placeholders/SpinnerPlaceholder';
import { CodeBlockRenderer } from './utils/CodeBlockRenderer';

export interface NodeRendererProps {
  nodeSchema: Node;
  setPageDefinition?: React.Dispatch<React.SetStateAction<PageDefinition | null>>;
  showDevInfo?: boolean;
  allNodesOnPage?: Node[];
  parentScopeId?: string;
  parentTemplatingContext?: Record<string, any>;
  isBeingEdited?: boolean;
  isInspectMode?: boolean;
  editingSections?: Set<string>;
  // Prop to control recursive rendering. Defaults to self.
  ChildRenderer?: React.ComponentType<NodeRendererProps>;
  onDeleteNode?: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
  onMoveNode?: (nodeId: string, direction: 'up' | 'down') => void;
  pageDefinition?: PageDefinition;
}

// Helper to check if params might contain data bindings for logging purposes
const mightHaveDataBindingInParams = (node: Node): boolean => {
  if (node.params && typeof node.params === 'object') {
    // Check common text-like properties for data binding patterns
    const paramsToCheck = node.params as Record<string, any>; // Cast for general access
    for (const key of ['content', 'text', 'title', 'label', 'src', 'href']) { // Common templated props
      if (typeof paramsToCheck[key] === 'string' && paramsToCheck[key].includes('{{data')) {
        return true;
      }
    }
    // Fallback: generic check for any string param (can be noisy but useful for debugging)
    // for (const value of Object.values(paramsToCheck)) {
    //   if (typeof value === 'string' && value.includes('{{data')) {
    //     return true;
    //   }
    // }
  }
  return false;
};

const NodeRenderer: React.FC<NodeRendererProps> = ({ 
  nodeSchema, 
  setPageDefinition,
  showDevInfo = false, 
  allNodesOnPage, 
  parentScopeId, 
  parentTemplatingContext, 
  isBeingEdited,
  isInspectMode,
  editingSections,
  onDeleteNode,
  onDuplicateNode,
  onMoveNode,
  pageDefinition,
  ChildRenderer = NodeRenderer, // Default to self for standard recursion
}) => {
  const siteSettings = useSiteSettings();
  const { activeLocale } = useLocale();
  const { activeBreakpointName, viewport } = useViewport();
  const { 
    mainPageData, 
    isMainPageDataLoading, 
    mainPageDataError, 
    pageInfo, 
    userInfo,
    siteInfo,
    fetchNodeRequirement,
    observedNodeRequirements,
    getNodeRequirementState
  } = useData();
  const { nodeOverrides, nodeInternalStates, initializeNodeState, updateNodeInternalState } = useUIState(); 
  const { executeActions } = useActionExecutor();
  const formState = useFormState(); 

  // Create a stable ref for the fetchNodeRequirement function
  const fetchNodeRequirementRef = useRef(fetchNodeRequirement);
  fetchNodeRequirementRef.current = fetchNodeRequirement;

  const shouldDetailedLog = useMemo(() => 
    showDevInfo && (nodeSchema.id === 'hero-title' || nodeSchema.id === 'hero-subtitle' || nodeSchema.id === 'hero-image' || nodeSchema.id === 'col-item-1' || mightHaveDataBindingInParams(nodeSchema)), 
  [showDevInfo, nodeSchema]);

  if (shouldDetailedLog) {
    console.log(`[NodeRenderer DEBUG ${nodeSchema.id}] =============== START RENDER PASS ===============`);
    console.log(`[NodeRenderer DEBUG ${nodeSchema.id}] Initial isMainPageDataLoading from context:`, isMainPageDataLoading);
  }

  useEffect(() => {
    if (nodeSchema.state) {
      initializeNodeState(nodeSchema.id, nodeSchema.state);
    }
  }, [nodeSchema.id, nodeSchema.state, initializeNodeState]);

  if (nodeSchema.id.includes('product_card_template')) {
    console.log(`[REPEATER LOG] Node ${nodeSchema.id} RECEIVED parentTemplatingContext:`, parentTemplatingContext);
  }

  // --- 1. Node Configuration Processing (Overrides & Initial dataRequirements Template Resolution) ---
  const processedNode = useMemo(() => {
    let tempNode = JSON.parse(JSON.stringify(nodeSchema)); // Start with a deep copy
    

    
    // *** NEW: Apply client-side state overrides from UIStateContext FIRST ***
    const overrides = nodeOverrides[tempNode.id];
    if (overrides) {
      // Use a robust merge utility to avoid overwriting nested objects like params
      tempNode = merge({}, tempNode, overrides);
    }
    
    tempNode = applyResponsiveOverrides(tempNode, activeBreakpointName, siteSettings?.globalStyleVariables?.breakpoints);
    tempNode = applyLocaleOverrides(tempNode, activeLocale);
    
    // **NEW**: Resolve templates in dataRequirements.source using global contexts only
    // This is the "first pass" - we need global data (main page data, user, site) to construct queries
    if (tempNode.dataRequirements) {
      const globalTemplatingContext = {
        data: mainPageData,
        site: siteSettings,
        page: pageInfo,
        user: userInfo,
        siteInfo: siteInfo,
      };
      
      tempNode.dataRequirements = tempNode.dataRequirements.map((req: any) => {
        const source = req.source; // work with source object

        if (source.type === 'rql') {
            const resolvedQueries: Record<string, any> = {};
            for (const contractName in source.queries) {
                const queryParams = source.queries[contractName]; // This is the object with params, e.g., { id: '...' }
                // We resolve bindings on the entire parameter object for a given contract.
                resolvedQueries[contractName] = queryParams ? resolveDataBindingsInObject(queryParams, globalTemplatingContext, siteSettings?.paramDefinitions) : {};
            }
            return {
                ...req,
                source: {
                    ...source,
                    queries: resolvedQueries,
                }
            };
        } else { // Handles other data source types like apiEndpoint
            return {
                ...req,
                source: {
                    ...source,
                    query: resolveDataBindingsInString(source.query, globalTemplatingContext),
                    variables: source.variables ? resolveDataBindingsInObject(source.variables, globalTemplatingContext, siteSettings?.paramDefinitions) : undefined,
                }
            };
        }
      });
    }
    

    
    return tempNode;
  }, [nodeSchema, activeBreakpointName, activeLocale, siteSettings, mainPageData, pageInfo, userInfo, siteInfo, nodeOverrides]);

  // NEW: Add hooks for interactions and animations
  const nodeRef = useRef<HTMLElement>(null);

  const {
    dynamicStyles,
    transitionStyles,
    handlers,
  } = useInteractionStates(processedNode.interactionStates);

  useNodeAnimations(
    nodeRef,
    (processedNode as any)?.animations,
    processedNode.id
  );

  // --- 2. Handle Node-Specific Data Requirements ---
  const [requiredNodeDataState, setRequiredNodeDataState] = useState<Record<string, { data: any; isLoading: boolean; error: Error | null }>>({});
  const [areBlockingReqsLoading, setAreBlockingReqsLoading] = useState(false);

  // Effect to manage dataRequirements fetching
  useEffect(() => {
    // Debug: Log when this node has dataRequirements
    if (processedNode.dataRequirements && processedNode.dataRequirements.length > 0 && shouldDetailedLog) {
      console.log(`[NodeRenderer DEBUG] Node ${processedNode.id} HAS dataRequirements:`, processedNode.dataRequirements);
    }
    
    if (!processedNode.dataRequirements || processedNode.dataRequirements.length === 0) {
      setRequiredNodeDataState({});
      setAreBlockingReqsLoading(false);
      return;
    }

    let isMounted = true;
    const initialBlockingState = processedNode.dataRequirements.some((req: any) => req.blocking);
    setAreBlockingReqsLoading(initialBlockingState);

    const fetchRequirements = async () => {
		if (shouldDetailedLog) {
			console.log(`[NodeRenderer ${processedNode.id}] Processing ${processedNode.dataRequirements?.length} data requirements`);
		}
      
      const promises = processedNode.dataRequirements!.map(async (req: any) => {
        const stateKey = req.key;
        
        // Set initial loading state
        if (isMounted) {
          setRequiredNodeDataState(prev => ({
            ...prev,
            [stateKey]: { data: req.defaultValue, isLoading: true, error: null }
          }));
        }

        try {
          const result = await fetchNodeRequirementRef.current(processedNode.id, req);
			if (shouldDetailedLog) {
				console.log(`[NodeRenderer ${processedNode.id}] Received data for requirement ${req.key}:`, result);
			}
          if (isMounted) {
            setRequiredNodeDataState(prev => ({
              ...prev,
              [stateKey]: { data: result.data, isLoading: false, error: result.error }
            }));
          }
        } catch (error) {
          console.error(`[NodeRenderer ${processedNode.id}] Failed to fetch requirement ${req.key}:`, error);
          if (isMounted) {
            setRequiredNodeDataState(prev => ({
              ...prev,
              [stateKey]: { 
                data: req.defaultValue, 
                isLoading: false, 
                error: error instanceof Error ? error : new Error('Failed to fetch requirement data')
              }
            }));
          }
        }
      });

      // Wait for all initial fetches
      await Promise.allSettled(promises);
      
      if (isMounted) {
        // Update blocking state based on actual results
        setAreBlockingReqsLoading(false);
      }
    };

    fetchRequirements();

    return () => {
      isMounted = false;
    };
  }, [processedNode.id, JSON.stringify(processedNode.dataRequirements)]);

  // --- 3. Create Final Templating Context & Resolve Main Params ---
  const finalTemplatingContext = useMemo(() => {
    const nodeDataForTemplating: Record<string, any> = {};
    Object.keys(requiredNodeDataState).forEach(key => {
      nodeDataForTemplating[key] = requiredNodeDataState[key]?.data;
    });

    // Debug: Log the nodeData context for nodes that have dataRequirements
    if (processedNode.dataRequirements && processedNode.dataRequirements.length > 0 && shouldDetailedLog) {
      console.log(`[NodeRenderer ${processedNode.id}] Final nodeData context:`, nodeDataForTemplating);
      console.log(`[NodeRenderer ${processedNode.id}] requiredNodeDataState:`, requiredNodeDataState);
    }
    
    const inheritedNodeData = parentTemplatingContext?.nodeData || {};

    // Get the current node's own internal state from the global UIState context.
    const currentNodeState = nodeInternalStates[processedNode.id] || {};

    // Get the parent's state, which was passed down from the parent's `finalTemplatingContext`.
    const parentNodeState = parentTemplatingContext?.state || {};



    return {
	  ...parentTemplatingContext,

      data: mainPageData,
      site: siteSettings,
      page: pageInfo,
      user: userInfo,
      siteInfo: siteInfo,
      nodeData: { ...inheritedNodeData, ...nodeDataForTemplating }, // This is the key enhancement - nodeData from dataRequirements
      viewport: viewport, // Add viewport for visibility rules
      state: currentNodeState,       // The node's own state: {{ state.key }}
      parentState: parentNodeState,  // The parent's state: {{ parentState.key }}
      states: nodeInternalStates, // Make the entire state map available under the `states` key.
    };
  }, [mainPageData, siteSettings, pageInfo, userInfo, siteInfo, requiredNodeDataState, parentTemplatingContext, viewport, processedNode, shouldDetailedLog, nodeInternalStates]);

  // Effect to initialize the node's state from the schema
  useEffect(() => {
    if (nodeSchema.state) {
      initializeNodeState(nodeSchema.id, nodeSchema.state);
    }
  }, [nodeSchema.id, nodeSchema.state, initializeNodeState]);

  // --- 4. Check Dependencies & Enhanced Loading Logic ---
  const usesMainDataContext = useMemo(() => {
    if (!processedNode || !processedNode.params) return false;
    const depends = nodeDependsOnDataContext(processedNode.params);
    if (shouldDetailedLog) {
      console.log(`[NodeRenderer DEBUG ${nodeSchema.id}] usesMainDataContext calculated:`, depends, "Params checked:", JSON.stringify(processedNode.params));
    }
    return depends;
  }, [processedNode, shouldDetailedLog]);

  // Enhanced loading logic - considers both main data and node requirements
  const isEffectivelyLoading = useMemo(() => {
    // If this node has blocking data requirements that are still loading
    if (areBlockingReqsLoading) return true;
    
    // If this node depends on main data context and it's still loading
    if (usesMainDataContext && (isMainPageDataLoading || !mainPageData)) return true;
    
    // If this node has state and it hasn't been initialized yet, consider it loading
    if (nodeSchema.state && !nodeInternalStates[nodeSchema.id]) return true;
    
    return false;
  }, [areBlockingReqsLoading, usesMainDataContext, isMainPageDataLoading, mainPageData, nodeSchema.state, nodeInternalStates, nodeSchema.id]);

  // --- 5. Final Params Resolution (using final templating context) ---
  const nodeWithResolvedParams = useMemo(() => {
    if (!processedNode) return null;
    
    // Only resolve params if we're not in a loading state that would prevent meaningful resolution
    let paramsForResolution = processedNode.params;
	  let classNameForResolution = processedNode.className; // Get className
    
    if (!isEffectivelyLoading) {

      
      paramsForResolution = resolveDataBindingsInObject(
        processedNode.params,
        finalTemplatingContext, 
        siteSettings?.paramDefinitions
      );
		if (classNameForResolution) {
		  classNameForResolution = resolveDataBindingsInString(
			classNameForResolution,
			finalTemplatingContext
		  );
		}
      

    }

    const tempNode = { 
      ...processedNode, 
      params: paramsForResolution,
		className: classNameForResolution, 
    };
    return tempNode as typeof processedNode;
  }, [processedNode, finalTemplatingContext, siteSettings?.paramDefinitions, isEffectivelyLoading]);

  // --- 6. Visibility (using final resolved node) ---
  const isVisible = useMemo(() => {
    if (!nodeWithResolvedParams) return false;
    // If the node is effectively loading, don't evaluate visibility expressions yet
    if (isEffectivelyLoading) return true; // Default to visible during loading
    return evaluateVisibility(nodeWithResolvedParams.visibility, finalTemplatingContext);
  }, [nodeWithResolvedParams, finalTemplatingContext, isEffectivelyLoading]);

  // --- 7. Style Processing (using fully processed node) ---
  const { style: computedStyle, className: computedClassName } = useMemo(() => {
    if (!nodeWithResolvedParams || !isVisible) return { style: {}, className: '' };
    return processStylesAndLayout(nodeWithResolvedParams, siteSettings);
  }, [nodeWithResolvedParams, siteSettings, isVisible]);

  // Combine base styles with dynamic interaction styles
  const finalStyles = useMemo(() => ({
    ...computedStyle,
    ...transitionStyles,
    ...dynamicStyles,
  }), [computedStyle, transitionStyles, dynamicStyles]);

	// Combine computedClassName (from styleUtils) with Tailwind className ***
	const finalClassName = useMemo(() => {
		return [
			computedClassName, // From processStylesAndLayout (currently empty, but good for future proofing)
			nodeWithResolvedParams?.className // From OSDL schema
		].filter(Boolean).join(' ');
	}, [computedClassName, nodeWithResolvedParams?.className]);

  // --- 8. Loading State Handling & Debug Logging ---
  if (showDevInfo && nodeSchema.id === 'col-item-1') {
    console.log(`[NodeRenderer DEBUG ${nodeSchema.id}] isEffectivelyLoading: ${isEffectivelyLoading}, usesMainDataContext: ${usesMainDataContext}, areBlockingReqsLoading: ${areBlockingReqsLoading}, isMainPageDataLoading: ${isMainPageDataLoading}, mainPageDataExists: ${!!mainPageData}`);
    console.log(`[NodeRenderer DEBUG ${nodeSchema.id}] For placeholder - computedStyle:`, JSON.parse(JSON.stringify(computedStyle)));
    console.log(`[NodeRenderer DEBUG ${nodeSchema.id}] For placeholder - loadingConfig:`, nodeWithResolvedParams?.loadingBehavior ? JSON.parse(JSON.stringify(nodeWithResolvedParams.loadingBehavior)) : 'undefined');
  }

  if (shouldDetailedLog) {
    console.log(`[NodeRenderer DEBUG ${nodeSchema.id}] Calculated isEffectivelyLoading:`, isEffectivelyLoading, "(areBlockingReqsLoading:", areBlockingReqsLoading, ", usesMainDataContext:", usesMainDataContext, ", isMainPageDataLoading:", isMainPageDataLoading, ")");
    console.log(`[NodeRenderer DEBUG ${nodeSchema.id}] Found loadingConfig:`, nodeWithResolvedParams?.loadingBehavior ? JSON.stringify(nodeWithResolvedParams.loadingBehavior) : 'undefined');
  }

  if (isEffectivelyLoading) {
    if (shouldDetailedLog) {
        console.log(`[NodeRenderer DEBUG ${nodeSchema.id}] Entering isEffectivelyLoading block. Will render placeholder. Type: ${nodeWithResolvedParams?.loadingBehavior?.placeholderType}`);
    }
    const loadingConfig = nodeWithResolvedParams?.loadingBehavior;

    if (loadingConfig?.placeholderType && loadingConfig.placeholderType !== 'none') {
      switch (loadingConfig.placeholderType) {
        case 'skeleton':
          return <SkeletonPlaceholder config={loadingConfig.skeletonConfig} style={computedStyle} className={computedClassName} />;
        case 'spinner':
          return <SpinnerPlaceholder style={computedStyle} className={computedClassName} spinnerColor={loadingConfig.spinnerColor} />;
        case 'custom_node':
          if (loadingConfig.customPlaceholderNodeId && allNodesOnPage) {
            const customPlaceholderNodeSchema = allNodesOnPage.find(n => n.id === loadingConfig.customPlaceholderNodeId);
            if (customPlaceholderNodeSchema) {
              if (showDevInfo) console.log(`[NodeRenderer] Rendering custom placeholder node ${customPlaceholderNodeSchema.id} for ${nodeSchema.id}`);
              // Pass original node's computed styles and class to the custom placeholder wrapper
              // The custom placeholder node itself will have its own styles processed internally by the recursive NodeRenderer call.
              // However, we want the placeholder to occupy the original node's slot in the layout.
              return (
                <div style={computedStyle} className={computedClassName} data-placeholder-for={nodeSchema.id}>
                  <ChildRenderer 
                    nodeSchema={customPlaceholderNodeSchema} 
                    setPageDefinition={setPageDefinition}
                    showDevInfo={showDevInfo} 
                    allNodesOnPage={allNodesOnPage} 
                    parentScopeId={parentScopeId}
                    parentTemplatingContext={finalTemplatingContext}
                    isBeingEdited={isBeingEdited}
                    isInspectMode={isInspectMode}
                    onDeleteNode={onDeleteNode}
                    onDuplicateNode={onDuplicateNode}
                    onMoveNode={onMoveNode}
                    pageDefinition={pageDefinition}
                    ChildRenderer={ChildRenderer}
                  />
                </div>
              );
            } else {
              if (showDevInfo) console.warn(`[NodeRenderer] Custom placeholder node ID ${loadingConfig.customPlaceholderNodeId} not found for ${nodeSchema.id}. Falling back.`);
            }
          }
          // Fallback for custom_node if ID is missing or node not found
          return <SpinnerPlaceholder style={computedStyle} className={computedClassName} />; 
        default:
          break; 
      }
    }
    return <div style={computedStyle} className={computedClassName} aria-busy="true" role="status" aria-label={showDevInfo ? `Loading content for ${nodeSchema.name || nodeSchema.id}` : "Loading content"}></div>;
  }
  
  // Handle data fetch error state if node depends on it
  if (mainPageDataError && usesMainDataContext) {
    if (shouldDetailedLog) {
        console.log(`[NodeRenderer DEBUG ${nodeSchema.id}] Rendering error state.`);
    }
    return <div style={computedStyle} className={computedClassName} role="alert">Error loading content for {nodeSchema.name || nodeSchema.id}.</div>;
  }

  if (!isVisible || !nodeWithResolvedParams) {
    if (shouldDetailedLog) {
        console.log(`[NodeRenderer DEBUG ${nodeSchema.id}] Not rendering. isVisible:`, isVisible, "nodeWithResolvedParams exists:", !!nodeWithResolvedParams);
    }
    return null;
  }

  if (shouldDetailedLog) {
    console.log(`[NodeRenderer DEBUG ${nodeSchema.id}] Proceeding to render actual component. Resolved params:`, JSON.stringify(nodeWithResolvedParams.params));
    console.log(`[NodeRenderer DEBUG ${nodeSchema.id}] ===============  END RENDER PASS  ===============`);
  }

  // The rest of the switch statement uses nodeWithResolvedParams
  switch (nodeWithResolvedParams.type) {
    case 'atom': {
      const atomSchema = nodeWithResolvedParams as AtomNode;
      const AtomComponent = AtomRegistry[atomSchema.atomType];
      if (AtomComponent) {
        const eventHandlers = atomSchema.eventHandlers || {};
        const propsForAtom: Record<string, any> = {};

        // 1. Create standard event handlers (onClick, onFocus, etc.)
        const createHandler = (eventType: keyof typeof eventHandlers) => (e: React.SyntheticEvent) => {
          if (isInspectMode) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }

          if (eventHandlers[eventType]) {
            e.stopPropagation(); // Prevent event from bubbling up and triggering parent handlers
            executeActions(eventHandlers[eventType], atomSchema.id, finalTemplatingContext);
          }
        };

        if (eventHandlers.onClick) propsForAtom.onClick = createHandler('onClick');
        if (eventHandlers.onMouseEnter) propsForAtom.onMouseEnter = createHandler('onMouseEnter');
        if (eventHandlers.onMouseLeave) propsForAtom.onMouseLeave = createHandler('onMouseLeave');
        if (eventHandlers.onFocus) propsForAtom.onFocus = createHandler('onFocus');
        if (eventHandlers.onBlur) propsForAtom.onBlur = createHandler('onBlur');
        
        // 2. Handle special logic for Input Atoms
        if (atomSchema.atomType === 'Input') {
          const inputName = atomSchema.params.name || atomSchema.id;
          const inputType = atomSchema.params.type;
          const isCheckable = inputType === 'checkbox' || inputType === 'radio';

          propsForAtom.onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (isInspectMode) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }

            const target = e.target;
            const newValue = target.type === 'checkbox' ? target.checked : target.value;
            
            if (formState) {
              formState.setFormValue(inputName, newValue);
            }
            if (eventHandlers.onChange) {
              executeActions(eventHandlers.onChange, atomSchema.id, { event: { value: newValue } });
            }
          };
        }
        
        const hasAnimations = Array.isArray((atomSchema as any).animations) && (atomSchema as any).animations.length > 0;

        if (hasAnimations) {
          return (
            <div
              ref={nodeRef as any}
              id={`${atomSchema.id}-wrapper`}
              style={finalStyles}
				className={finalClassName} 
              {...handlers}
              data-oskiynai-scope={atomSchema.id}
            >
              <AtomComponent
                id={atomSchema.id}
                nodeSchema={atomSchema}
                {...atomSchema.params}
                {...propsForAtom}
                _nodeDataState={requiredNodeDataState}
                isBeingEdited={isBeingEdited}
              />
            </div>
          );
        }

        return (
          <AtomComponent
            id={atomSchema.id}
            nodeSchema={atomSchema}
            style={finalStyles}
				className={finalClassName} 
            {...handlers}
            data-oskiynai-scope={atomSchema.id}
            {...atomSchema.params}
            {...propsForAtom}     
            _nodeDataState={requiredNodeDataState}
            isBeingEdited={isBeingEdited}
          />
        );
      }
      return <div style={finalStyles} className={finalClassName} data-node-id={atomSchema.id} role="alert">Unknown Atom Type: {atomSchema.atomType}</div>;
    }
    case 'section': {
        const sectionSchema = nodeWithResolvedParams as SectionNode;
        const Tag = sectionSchema.htmlTag || 'div';

      // Create an onClick handler for the section itself if defined in eventHandlers.
      // This is defined here so it can be used by both repeater and non-repeater sections.
      const sectionOnClickHandler = sectionSchema.eventHandlers?.onClick 
        ? (e: React.MouseEvent) => {
            if (isInspectMode) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }

            e.stopPropagation();
            executeActions(sectionSchema.eventHandlers!.onClick, sectionSchema.id, finalTemplatingContext);
          }
        : undefined;
      
      // --- REPEATER LOGIC ---
      // If a repeater config exists, it takes precedence over static children.
      if (sectionSchema.repeater) {
        // CRITICAL FIX: For state-based repeaters, ensure the repeater container has access to parent's state
        let repeaterContext = finalTemplatingContext;
        if (sectionSchema.repeater.source.includes('state.') && parentScopeId && nodeInternalStates[parentScopeId]) {
          repeaterContext = {
            ...finalTemplatingContext,
            state: nodeInternalStates[parentScopeId]
          };
        }


        
        // Resolve the repeater config itself to allow for dynamic limits, filters, etc.
        // IMPORTANT: Do NOT resolve inside the template here. That would strip bindings like {{ item.name }} before per-item rendering.
        const rawRepeater = sectionSchema.repeater;
        const resolvedRepeater = {
          ...rawRepeater,
          source: typeof rawRepeater.source === 'string'
            ? resolveDataBindingsInString(rawRepeater.source, repeaterContext)
            : rawRepeater.source,
          filter: rawRepeater.filter
            ? resolveDataBindingsInObject(rawRepeater.filter as any, repeaterContext)
            : undefined,
          sort: rawRepeater.sort
            ? resolveDataBindingsInObject(rawRepeater.sort as any, repeaterContext)
            : undefined,
          limit: rawRepeater.limit !== undefined
            ? (typeof rawRepeater.limit === 'string'
                ? resolveDataBindingsInString(rawRepeater.limit, repeaterContext)
                : rawRepeater.limit)
            : undefined,
          // DO NOT resolve "template" here. Keep bindings intact for per-item resolution.
          template: rawRepeater.template,
        } as typeof sectionSchema.repeater;
        
        // Get the source data array from the context. Default to an empty array if not found.
        const sourceArray = getPath(repeaterContext, resolvedRepeater.source, []);



        if (!Array.isArray(sourceArray) || !resolvedRepeater) {
          if (showDevInfo) {
            console.warn(`[NodeRenderer] Repeater source "${resolvedRepeater.source}" on node ${sectionSchema.id} did not resolve to an array.`);
          }
          // Render the container but with no children.
          return (
             <Tag 
                ref={nodeRef as any}
                id={sectionSchema.id} 
                style={finalStyles} 
                className={finalClassName}
                onClick={sectionOnClickHandler} 
                data-oskiynai-scope={sectionSchema.id}
                data-node-type="section" 
                data-name={sectionSchema.name}
                data-is-repeater="true"
              />
          );
        }

        // --- Start: Filtering, Sorting, and Limiting ---
        let processedArray = [...sourceArray];

        // 1. Filtering
        if (resolvedRepeater.filter && resolvedRepeater.filter.field && resolvedRepeater.filter.operator) {
            processedArray = processedArray.filter(item => {
                const itemValue = getPath(item, resolvedRepeater.filter!.field!);
                const conditionValue = resolvedRepeater.filter!.value;

                switch (resolvedRepeater.filter!.operator) {
                    case 'exists': return itemValue !== undefined && itemValue !== null;
                    case 'notExists': return itemValue === undefined || itemValue === null;
                    case 'equals': return itemValue == conditionValue;
                    case 'notEquals': return itemValue != conditionValue;
                    case 'greaterThan': return Number(itemValue) > Number(conditionValue);
                    case 'lessThan': return Number(itemValue) < Number(conditionValue);
                    case 'contains':
                        if (Array.isArray(itemValue)) return itemValue.includes(conditionValue);
                        if (typeof itemValue === 'string') return itemValue.includes(String(conditionValue));
                        return false;
                    case 'notContains':
                        if (Array.isArray(itemValue)) return !itemValue.includes(conditionValue);
                        if (typeof itemValue === 'string') return !itemValue.includes(String(conditionValue));
                        return true;
                    default: return true;
                }
            });
        }
        
        // 2. Sorting
        if (resolvedRepeater.sort && resolvedRepeater.sort.field) {
            processedArray.sort((a, b) => {
                const valA = getPath(a, resolvedRepeater.sort!.field!);
                const valB = getPath(b, resolvedRepeater.sort!.field!);

                const directionMultiplier = resolvedRepeater?.sort?.direction === 'desc' ? -1 : 1;
                
                // Handle null/undefined values to sort them to the end
                if (valA == null) return 1 * directionMultiplier;
                if (valB == null) return -1 * directionMultiplier;
                
                // Smart comparison for numbers vs. strings
                if (!isNaN(Number(valA)) && !isNaN(Number(valB))) {
                    return (Number(valA) - Number(valB)) * directionMultiplier;
                }
                
                if (typeof valA === 'string' && typeof valB === 'string') {
                    return valA.localeCompare(valB) * directionMultiplier;
                }
                
                // Fallback for other types
                if (valA < valB) return -1 * directionMultiplier;
                if (valA > valB) return 1 * directionMultiplier;
                return 0;
            });
        }

        // 3. Limiting
        if (resolvedRepeater.limit && !isNaN(Number(resolvedRepeater.limit))) {
            processedArray = processedArray.slice(0, Number(resolvedRepeater.limit));
        }
        // --- End: Filtering, Sorting, and Limiting ---


        const repeaterContent = (
          <Tag 
            ref={nodeRef as any}
            id={sectionSchema.id} 
            style={finalStyles} 
            className={finalClassName}
            {...handlers}
            onClick={sectionOnClickHandler} 
            onSubmit={sectionSchema.isFormContext && sectionSchema.eventHandlers?.onSubmit ? (e) => {
              e.preventDefault();
              if (isInspectMode) {
                e.stopPropagation();
                return;
              }
              executeActions(sectionSchema.eventHandlers?.onSubmit, sectionSchema.id, finalTemplatingContext);
            } : undefined}
            data-oskiynai-scope={sectionSchema.id}
            data-node-type="section" 
            data-name={sectionSchema.name}
            data-is-repeater="true"
          >
            {showDevInfo && <h4>Section: {sectionSchema.name || sectionSchema.id} (Order: {sectionSchema.order}, Repeater)</h4>}
            {processedArray.map((item, index) => {
                // IMPORTANT: Create a deep clone of the template for each iteration
                const templateClone = JSON.parse(JSON.stringify(resolvedRepeater.template));



                // Generate unique IDs for the new node and all its descendants
                // const nodeWithUniqueIds = generateRepeatedNode(
                //     templateClone,
                //     index,
                //     resolvedRepeater.idStrategy,
                //     sectionSchema.id // The repeater section's ID acts as the parent prefix
                // );

              // 1. Take a fresh clone of the template.
              const itemNode = JSON.parse(JSON.stringify(resolvedRepeater.template));



              // 2. Generate unique IDs for the node.
              const nodeWithUniqueIds = generateRepeatedNode(
                itemNode,
                index,
                resolvedRepeater.idStrategy,
                sectionSchema.id
              );
              

              
              // 3. Create the complete context for this child, including the repeater data.
              // CRITICAL FIX: Ensure the template has access to the repeater container's state
              // We need to find which node actually has the state - it could be the repeater container
              // or its parent section
              // Find the state for template nodes - check parent first, then current node
              let parentStateForTemplate = (parentScopeId ? nodeInternalStates[parentScopeId] : undefined) || nodeInternalStates[sectionSchema.id] || {};

              const itemContext = {
                ...finalTemplatingContext,
                // Override the state to use the repeater container's state instead of the template's empty state
                state: parentStateForTemplate,
                item: item,
                index: index,
                repeater: {
                    nodeId: nodeWithUniqueIds.id,
                    parentId: sectionSchema.id
                }
              };


                return (
                  <div ref={nodeRef as any} key={`${nodeWithUniqueIds.id}-wrapper`} data-oskiynai-scope={`${nodeWithUniqueIds.id}-wrapper`}>
                    <ChildRenderer // Use the passed-in ChildRenderer for recursion
                      key={nodeWithUniqueIds.id} // CRITICAL: Use the new unique ID as the React key
                      nodeSchema={nodeWithUniqueIds}
                      setPageDefinition={setPageDefinition}
                      showDevInfo={showDevInfo} 
                      allNodesOnPage={allNodesOnPage} 
                      parentScopeId={sectionSchema.id}
                      parentTemplatingContext={itemContext} // Pass down the specialized context
                      isBeingEdited={isBeingEdited}
                      isInspectMode={isInspectMode}
                      onDeleteNode={onDeleteNode}
                      onDuplicateNode={onDuplicateNode}
                      onMoveNode={onMoveNode}
                      pageDefinition={pageDefinition}
                      ChildRenderer={ChildRenderer} // Continue passing it down
                    />
                  </div>
                );
            })}
          </Tag>
        );
        
        // Wrap in FormProvider if the repeater wrapper is a form context
        if (sectionSchema.isFormContext) {
            return <FormProvider>{repeaterContent}</FormProvider>;
        }

        return repeaterContent;

      } 
      // --- ELSE: RENDER STATIC CHILDREN ---
      else {
        const sectionContent = (
          <Tag 
            ref={nodeRef as any}
            id={sectionSchema.id} 
            style={finalStyles} 
            className={finalClassName} 
            {...handlers}
            onClick={sectionOnClickHandler} 
            onSubmit={sectionSchema.isFormContext && sectionSchema.eventHandlers?.onSubmit ? (e) => {
              e.preventDefault();
              if (isInspectMode) {
                e.stopPropagation();
                return;
              }
              executeActions(sectionSchema.eventHandlers?.onSubmit, sectionSchema.id, finalTemplatingContext);
            } : undefined}
            data-oskiynai-scope={sectionSchema.id}
            data-node-type="section" 
            data-name={sectionSchema.name}
          >
            {showDevInfo && <h4>Section: {sectionSchema.name || sectionSchema.id} (Order: {sectionSchema.order})</h4>}
            {sectionSchema.children.slice()
              .sort((a, b) => a.order - b.order)
              .map(childNode => (
                <ChildRenderer // Use the passed-in ChildRenderer for recursion
                  key={childNode.id} 
                  nodeSchema={childNode} 
                  setPageDefinition={setPageDefinition}
                  showDevInfo={showDevInfo} 
                  allNodesOnPage={allNodesOnPage} 
                  parentScopeId={sectionSchema.id}
                  parentTemplatingContext={finalTemplatingContext}
                  isBeingEdited={isBeingEdited}
                  isInspectMode={isInspectMode}
                  onDeleteNode={onDeleteNode}
                  onDuplicateNode={onDuplicateNode}
                  onMoveNode={onMoveNode}
                  pageDefinition={pageDefinition}
                  ChildRenderer={ChildRenderer} // Continue passing it down
                />
              ))}
          </Tag>
        );

        if (sectionSchema.isFormContext) {
          return <FormProvider>{sectionContent}</FormProvider>;
        }

        return sectionContent;
      }
    }
    case 'component': {
      const componentSchema = nodeWithResolvedParams as ComponentNode;
      const RegisteredComponent = ComponentRegistry[componentSchema.componentType];
      if (RegisteredComponent) {
        // For components, exclude margin and padding from wrapper styles
        const { margin, padding, marginTop, marginBottom, marginLeft, marginRight,
          paddingTop, paddingBottom, paddingLeft, paddingRight,
           ...restStyles } = finalStyles;

        // Ensure required props are present for known components
        const componentExtraProps: Record<string, any> = {};
        if (componentSchema.componentType === 'Cart') {
          // Prefer explicit param, otherwise derive from siteInfo first
          const providedShopId = (componentSchema.params as any)?.shopId;
          const derivedShopId = providedShopId
            || (siteInfo as any)?.shop?.id
            || (mainPageData as any)?.shop?.id;
          if (derivedShopId) {
            componentExtraProps.shopId = derivedShopId;
            console.log('[NodeRenderer] Cart component - derived shopId:', derivedShopId, 'from siteInfo:', (siteInfo as any)?.shop?.id);
          } else {
            console.warn('[NodeRenderer] Cart component - no shopId found in siteInfo or mainPageData');
          }
        }

        return (
          <div 
            ref={nodeRef as any}
            id={`${componentSchema.id}-wrapper`}
            style={restStyles} 
            className={finalClassName}
            {...handlers}
            data-oskiynai-scope={componentSchema.id}
          >
            <RegisteredComponent
              id={componentSchema.id}
              nodeSchema={componentSchema}
              {...componentSchema.params}
              {...componentExtraProps}
              // Pass editor props to components that need them
              isInspectMode={isInspectMode}
              onDeleteNode={onDeleteNode}
              onDuplicateNode={onDuplicateNode}
              onMoveNode={onMoveNode}
              pageDefinition={pageDefinition}
              setPageDefinition={setPageDefinition}
              ChildRenderer={ChildRenderer}
            />
          </div>
        );
      }
      return <div style={finalStyles} className={finalClassName} data-node-id={componentSchema.id} data-oskiynai-scope={componentSchema.id} role="alert">Unknown Component Type: {componentSchema.componentType}</div>;
    }
    case 'codeblock': {
      const codeBlockSchema = nodeWithResolvedParams as CodeBlockNode;
      // Delegate all logic to the specialized CodeBlockRenderer
      return (
        <CodeBlockRenderer 
          schema={codeBlockSchema}
          resolvedParams={codeBlockSchema.params}
          style={finalStyles}
          className={finalClassName}
          scopeId={parentScopeId || codeBlockSchema.id}
        />
      );
    }
    default:
      const unknownNode = nodeWithResolvedParams as any;
      console.warn(`[NodeRenderer] Node: ${nodeSchema.id} - Unknown Node Type: ${unknownNode.type}`);
      return (
        <div 
          style={finalStyles} 
          className={finalClassName} 
          data-node-id={unknownNode.id || 'unknown'} 
          data-oskiynai-scope={unknownNode.id || 'unknown'}
          role="alert"
        >
          {showDevInfo && <small>Unknown Node Type: </small>}{unknownNode.type || 'undefined'}
        </div>
      );
  }
};

export default React.memo(NodeRenderer);
