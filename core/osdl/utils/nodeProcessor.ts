import { RepeaterConfig, BaseNode, ResponsiveBreakpointName, ResponsiveOverrideConfig, LocaleOverrideConfig, Node, SectionNode, LayoutConfig, PositioningConfig, NodeVisibilityConfig, AnimationRule, InteractionStatesConfig, LoadingBehaviorConfig, ParamDefinition } from '@/OSDL.types';
import { SiteSettings } from '@/OSDL.types'; // Assuming SiteSettings might be needed for breakpoint definitions
import { evaluateTemplate } from './expressionEvaluator'; 

// Helper for deep merging, especially for params, positioning, layout, etc.
// A simple deep merge, for arrays, it will replace. For objects, it will merge.
// This can be made more sophisticated if needed.
function deepMerge(target: any, source: any): any {
  if (typeof target !== 'object' || target === null || typeof source !== 'object' || source === null) {
    return source !== undefined ? source : target;
  }

  const output = { ...target };
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (sourceValue === undefined) {
        continue;
      }

      if (Array.isArray(sourceValue)) {
        output[key] = sourceValue; // Arrays are replaced
      } else if (typeof sourceValue === 'object' && sourceValue !== null) {
        output[key] = deepMerge(targetValue, sourceValue);
      } else {
        output[key] = sourceValue;
      }
    }
  }
  return output;
}

export function applyResponsiveOverrides<T extends Node>(
  node: T,
  activeBreakpointName: ResponsiveBreakpointName | null,
  breakpointDefinitions?: Record<ResponsiveBreakpointName, string> // Not strictly needed for merging, but good for context
): T {
  if (!node.responsiveOverrides || !activeBreakpointName || !node.responsiveOverrides[activeBreakpointName]) {
    return node;
  }

  const overrides = node.responsiveOverrides[activeBreakpointName];
  let overriddenNode = { ...node };

  // Order of properties based on ResponsiveOverrideConfig
  if (overrides.params !== undefined) {
    overriddenNode.params = deepMerge(overriddenNode.params, overrides.params);
  }
  if (overrides.positioning !== undefined) {
    overriddenNode.positioning = deepMerge(overriddenNode.positioning || {}, overrides.positioning) as PositioningConfig;
  }
  if (overrides.animations !== undefined) {
    // Animations array is typically replaced entirely for a breakpoint
    overriddenNode.animations = overrides.animations as AnimationRule[];
  }
  if (overrides.interactionStates !== undefined) {
    overriddenNode.interactionStates = deepMerge(overriddenNode.interactionStates || {}, overrides.interactionStates) as InteractionStatesConfig;
  }
  if (overrides.visibility !== undefined) {
    overriddenNode.visibility = deepMerge(overriddenNode.visibility || {}, overrides.visibility) as NodeVisibilityConfig;
  }
  if (overrides.order !== undefined) {
    overriddenNode.order = overrides.order;
  }
  if (overrides.loadingBehavior !== undefined) {
    overriddenNode.loadingBehavior = deepMerge(overriddenNode.loadingBehavior || {}, overrides.loadingBehavior) as LoadingBehaviorConfig;
  }

  // SectionNode specific overrides
  if (overriddenNode.type === 'section' && overrides.layout !== undefined) {
    (overriddenNode as SectionNode).layout = deepMerge((overriddenNode as SectionNode).layout, overrides.layout) as LayoutConfig;
  }
  if (overriddenNode.type === 'section' && overrides.inlineStyles !== undefined) {
    (overriddenNode as SectionNode).inlineStyles = deepMerge((overriddenNode as SectionNode).inlineStyles || {}, overrides.inlineStyles);
  }
  if (overriddenNode.type === 'section' && overrides.htmlTag !== undefined) {
    (overriddenNode as SectionNode).htmlTag = overrides.htmlTag;
  }
  
  // It's important to remove the responsiveOverrides property from the returned node
  // as it has now been processed for the active breakpoint.
  // However, the original node schema should remain untouched for other breakpoints.
  // So, we return a new object 'overriddenNode' which is a modified copy.
  // The original 'node.responsiveOverrides' should NOT be deleted from the source definition.

  return overriddenNode;
}

export function applyLocaleOverrides<T extends Node>(
  node: T,
  activeLocale: string | null
): T {
  if (!node.localeOverrides || !activeLocale || !node.localeOverrides[activeLocale]) {
    return node;
  }

  const overrides = node.localeOverrides[activeLocale];
  let overriddenNode = { ...node };

  // Order of properties based on LocaleOverrideConfig
  if (overrides.params !== undefined) {
    overriddenNode.params = deepMerge(overriddenNode.params, overrides.params);
  }
  if (overrides.layout !== undefined && 'layout' in overriddenNode) { // Check if node can have layout (SectionNode)
    (overriddenNode as SectionNode).layout = deepMerge((overriddenNode as SectionNode).layout, overrides.layout) as LayoutConfig;
  }
  if (overrides.positioning !== undefined) {
    overriddenNode.positioning = deepMerge(overriddenNode.positioning || {}, overrides.positioning) as PositioningConfig;
  }
  if (overrides.visibility !== undefined) {
    overriddenNode.visibility = deepMerge(overriddenNode.visibility || {}, overrides.visibility) as NodeVisibilityConfig;
  }
  if (overrides.order !== undefined) {
    overriddenNode.order = overrides.order;
  }

  // Similar to responsiveOverrides, we return a modified copy.
  // The original 'node.localeOverrides' should remain in the source definition.

  return overriddenNode;
}

// Helper for lodash-like get functionality with array indexing support
export function getPath<T>(obj: any, path: string, defaultValue?: T): T | any {
  if (obj === null || obj === undefined || typeof path !== 'string' || path.length === 0) {
    return defaultValue;
  }

  // Tokenize supports:
  // - dot notation: a.b.c
  // - bracket index: a[0]
  // - bracket quoted keys: a["some-key"], a['some.key']
  // - mixes of the above
  const tokens: string[] = [];
  const re = /[^.[\]]+|\[(?:([^"'\[\]]+)|["']([^"']+)["'])\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path))) {
    const unquoted = m[1];
    const quoted = m[2];
    tokens.push(unquoted !== undefined ? unquoted : (quoted !== undefined ? quoted : m[0]));
  }

  if (tokens.length === 0) return defaultValue;

  let current: any = obj;
  for (const rawKey of tokens) {
    if (current === null || current === undefined) return defaultValue;
    // Convert numeric indexes to numbers for arrays
    const key = rawKey.match(/^\d+$/) ? Number(rawKey) : rawKey;
    current = current[key];
  }

  return current === undefined ? defaultValue : current;
}

/**
 * Resolves a string containing template patterns like {{ path.to.value }}.
 * If the template string is exactly a single binding (e.g., "{{ data.user }}") and resolves to an object or array,
 * that object or array is returned. Otherwise, all bindings are stringified and interpolated.
 * 
 * NEW: Now supports simple boolean equality checks like "{{ path.value === 'literal' }}".
 * 
 * @param templateString The string containing templates.
 * @param context The data context to resolve against.
 * @returns The resolved string, boolean, or potentially an object/array if the template was a sole binding.
 */
/**
 * Resolves a string containing template patterns like {{ path.to.value }}.
 * This function is now a simple wrapper around the powerful evaluateTemplate utility.
 */
export function resolveDataBindingsInString(
    templateString: string,
    context: any
): any {
  // All the complex logic is now handled by our new evaluator.
  return evaluateTemplate(templateString, context);
}


export function resolveDataBindingsInObject<T extends Record<string, any>>(
    inputObject: T,
    context: any, // Replace with a more specific context type later
    paramDefinitions?: Record<string, ParamDefinition> // From SiteSettings, currently unused
): T {
  if (!inputObject || typeof inputObject !== 'object') return inputObject;

  // Handle arrays: map over elements and resolve bindings in each
  if (Array.isArray(inputObject)) {
    return inputObject.map(item => resolveDataBindingsInObject(item, context, paramDefinitions)) as unknown as T;
  }

  const resolvedObject = { ...inputObject }; // Shallow copy for the current level

  for (const key in resolvedObject) {
    if (Object.prototype.hasOwnProperty.call(resolvedObject, key)) {
      const value = resolvedObject[key];
      if (typeof value === 'string') {
        resolvedObject[key] = resolveDataBindingsInString(value, context);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively resolve for nested objects or arrays
        resolvedObject[key] = resolveDataBindingsInObject(value, context, paramDefinitions);
      }
      // Numbers, booleans, null are left as is
    }
  }
  return resolvedObject;
}

export function evaluateVisibility(
    visibilityConfig: NodeVisibilityConfig | undefined,
    context: any // Replace with specific context type
): boolean {
  if (!visibilityConfig) {
    return true; // Visible by default if no config.
  }

  // If statically hidden, and no conditions exist to potentially override, it's hidden.
  if (visibilityConfig.hidden === true && (!visibilityConfig.conditions || visibilityConfig.conditions.length === 0)) {
    return false;
  }
  
  // If no conditions, visibility is determined solely by the 'hidden' flag (which defaults to false if not present).
  if (!visibilityConfig.conditions || visibilityConfig.conditions.length === 0) {
    return !visibilityConfig.hidden;
  }

  // OSDL doesn't specify if conditions override `hidden: true`.
  // A reasonable interpretation: conditions are a dynamic layer. If the node is statically hidden, conditions are irrelevant.
  // If you want conditions to be able to show a hidden node, this logic would change.
  // Let's stick to: for a node to be visible, it must NOT be hidden AND its conditions must be met.
  if (visibilityConfig.hidden === true) {
      return false;
  }

  if (typeof visibilityConfig.expression === 'string') {
    // Our new evaluator will return a proper boolean or other types.
    // The `!!` converts any truthy/falsy value into a strict boolean.
    return !!evaluateTemplate(visibilityConfig.expression, context);
  }

  const results = visibilityConfig.conditions.map(condition => {
    const contextValue = getPath(context, condition.contextPath);
    const conditionValue = condition.value;

    // For 'exists'/'notExists', we don't need the conditionValue.
    if (condition.operator === 'exists') return contextValue !== undefined && contextValue !== null;
    if (condition.operator === 'notExists') return contextValue === undefined || contextValue === null;

    // For all other operators, if the value from context doesn't exist, the condition is false.
    if (contextValue === undefined || contextValue === null) {
      return false;
    }

    switch (condition.operator) {
      case 'equals':
        return contextValue == conditionValue; // Using == for loose equality can be beneficial here
      case 'notEquals':
        return contextValue != conditionValue;
      
      case 'greaterThan':
        return Number(contextValue) > Number(conditionValue);
      case 'greaterThanOrEqual':
        return Number(contextValue) >= Number(conditionValue);
      
      case 'lessThan':
        return Number(contextValue) < Number(conditionValue);
      case 'lessThanOrEqual':
        return Number(contextValue) <= Number(conditionValue);
      
      case 'contains':
        if (Array.isArray(contextValue)) {
          return contextValue.includes(conditionValue);
        }
        if (typeof contextValue === 'string') {
          return contextValue.includes(String(conditionValue));
        }
        return false;

      case 'notContains':
        if (Array.isArray(contextValue)) {
          return !contextValue.includes(conditionValue);
        }
        if (typeof contextValue === 'string') {
          return !contextValue.includes(String(conditionValue));
        }
        return true; // If it's not an array or string, it can't contain it.

      case 'regex':
        try {
          // The regex pattern is provided in condition.value
          const pattern = new RegExp(String(conditionValue));
          return pattern.test(String(contextValue));
        } catch (e) {
          console.warn(`[evaluateVisibility] Invalid regex pattern provided: ${conditionValue}`, e);
          return false;
        }

      default:
        console.warn(`[evaluateVisibility] Unknown operator: ${condition.operator}`);
        return false;
    }
  });

  if (visibilityConfig.conditionLogic === 'OR') {
    return results.some(res => res);
  } else { // Default to AND
    return results.every(res => res);
  }
}

// Function to recursively check for "{{data." in params object strings
export function nodeDependsOnDataContext(params: Record<string, any> | undefined | null): boolean {
  console.log(`[nodeDependsOnDataContext] Checking params:`, JSON.stringify(params));
  if (!params) {
    console.log(`[nodeDependsOnDataContext] Params are null or undefined, returning false.`);
    return false;
  }

  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      const value = params[key];
      // console.log(`[nodeDependsOnDataContext] Checking key: '${key}', value:`, value, `(type: ${typeof value})`);

      if (typeof value === 'string') {
        // console.log(`[nodeDependsOnDataContext] Value for '${key}' is a string. Checking for '{{data.' inclusion in:`, value);
        const searchString = '{{ data.';
        // For extreme debugging:
        // console.log(`[nodeDependsOnDataContext] Value char codes: ${value.split('').map(c => c.charCodeAt(0)).join(',')}`);
        // console.log(`[nodeDependsOnDataContext] SearchString '${searchString}' char codes: ${searchString.split('').map(c => c.charCodeAt(0)).join(',')}`);

        const hasDataBindingIncludes = value.includes(searchString);
        const hasDataBindingIndexOf = value.indexOf(searchString) !== -1;

        // console.log(`[nodeDependsOnDataContext] String '${value}' includes '${searchString}': ${hasDataBindingIncludes}`);
        // console.log(`[nodeDependsOnDataContext] String '${value}' indexOf '${searchString}': ${hasDataBindingIndexOf}`);
        
        if (hasDataBindingIndexOf) { // Using indexOf for robustness
          // console.log(`[nodeDependsOnDataContext] Found '${searchString}' in string value for key '${key}' using indexOf. Returning true.`);
          return true;
        }
      }
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // console.log(`[nodeDependsOnDataContext] Value for '${key}' is an object. Recursively checking:`, value);
        if (nodeDependsOnDataContext(value as Record<string, any>)) {
          // console.log(`[nodeDependsOnDataContext] Recursive call for object key '${key}' returned true. Returning true.`);
          return true;
        }
      }
      
      if (Array.isArray(value)) {
        // console.log(`[nodeDependsOnDataContext] Value for '${key}' is an array. Iterating items:`, value);
        for (const item of value) {
          if (typeof item === 'string') {
            // console.log(`[nodeDependsOnDataContext] Array item is a string. Checking for '{{data.' inclusion in:`, item);
            const searchStringItem = '{{ data.';
            const itemHasDataBindingIncludes = item.includes(searchStringItem);
            const itemHasDataBindingIndexOf = item.indexOf(searchStringItem) !== -1;
            // console.log(`[nodeDependsOnDataContext] Array item string '${item}' includes '${searchStringItem}': ${itemHasDataBindingIncludes}`);
            // console.log(`[nodeDependsOnDataContext] Array item string '${item}' indexOf '${searchStringItem}': ${itemHasDataBindingIndexOf}`);
            if (itemHasDataBindingIndexOf) { // Using indexOf for robustness
              // console.log(`[nodeDependsOnDataContext] Found '${searchStringItem}' in array item string for key '${key}' using indexOf. Returning true.`);
              return true;
            }
          }
          if (typeof item === 'object' && item !== null) {
            // console.log(`[nodeDependsOnDataContext] Array item is an object. Recursively checking:`, item);
            if (nodeDependsOnDataContext(item as Record<string, any>)) {
              // console.log(`[nodeDependsOnDataContext] Recursive call for array item object for key '${key}' returned true. Returning true.`);
              return true;
            }
          }
        }
      }
    }
  }
  // console.log(`[nodeDependsOnDataContext] No '{{data.' found in any value. Returning false for params:`, JSON.stringify(params));
  return false;
} 

/**
 * Recursively traverses a node and its children, generating new, unique IDs
 * based on a repeater's index and strategy.
 * @param node - The node template to process (should be a deep clone).
 * @param index - The zero-based index of the item in the repeater.
 * @param idStrategy - The ID generation strategy from the repeater config.
 * @param parentGeneratedId - The generated ID of the parent node, used for nesting.
 * @returns The same node object, now mutated with updated IDs.
 */
export function generateRepeatedNode(
  node: Node,
  index: number,
  idStrategy: RepeaterConfig['idStrategy'] = {},
  parentGeneratedId: string
): Node {
  const {
    separator = '_',
    includeParentIds = false,
    prefix = ''
  } = idStrategy;

  let idPrefix = prefix ? `${prefix}${separator}` : '';
  if (includeParentIds && parentGeneratedId) {
      idPrefix = `${parentGeneratedId}${separator}`;
  }
  
  // Generate the new ID for the current node
  const newId = `${idPrefix}${node.id}${separator}${index}`;
  node.id = newId;

  // If the node is a Section, recurse through its children or its own repeater template
  if (node.type === 'section') {
      // If the nested section also has a repeater, we must process its template
      if (node.repeater) {
          // The template itself needs to be processed with the new parent context
          node.repeater.template = generateRepeatedNode(
              node.repeater.template,
              index,
              idStrategy,
              newId // Pass the NEW parent ID down for the nested repeater
          );
      } 
      // Otherwise, process its static children
      else if (node.children && node.children.length > 0) {
          node.children = node.children.map(child => 
              generateRepeatedNode(child, index, idStrategy, newId) // Pass the NEW parent ID down
          );
      }
  }

  return node;
}
