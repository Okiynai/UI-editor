# Agent Integration Summary

This document outlines the work done to integrate an agentic AI editing workflow into the Okiynai Visual Builder.

## 1. Goal

The primary goal was to enable users to interact with an AI agent via a chat interface to perform edits on the Okiynai Site Description Language (OSDL) page structure. The agent should be able to receive a prompt, understand the context of selected elements, stream its thought process, and propose changes (diffs) that the user can accept or reject.

## 2. Technical Approach

The integration was achieved by creating a clean, unidirectional data flow from the UI to the agent and back, managed by a combination of hooks, state management, and clearly defined services.

### a. State Management (`Jotai`)

To keep the editor's state (like which nodes are selected or hovered) separate from the agent's state, a dedicated Jotai store was established in `src/store/editor.ts`. This store holds all state related to the agentic workflow:

-   `isAgentBusyAtom`: A boolean to track if the agent is currently processing a request.
-   `agentSessionIdAtom`: Stores the ID for the current streaming session.
-   `agentStreamLogAtom`: An array that logs all events from the agent stream for real-time feedback.
-   `pendingDiffsAtom`: An array that stores `ParsedDiff` objects proposed by the agent, waiting for user action.

### b. API Service (`services/api/ai.ts`)

A dedicated service was created to handle communication with the agent's backend endpoint.

-   It exposes a `startAgentStream` function that takes a user's prompt and the current editor context (selected nodes, current page).
-   It was initially built with an `axios` instance to match existing patterns but was refactored to use `fetch` per project standards.
-   It returns a session ID and a unique URL for the client to connect to an `EventSource` stream.

### c. The Agent Stream Hook (`core/editor/hooks/useAgentStream.ts`)

This custom hook is the core engine of the client-side agent logic. It orchestrates the entire process:

-   It uses the API service to initiate the stream.
-   It manages the `EventSource` connection, including opening, handling messages, and closing the connection on completion, error, or component unmount.
-   It listens for incoming events (`step_progress`, `workflow_completed`, etc.) and pushes them to the `agentStreamLogAtom`.
-   It parses incoming diffs from the stream, creates `ParsedDiff` objects, and adds them to the `pendingDiffsAtom`.

### d. UI Integration (`ChatPanel.tsx`)

The existing builder UI was used to complete the workflow:

-   The `ChatPanel` component calls the `useAgentStream` hook.
-   The user's input is sent to the agent via the `startStream` function.
-   The UI is disabled while `isAgentBusy` is true.
-   The `agentStreamLogAtom` is rendered in the "Chat" tab to show the agent's progress.
-   The `pendingDiffsAtom` is rendered as a list of `DiffCard` components in the "Smart Editor" tab.

### e. Applying Changes (`UIStateContext.tsx`)

To allow the agent's suggestions to visually affect the editor canvas, the `UIStateContext` was enhanced:

-   An `applyDiff` function was added to the context.
-   This function takes a `ParsedDiff` object and uses `lodash.set` to update the `nodeOverrides` state.
-   Because the `OkiynaiEditorRenderer` already uses `nodeOverrides` to apply client-side changes, applying a diff immediately and non-destructively re-renders the targeted node with the agent's suggested change.
-   When the user clicks "Apply" on a `DiffCard`, this function is called, completing the agent-to-editor feedback loop.

## 3. Next Steps & Future Improvements

While the core workflow is complete, there are several areas for enhancement:

-   **Implement Rejection Logic:** Currently, rejecting a diff simply removes it from the UI. A future improvement would be to send this feedback to the agent, allowing it to learn or try a different approach.
-   **Enhance Diff Complexity:** The current system handles simple string replacements on node properties. It should be expanded to handle more complex operations like adding new nodes, deleting nodes, or rearranging children. This will require a more sophisticated diff format and application logic.
-   **Visual Feedback for Diffs:** To improve UX, hovering over a `DiffCard` in the Smart Editor could highlight the corresponding node on the editor canvas. This would require updating the `hoveredNodeIdAtom` from the `DiffCard` component.
-   **Contextual Awareness:** The agent's effectiveness can be greatly improved by providing it with more context, such as the full OSDL specification, global site settings (colors, fonts), and a manifest of available components and their props.
-   **Error Handling:** Display agent-specific errors more gracefully in the chat log.
-   **Saving Changes:** Implement the logic to persist the `nodeOverrides` into the main `PageDefinition` when the user saves the page. 
