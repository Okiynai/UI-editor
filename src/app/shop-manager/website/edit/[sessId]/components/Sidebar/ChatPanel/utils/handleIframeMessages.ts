import { AgentTimelineItem } from '@/OSDL/editor/hooks/useBuilderStream';
import { isEqual } from 'lodash';

export interface HandleIframeMessageDependencies {
  // State management
  setChatError: (error: { type: string; message: string } | null) => void;
  setTimeline: (timeline: AgentTimelineItem[] | ((prev: AgentTimelineItem[]) => AgentTimelineItem[])) => void;

  // Current state values
  currentTimelineLength: number;

  // Parser instance
  streamParser: any; // JSONStreamParser instance
  
  // Parsed sections ref for tracking
  parsedSectionsRef: React.MutableRefObject<Array<{
    sectionName: string;
    sectionContent: any;
    creationTimestamp?: number;
  }>>;
}

export const handleIframeMessages = (
  event: MessageEvent,
  deps: HandleIframeMessageDependencies
) => {
  // In production, you should validate the origin
  // if (event.origin !== 'http://localhost:3000') return;

  const { type, payload } = event.data;

  switch (type) {
    case 'CHAT_ERROR':
      console.log('[ChatPanel] Chat error received:', payload);
      deps.setChatError({
        type: payload.type || 'generic',
        message: payload.message || 'An unexpected error occurred.'
      });
      break;

    case 'TOKEN_CHUNK_PARSED':
      console.log('[ChatPanel] Token chunk parsed:', payload);
      const { rawTokens, reasoningTokens, rawSections } = payload;

      // if this, then we have an object thaht looks ike tish 
      /*
      const newSection = {
        sectionName: 'reasoning',
        sectionContent: {
          rawContent: token,
          startTimestamp: data.timestamp,
          endTimestamp: data.timestamp
        }
      };
        */
      // and therefore we should od this smart merging logic
      if(payload.reasoningTokens) {
        deps.setTimeline(prev => {
          const newTimeline = [...prev];

          // SAME LOGIC AS THE RAW TOKENS LOGIC
          let targetIndex = -1;
          let foundUserMessage = false;

          // Search backwards from the end of timeline
          for (let i = newTimeline.length - 1; i >= 0; i--) {
            const item = newTimeline[i];

            if (item.type === 'userMessage' || 
              (item.type === 'parsedSection' && item.sectionName !== 'reasoning')) {
              // Found user message first - stop and create new rawToken
              foundUserMessage = true;
              break;
            } else if (item.type === 'parsedSection' && item.sectionName === 'reasoning') {
              // Found reasoning section first - merge with it
              targetIndex = i;
              break;
            }
          }

          if (targetIndex >= 0 && !foundUserMessage) {
            // Merge with the nearest rawToken we found
            const existingTargetCopy = newTimeline[targetIndex];

            if (existingTargetCopy.type === 'parsedSection' 
              && existingTargetCopy.sectionName === 'reasoning') {

              newTimeline[targetIndex] = {
                ...existingTargetCopy, // sectionName, order, and parsedTimestamp 
                // ( which is useless here) intact

                parsedContent: {
                  rawContent: existingTargetCopy.parsedContent.rawContent +
                    (reasoningTokens.token as string),

                  // startTimestamp intact
                  startTimestamp: existingTargetCopy.parsedContent.startTimestamp,

                  // updating endTimestamp ofc.
                  endTimestamp: reasoningTokens.timestamp
                }
              };
            }

          } else {
            // Create new reasoning section entry (either timeline was empty, 
            // or we hit a userMessage)
            // OFC first case is never gonna happen but yeah.
            const newReasoningSection = {
              type: 'parsedSection' as const,
              sectionName: 'reasoning',
              parsedContent: {
                rawContent: reasoningTokens.token,
                startTimestamp: reasoningTokens.timestamp,
                endTimestamp: reasoningTokens.timestamp
              },
              parseStartTimestamp: reasoningTokens.timestamp,
              order: newTimeline.length + 1
            };

            newTimeline.push(newReasoningSection);
          }

          return newTimeline;
        });
      }

      // Handle raw tokens with smart merging logic
      if (rawTokens) {
        deps.setTimeline(prev => {
          const timeline = [...prev];

          // Algorithm: Look backwards through timeline until we find either:
          // 1. A rawToken (merge with it)
          // 2. A userMessage (create new rawToken)
          // 3. End of timeline (create new rawToken)

          let targetIndex = -1;
          let foundUserMessage = false;

          // Search backwards from the end of timeline
          for (let i = timeline.length - 1; i >= 0; i--) {
            const item = timeline[i];

            if (item.type === 'userMessage') {
              // Found user message first - stop and create new rawToken
              foundUserMessage = true;
              break;
            } else if (item.type === 'rawToken') {
              // Found rawToken first - merge with it
              targetIndex = i;
              break;
            }
          }

          if (targetIndex >= 0 && !foundUserMessage) {
            // Merge with the nearest rawToken we found
            const existingToken = timeline[targetIndex];
            if (existingToken.type === 'rawToken') {
              timeline[targetIndex] = {
                ...existingToken,
                content: existingToken.content + (rawTokens as string),
                parseStartTimestamp: Date.now() // Update timestamp to reflect the merge
              };
            }
          } else {
            // Create new rawToken entry (either timeline was empty, or we hit a userMessage)
            const rawTokenItem = {
              type: 'rawToken' as const,
              content: rawTokens as string,
              parseStartTimestamp: Date.now(),
              order: timeline.length + 1
            };
            timeline.push(rawTokenItem);
          }

          return timeline;
        });
      }

      if (rawSections) {
        // Important: process tokens outside setState to avoid double-invocation under StrictMode
        // and to ensure the parser is called exactly once per token.
        deps.streamParser.processToken(rawSections);
        const currentCompletedSections = deps.streamParser.getCompletedSections();

        // Convert parser sections to legacy format
        const legacySectionsParserFormat: Array<{
          sectionName: string;
          parsedContent: any;
        }> = [];

        // Clean up the sections to match the expected format
        currentCompletedSections.forEach((section: any) => {
          const sectionName = Object.keys(section)[0];
          const parsedContent = section[sectionName];

          if (sectionName === 'response') {
            legacySectionsParserFormat.push({
              sectionName: 'response',
              parsedContent,
            });
          }

          if (sectionName === 'action_json') {
            if (Array.isArray(parsedContent) && parsedContent.length == 0) {
              // just do nothing.
            }

            if (typeof parsedContent === 'object' && !Array.isArray(parsedContent)) {
              legacySectionsParserFormat.push({
                sectionName: 'action_json',
                parsedContent,
              });
            }

            // array handling
            if (Array.isArray(parsedContent) && parsedContent.length > 0) {
              parsedContent.forEach(entry => {
                legacySectionsParserFormat.push({
                  sectionName: 'action_json',
                  parsedContent: entry,
                });
              });
            }
          }
        });

        // Initialize array to track new/updated sections
        const newSections: Array<{
          sectionName: string;
          sectionContent: any;
          creationTimestamp?: number;
          isUpdated?: boolean;
          isNew?: boolean;
        }> = [];

        // First process: Compare only the last element in our ref 
        // with the one at same index from parser
        const lastIndex = deps.parsedSectionsRef.current.length - 1;

        if (deps.parsedSectionsRef.current.length > 0) {
          // our last index
          const existingLastSection = deps.parsedSectionsRef.current[lastIndex];

          // potentially new last index
          const potentiallyNewSection = legacySectionsParserFormat[lastIndex];

          if (
            potentiallyNewSection && 
            !isEqual(existingLastSection.sectionContent, potentiallyNewSection.parsedContent) && 
            existingLastSection.sectionName === potentiallyNewSection.sectionName
          ) {
            // Content updated, add the fully updated section
            newSections.push({
              ...existingLastSection, // name and creationTimestamp intact
              sectionContent: potentiallyNewSection.parsedContent,
              isUpdated: true,
            });

            // sync the parsedSectionsRef simultaneously
            deps.parsedSectionsRef.current[lastIndex] = {
              ...existingLastSection,
              sectionContent: potentiallyNewSection.parsedContent,
            };
          }
        }

        // Second process: Take everything from that index to the end and add to newSections
        legacySectionsParserFormat.slice(lastIndex + 1).forEach(section => {
          const newSection = {
            sectionName: section.sectionName,
            sectionContent: section.parsedContent,
            creationTimestamp: Date.now(),
            isNew: true,
          };

          newSections.push(newSection);

          // Add to parsedSectionsRef
          deps.parsedSectionsRef.current.push({
            sectionName: section.sectionName,
            sectionContent: section.parsedContent,
            creationTimestamp: Date.now(),
          });
        });

        console.log('wtf newSections', newSections);

        // Now update timeline with the new/updated sections
        if (newSections.length > 0) {
          deps.setTimeline(prev => {
            const timeline = [...prev];

            newSections.forEach(section => {
              if (section.isUpdated) {
                // Find and update the existing section in timeline
                const timelineSectionIndex = timeline.findIndex(item => 
                  item.type === 'parsedSection' && 
                  item.sectionName === section.sectionName &&
                  item.parseStartTimestamp === section.creationTimestamp
                );

                if (timelineSectionIndex >= 0) {
                  timeline[timelineSectionIndex] = {
                    ...timeline[timelineSectionIndex],
                    parsedContent: section.sectionContent
                  } as AgentTimelineItem;
                }
              } else if (section.isNew) {
                // Add new section to timeline
                timeline.push({
                  type: 'parsedSection',
                  sectionName: section.sectionName,
                  parsedContent: section.sectionContent,
                  parseStartTimestamp: section.creationTimestamp || Date.now(),
                  order: timeline.length + 1
                });
              }
            });

            console.log('wtf updated timeline', timeline);
            return timeline;
          });
        }
      }

      break;

    case 'STREAM_ENDED':
      console.log('[ChatPanel] Stream ended');
      deps.setTimeline(prev => {
        // Check if we already have a streamEnd item to prevent duplicates
        const hasStreamEnd = prev.some(item => item.type === 'streamEnd');
        if (hasStreamEnd) {
          console.warn('[ChatPanel] Stream end already exists, skipping duplicate');
          return prev;
        }
        
        // Also check if the last item is already a streamEnd (extra safety)
        if (prev.length > 0 && prev[prev.length - 1].type === 'streamEnd') {
          console.warn('[ChatPanel] Last item is already streamEnd, skipping duplicate');
          return prev;
        }
        
        return [...prev, {
          type: 'streamEnd',
          parseStartTimestamp: Date.now(),
          order: prev.length + 1
        }];
      });
      break;

    default:
      console.warn('[ChatPanel] Unknown message type:', type);
  }
};
