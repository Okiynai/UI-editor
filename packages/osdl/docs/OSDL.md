# Okiynai Site Description Language (OSDL) V1.0

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/OSDL%20Version-3.2-blue)](https://github.com/your-repo/osdl)
[![Powered By](https://img.shields.io/badge/Powered%20By-RQL-purple)](https://github.com/your-repo/rql)

**Okiynai Site Description Language (OSDL)** is a declarative, JSON-based language for describing the complete structure, styling, behavior, and data requirements of modern, dynamic websites. It is designed to be expressive enough for complex designs, yet structured and semantic enough to be generated, understood, and manipulated by both human developers and AI agents.

## Core Philosophy

-   **Expressiveness:** Capable of describing a wide range of web designs, including complex layouts, animations, and interactions.
-   **Structure & Semantics:** Provides a clear, logical, and semantically rich way to represent website structure.
-   **AI-Readiness:** Incorporates specific elements to facilitate AI-driven design, content generation, and site management.
-   **Data Unification:** Seamlessly integrates with [RQL (Resource Query Language)](https://github.com/your-repo/rql) for powerful, declarative, and batched data fetching.
-   **Developer Experience:** While primarily for a visual builder, the underlying JSON is human-readable and manageable.

## ✨ Key Features

-   **Component-Based Hierarchy:** Build pages from recursive `sections`, indivisible `atoms`, and reusable `components`.
-   **Unified Data Fetching with RQL:** Declaratively specify all page and component data needs using RQL queries, which are automatically batched into a single, efficient API call.
-   **Declarative Event System:** Define complex user interactions (`onClick`, `onSubmit`) and their consequences (UI updates, API calls, navigation) without writing a single line of imperative JavaScript.
-   **Advanced Layout & Positioning:** Full support for Flexbox, Grid, and absolute/fixed positioning with CSS transforms.
-   **Rich Animation System:** Define keyframe animations triggered by load, scroll, hover, or click events.
-   **Full Responsiveness:** Override any node property at specific breakpoints for pixel-perfect responsive design.
-   **Deep Localization:** Override content, layout, and visibility on a per-locale basis.
-   **Automated Loading States:** Define `loadingBehavior` (skeletons, spinners) that the renderer automatically displays while data is being fetched.
-   **Custom Code & Logic:** Securely embed custom HTML, CSS, JavaScript, or even sandboxed React components for ultimate extensibility.

## Table of Contents

1.  [**The OSDL Data Model**](#1-the-osdl-data-model)
    -   [The Page (`PageDefinition`)](#the-page-pagedefinition)
    -   [The Anatomy of a Node (`BaseNode`)](#the-anatomy-of-a-node-basenode)
    -   [The Node Hierarchy](#the-node-hierarchy)
2.  [**Dynamic Data with RQL**](#2-dynamic-data-with-rql)
    -   [Page-Level Data (`dataSource`)](#page-level-data-datasource)
    -   [Node-Level Data (`dataRequirements`)](#node-level-data-datarequirements)
    -   [Data Binding & Contexts](#data-binding--contexts)
3.  [**Interactive Events & Actions**](#3-interactive-events--actions)
    -   [Event Triggers (`eventHandlers`)](#event-triggers-eventhandlers)
    -   [The Action Object](#the-action-object)
    -   [A Tour of Action Types](#a-tour-of-action-types)
    -   [Comprehensive Example: Modal Contact Form](#comprehensive-example-modal-contact-form)
4.  [**Layout & Styling**](#4-layout--styling)
5.  [**Advanced Concepts**](#5-advanced-concepts)
    -   [Full Responsiveness (`responsiveOverrides`)](#full-responsiveness-responsiveoverrides)
    -   [Localization (`localeOverrides`)](#localization-localeoverrides)
    -   [Loading States (`loadingBehavior`)](#loading-states-loadingbehavior)
    -   [AI Integration (`remarksAI`)](#ai-integration-remarksai)
    -   [Extensibility (`CodeBlockNode` & `customLogic`)](#extensibility-codeblocknode--customlogic)
6.  [**Full Example: Dynamic Hero Section**](#6-full-example-dynamic-hero-section)
7.  [**Renderer Architecture (Conceptual)**](#7-renderer-architecture-conceptual)

## 1. The OSDL Data Model

### The Page (`PageDefinition`)

Each webpage is defined by a single `PageDefinition` object. It contains page-level metadata like the `route`, `name`, `seo` settings, and the root `nodes` that make up the page's content.

### The Anatomy of a Node (`BaseNode`)

The **Node** is the fundamental building block of OSDL. Every element on a page is a Node. Each node shares a set of common properties that define its identity, appearance, and behavior.

-   `id`: A unique identifier for the node within the page. **Critical** for targeting by actions and styles.
-   `type`: The node's structural type (`section`, `atom`, `component`, `codeblock`).
-   `order`: A number defining its rendering order relative to its siblings.
-   `params`: An object containing the node's specific content or configuration (e.g., the `text` of a button, the `src` of an image).
-   `positioning`: For advanced layouts, defining `position`, `zIndex`, and CSS `transform` properties.
-   `animations`: An array of declarative animation rules.
-   `eventHandlers`: Defines how the node reacts to user interactions like `onClick`.
-   `responsiveOverrides`: A map of breakpoint-specific property overrides for responsive design.
-   `localeOverrides`: A map of locale-specific property overrides for translation and localization.
-   `visibility`: Rules for conditionally showing or hiding the node based on data context.
-   `loadingBehavior`: Defines what to show (e.g., a skeleton placeholder) while the node's data is loading.
-   `dataRequirements`: Specifies any data the node needs to fetch independently via RQL.
-   `customLogic`: An escape hatch for attaching custom JavaScript or React hooks.
-   `remarksAI`: A free-text field for providing hints or instructions to AI design agents.

### The Node Hierarchy

-   **`section`**: The primary container for layout. A `SectionNode` uses a `layout` property (flex, grid, or flow) to arrange its `children` and can be nested to create complex structures. It can also be flagged as a `form` context.
-   **`atom`**: The smallest, indivisible building block, like a piece of text (`Text`), an image (`Image`), or an input field (`Input`). An `AtomNode` has an `atomType` that specifies what it is.
-   **`component`**: A pre-built, reusable collection of nodes that represents a larger piece of UI, like a `Navbar` or `ProductCard`. A `ComponentNode` has a `componentType`.
-   **`codeblock`**: A special node for embedding custom HTML, CSS, JavaScript, or even sandboxed React JSX components.

## 2. Dynamic Data with RQL

OSDL uses a declarative data-fetching model powered by **RQL**, allowing you to specify all data needs directly within the page structure.

### Page-Level Data (`dataSource`)

A dynamic page (e.g., `/products/[productId]`) uses the `dataSource` property to define its main data requirements. This is typically a batched RQL query.

```json
"dataSource": {
  "type": "rql",
  "sourceParams": {
    "queries": {
      "mainProduct": {
        "contract": "getProductDetail",
        "params": { "productId": "{{ page.routeParams.productId }}" },
        "select": { "id": true, "name": true, "categoryId": true }
      }
    }
  }
}
```

### Node-Level Data (`dataRequirements`)

Individual nodes can also declare their own, independent data needs using the `dataRequirements` property. This allows components to be truly self-contained.

```json
"dataRequirements": [
  {
    "key": "relatedItems",
    "source": {
      "type": "rql",
      "queries": {
        "related": {
          "contract": "getProductsByCategory",
          "params": { "categoryId": "{{ data.mainProduct.categoryId }}" },
          "select": { "id": true, "name": true }
        }
      }
    }
  }
]
```

### Data Binding & Contexts

Once data is fetched, it's accessible within node properties using a simple `{{...}}` template syntax. The renderer makes several contexts available:

-   `{{ data... }}`: Accesses page-level data from `PageDefinition.dataSource`. Ex: `{{ data.mainProduct.name }}`.
-   `{{ nodeData... }}`: Accesses node-level data from `node.dataRequirements`. Ex: `{{ nodeData.relatedItems.related[0].name }}`.
-   `{{ page... }}`: Accesses information about the current page. Ex: `{{ page.routeParams.productId }}`.
-   `{{ formData... }}`: **Inside an action**, accesses values from input atoms within a form. Ex: `{{ formData.email_input }}`.
-   `{{ actionResults... }}`: **Inside `onSuccess`/`onError`**, accesses the data returned by a parent `executeRQL` action. Ex: `{{ actionResults.updateResult.id }}`.

## 3. Interactive Events & Actions

OSDL features a powerful, fully declarative event system that handles complex UI logic without custom JavaScript.

### Event Triggers (`eventHandlers`)

Every node can have an `eventHandlers` property. This object maps an `EventTriggerType` (like `onClick`, `onSubmit`, `onMouseEnter`) to an array of `Action` objects.

### The Action Object

An `Action` is a single, declarative instruction. Actions are executed in sequence. An action has:
- `id`: A unique ID for the step.
- `type`: The kind of action to perform.
- `params`: The configuration for that action.
- `conditions`: Optional rules that must be met for the action to run.
- `delayMs`: An optional delay before execution.
- `onSuccess` / `onError`: For async actions, these are nested action chains that run based on the outcome.

### A Tour of Action Types

OSDL provides a comprehensive set of actions to cover most web application needs:

| Action Type       | Description                                                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `updateNodeState` | The workhorse. Changes any property of any other node on the page (e.g., to show/hide a modal, update text content).                       |
| `executeRQL`      | Executes an RQL query or mutation. The primary way to send data to the server (e.g., submitting a form).                                   |
| `refetchPageData` | Triggers a refetch of the page's main `dataSource`. Useful for refreshing data after a mutation.                                           |
| `navigate`        | Navigates the user to a new internal or external URL.                                                                                    |
| `scrollTo`        | Smoothly scrolls the viewport to a specific node on the page.                                                                            |
| `resetForm`       | Clears all input values within a `SectionNode` that is marked as a form context.                                                         |
| `openModal`       | Syntactic sugar for `updateNodeState` to make a modal section visible.                                                                   |
| `closeModal`      | Syntactic sugar for `updateNodeState` to hide a modal section.                                                                           |
| `dispatchEvent`   | For advanced, decoupled communication between components by firing custom events.                                                          |
| `submitData`      | A legacy action for submitting data to a generic REST endpoint. `executeRQL` is preferred.                                                 |

### Comprehensive Example: Modal Contact Form

This example shows a button that opens a modal. The modal contains a form that, upon submission, calls an RQL mutation, shows a success message, and then closes the modal after a delay.

```json
[
  {
    "id": "contact_button",
    "type": "atom", "atomType": "Button",
    "params": { "text": "Contact Us" },
    "eventHandlers": {
      "onClick": [
        { "id": "action_open_modal", "type": "openModal", "params": { "modalNodeId": "contact_modal" } }
      ]
    }
  },
  {
    "id": "contact_modal",
    "type": "section",
    "visibility": { "hidden": true },
    "positioning": { "position": "fixed", "zIndex": 1000 /* ... */ },
    "children": [
      {
        "id": "contact_form_section",
        "type": "section",
        "htmlTag": "form",
        "isFormContext": true,
        "eventHandlers": {
          "onSubmit": [
            {
              "id": "action_submit_rql",
              "type": "executeRQL",
              "params": {
                "resultKey": "formSubmission",
                "query": {
                  "contract": "submitContactForm",
                  "params": {
                    "email": "{{ formData.email_input }}",
                    "message": "{{ formData.message_input }}"
                  },
                  "select": { "success": true, "ticketId": true }
                }
              },
              "onSuccess": [
                {
                  "id": "act_hide_form",
                  "type": "updateNodeState",
                  "params": { "targetNodeId": "contact_form_section", "updates": { "visibility": { "hidden": true } } }
                },
                {
                  "id": "act_show_success",
                  "type": "updateNodeState",
                  "params": {
                    "targetNodeId": "success_message",
                    "updates": {
                      "visibility": { "hidden": false },
                      "params": { "content": "Success! Your ticket ID is {{ actionResults.formSubmission.ticketId }}." }
                    }
                  }
                },
                {
                  "id": "act_close_modal_delayed",
                  "type": "closeModal",
                  "params": { "modalNodeId": "contact_modal" },
                  "delayMs": 3000
                }
              ],
              "onError": [
                { "id": "act_show_error", "type": "updateNodeState", "params": { /* ... show error message ... */ } }
              ]
            }
          ]
        },
        "children": [ /* ... Input and Button atoms ... */ ]
      },
      { "id": "success_message", "type": "atom", "atomType": "Text", "visibility": { "hidden": true } }
    ]
  }
]
```

## 4. Layout & Styling

-   **Global Styles**: Defined in `siteSettings.json` as CSS Custom Properties (e.g., `--primary-color`).
-   **`LayoutConfig`**: The `layout` property on `SectionNode` defines `mode` (flex, grid), `direction`, `justifyContent`, `alignItems`, `gap`, `padding`, etc.
-   **`PositioningConfig`**: The `positioning` property on any node allows for `position` (absolute, fixed), `zIndex`, and CSS `transform`s.

## 5. Advanced Concepts

### Full Responsiveness (`responsiveOverrides`)

Any node can have its properties overridden at specific breakpoints. Breakpoints are defined globally in `siteSettings.json`.

```json
// Example on a SectionNode
"responsiveOverrides": {
  "mobile": {
    "layout": {
      "direction": "column",
      "gap": "16px"
    },
    "params": {
      "someParam": "mobileValue"
    }
  },
  "tablet": {
    "layout": {
      "direction": "row"
    }
  }
}
```

### Localization (`localeOverrides`)

Similar to responsiveness, `localeOverrides` allows you to change node properties based on the active locale, making translation and LTR/RTL adjustments seamless.

```json
// Example on a Text atom
"params": {
  "content": "Hello World"
},
"localeOverrides": {
  "es-ES": {
    "params": {
      "content": "Hola Mundo"
    }
  },
  "ar-EG": {
    "params": {
      "content": "مرحبا بالعالم"
    },
    "layout": {
      "direction": "rtl"
    }
  }
}
```

### Loading States (`loadingBehavior`)

To prevent layout shifts and improve perceived performance, any node can define a `loadingBehavior`. The renderer will automatically display this placeholder while waiting for the node's required data to be fetched.

```json
"loadingBehavior": {
  "placeholderType": "skeleton",
  "skeletonConfig": {
    "shape": "text",
    "lines": 3,
    "width": "80%"
  }
}
```

### AI Integration (`remarksAI`)

OSDL is built for an AI-first future. The `remarksAI` field allows developers or other AIs to leave contextual hints directly on a node, guiding generative design agents.

```json
"remarksAI": "AI, this heading should be persuasive and create a sense of urgency. Use a strong, active verb."
```

### Extensibility (`CodeBlockNode` & `customLogic`)

For cases that fall outside OSDL's declarative system, you have two escape hatches:
-   **`CodeBlockNode`**: Embed a block of custom HTML, CSS, JavaScript, or a sandboxed React component.
-   **`customLogic`**: Attach a small script or React hook definition directly to a standard OSDL node to add custom behavioral logic.

## 6. Full Example: Dynamic Hero Section

This example synthesizes data fetching, responsiveness, and animations.

```json
{
  "id": "dynamic_hero",
  "type": "section",
  "layout": { "mode": "flex", "direction": "column", "alignItems": "center", "height": "80vh" },
  "dataRequirements": [{ "key": "hero", "source": { "type": "rql", /* ... */ } }],
  "children": [
    {
      "id": "hero_title",
      "type": "atom",
      "atomType": "Text",
      "params": { "tag": "h1", "content": "{{ nodeData.hero.content.title }}" },
      "loadingBehavior": { "placeholderType": "skeleton", "skeletonConfig": { "shape": "text", "height": "4rem" } },
      "responsiveOverrides": { "mobile": { "params": { "fontSize": "2.5rem" } } }
    },
    {
      "id": "hero_button",
      "type": "atom",
      "atomType": "Button",
      "params": { "text": "Explore" },
      "eventHandlers": { "onClick": [{ "id": "nav", "type": "navigate", "params": { "url": "/products" } }] },
      "animations": [{ /* ... */ }]
    }
  ]
}
```

## 7. Renderer Architecture (Conceptual)

A client-side renderer (e.g., in React) is responsible for interpreting an OSDL document.
1.  **Fetch & Parse:** Load `siteSettings.json` and the `PageDefinition` for the route.
2.  **Orchestrate Data:** Collect all `dataSource` and `dataRequirements` and send a single, batched POST request to the RQL endpoint.
3.  **Create Context:** Make all settings, fetched data, and breakpoint/locale info available via a shared context.
4.  **Recursive Render:** Traverse the `nodes` tree. For each node:
    -   Apply responsive and locale overrides.
    -   Resolve all `{{...}}` data-binding templates.
    -   Check visibility and render loading placeholders if needed.
    -   Select the appropriate Atom/Component renderer.
    -   Apply styles, layout, animations, and attach event handlers.
5.  **Listen & Update:** The renderer's Action Executor listens for events, processes Action chains, and updates the state of the OSDL tree, causing the UI to react accordingly.