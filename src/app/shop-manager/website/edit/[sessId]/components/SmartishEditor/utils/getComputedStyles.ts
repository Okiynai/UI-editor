/**
 * Helper to read computed CSS values from a DOM element
 */
export const getComputedStyleValue = (element: Element, property: string): any => {
  // Use the element's own document view to correctly handle iframe contexts
  const view = element.ownerDocument && element.ownerDocument.defaultView ? element.ownerDocument.defaultView : window;
  const computedStyle = view.getComputedStyle(element as Element);
  return computedStyle.getPropertyValue(property) || (computedStyle as any)[property] || undefined;
};