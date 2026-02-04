# Pre-built Component Anatomy

This document describes the internal structure and anatomy of OSDL components - what they consist of, how they're structured, and what gets rendered in their wrapper vs. what doesn't.

## Component Structure Overview

All OSDL components follow a consistent pattern:
1. **Wrapper**: The main component container with styling and layout
2. **Internal Nodes**: Child nodes that are rendered using the NodeRenderer
3. **State Management**: Component-specific state and effects
4. **Event Handlers**: User interactions and callbacks

## Hero Component Anatomy

### Wrapper Structure
```tsx
<div id={id} className={className} data-component-type="Hero" style={{ ...style, ...marginStyle }}>
  {/* Dev info (optional) */}
  <div style={aspectRatioStyle}>
    {/* Images */}
    {/* Overlay with content */}
  </div>
</div>
```

### What's Inside the Wrapper
- **Aspect ratio container**: Controls the hero's dimensions and positioning
- **Image carousel**: Multiple images with transition effects
- **Overlay**: Dark overlay for content visibility
- **Scroll indicators**: Navigation buttons and dots (if multiple images)
- **Hero content**: Dynamic content rendered via NodeRenderer

### What's NOT in the Wrapper
- **Margin styles**: Applied to the outer wrapper div
- **Dev info**: Only shown in development mode
- **Event handlers**: Attached to specific elements within

### Internal Node Structure
The Hero component uses `heroContent` as a SectionNode that gets rendered via NodeRenderer:
```tsx
<ChildRenderer
  nodeSchema={heroContentSection}
  setPageDefinition={setPageDefinition}
  isInspectMode={isInspectMode}
  editingSections={editingSections}
  onDeleteNode={onDeleteNode}
  onDuplicateNode={onDuplicateNode}
  ChildRenderer={ChildRenderer}
/>
```

### Key Features
- **Image handling**: Supports single images or carousels
- **Auto-scroll**: Automatic image rotation
- **Transition animations**: Fade, slide, or none
- **Responsive design**: Adapts to container width
- **Accessibility**: Alt text support and ARIA labels

## Navbar Component Anatomy

### Wrapper Structure
```tsx
<>
  <nav style={navbarStyle}>
    {/* Left section: Logo + Desktop nav */}
    {/* Center section: Centered nav (if logo centered) */}
    {/* Right section: Icons */}
  </nav>
  {/* Mobile sidebar */}
  {/* Backdrop */}
</>
```

### What's Inside the Wrapper
- **Nav container**: Main navigation bar with flexbox layout
- **Logo section**: Shop logo with positioning options
- **Navigation links**: Desktop and mobile versions
- **Icon section**: Cart, user, and hamburger icons
- **Mobile sidebar**: Slide-out navigation for mobile
- **Backdrop**: Overlay for mobile sidebar

### What's NOT in the Wrapper
- **Margin styles**: Applied to the nav element
- **Responsive breakpoints**: Handled via CSS media queries
- **State management**: Sidebar open/close state

### Internal Node Structure
The Navbar creates multiple AtomNodes for rendering:
- **Logo node**: Image atom for the shop logo
- **Nav link nodes**: Link atoms for navigation
- **Icon nodes**: Icon atoms for cart, user, hamburger
- **Mobile sidebar section**: Section node containing mobile nav links

### Key Features
- **Responsive design**: Desktop and mobile layouts
- **Logo positioning**: Left, center, or right placement
- **Active states**: Visual indicators for current page
- **Mobile sidebar**: Slide-out navigation with backdrop
- **Hover animations**: Smooth transitions on interactions

## Component Development Guidelines

### When Creating New Components
1. **Use NodeRenderer**: Always render internal content via NodeRenderer for consistency
2. **Handle props properly**: Parse and validate all incoming props
3. **Support inspection mode**: Components should work in both normal and inspect modes
4. **Follow naming conventions**: Use consistent ID patterns and class names
5. **Document anatomy**: Update this file when adding new components

### Common Patterns
- **Margin parsing**: Use the `parseMargin` utility function
- **State management**: Use React hooks for component state
- **Event handling**: Implement proper event handlers with useCallback
- **Styling**: Use inline styles for dynamic properties, CSS classes for static ones

### Testing Considerations
- **Responsive behavior**: Test on different screen sizes
- **Accessibility**: Ensure proper ARIA labels and keyboard navigation
- **Performance**: Optimize re-renders and state updates
- **Edge cases**: Handle missing props and error states 