import { PartialRegexMatcher } from "../graveyard/PartialRegexMatcher";

export interface ParsedMDNode {
    element: string;
    children: (ParsedMDNode | string)[];
    attributes: Record<string, any>[];
}

export class MarkdownStreamParser {
    private buffer: string = '';
    private activePatternsStack: number[] = [];
    private chainMode: boolean = false;
    private matchers: PartialRegexMatcher[] = MARKDOWN_PATTERNS
        .map((pattern) => new PartialRegexMatcher(pattern.start));

    public parsedOutput: {
        element: string,
        content: string,
        attributes: Record<string, any>[],
    }[] = [];

    public root: ParsedMDNode = { element: "root", children: [], attributes: [] };
    private nodeStack: ParsedMDNode[] = [this.root];


    // Add end matchers for patterns that have regex end patterns
    private endMatchers: (PartialRegexMatcher | null)[] = MARKDOWN_PATTERNS
        .map((pattern) => {
            if (pattern.end) {
                return new PartialRegexMatcher(pattern.end);
            }
            return null;
        });

    // Helper to get current node
    private getCurrentNode(): ParsedMDNode {
        return this.nodeStack[this.nodeStack.length - 1];
    }

    // Helper to append content to current node
    private appendToCurrentNode(content: string | ParsedMDNode, resetBuffer: boolean,
        attribute?: string): void {
        const currentNode = this.getCurrentNode();
        if (!currentNode.children) {
            currentNode.children = [];
        }

        // If the last child is a string and we're adding a string, concatenate
        if (typeof content === 'string' &&
            currentNode.children.length > 0 &&
            typeof currentNode.children[currentNode.children.length - 1] === 'string') {
            currentNode.children[currentNode.children.length - 1] += content;
        } else {
            currentNode.children.push(content);
        }

        if (attribute && typeof content === 'string') {
            // Ensure attributes array exists
            if (!currentNode.attributes) {
                currentNode.attributes = [];
            }

            // Get or create the last attribute object
            let lastAttribute: Record<string, any>;
            if (currentNode.attributes.length === 0) {
                lastAttribute = {};
                currentNode.attributes.push(lastAttribute);
            } else {
                lastAttribute = currentNode.attributes[currentNode.attributes.length - 1];
            }

            // Append to attribute value
            if (lastAttribute[attribute] === null || lastAttribute[attribute] === undefined) {
                lastAttribute[attribute] = content;
            } else {
                lastAttribute[attribute] += content;
            }
        }

        if (resetBuffer) {
            this.buffer = '';
        }
    }

    private popStacks(resetBuffer: boolean) {
        this.nodeStack.pop();
        this.activePatternsStack.pop();
        if (resetBuffer) {
            this.buffer = '';
        }
    }

    isWhiteSpace(c: string): boolean {
        return /\s/.test(c);
    }

    parse(content: string): void {
        for (const c of content) {
            this.buffer += c;

            // we start by appending to our active patterns,
            // and seeing how we gonna close them.
            if (this.activePatternsStack.length > 0) {
                const currIdx = this.activePatternsStack[this.activePatternsStack.length - 1];
                const currentPattern = MARKDOWN_PATTERNS[currIdx];

                // we can add a check later, if we have a table or not,
                // cuz tables have their own special stuff

                // after changes and change, shit shit is currently deprecated.
                // it was used with the old flat parsedOutput strucutre,
                // but now we have children and root and all that shit
                // so...
                // TOOD: migrate this from parsedOutput flattened object to new nodes with children
                // and shit
                /*
                if(this.chainMode) {
                    // check for the end of the chain
                    const { match, complete } = new PartialRegexMatcher(currentPattern.chain!.end!)
                    .match(this.buffer);

                    // wooohp, we can potentially match the end,
                    // we should stop appending
                    if (match && !complete) {
                        // we add to the buffer, keep matching and matching till we get to the 
                        // either a compelete match,
                        // or it turns out to be a false alarm
                        continue;
                    }

                    if (complete) {
                        // we done fr fr 
                        this.buffer = '';
                        this.activePatternsStack.pop();
                    }

                    // the chain is always about appending to an
                    // attribute.
                    // so we get this chain's attribute, and we just append current
                    // content to it
                    const chainAttribute = currentPattern.chain?.attribute;

                    const lastOutput = this.parsedOutput[this.parsedOutput.length - 1];
                    const lastAttribute = lastOutput.attributes[lastOutput.attributes.length - 1];

                    if(lastAttribute[chainAttribute as string] === null) {
                        lastAttribute[chainAttribute as string] = this.buffer;

                    } else {
                        lastAttribute[chainAttribute as string] += this.buffer;
                    }

                    this.buffer = '';
                }*/


                // end is null
                if (currentPattern.end === null) {
                    // since we know that we've added the element anyways,
                    // we just pop from active patterns, and continue
                    // buffer is clear ofc, but we do it just in case
                    this.popStacks(true);
                    continue;
                }

                // check for end


                const { match, complete } = this.endMatchers[currIdx]!.match(this.buffer);

                // wooohp, we can potentially match the end,
                // we should stop appending
                if (match && !complete) {
                    // we add to the buffer, keep matching and matching till we get to the 
                    // either a compelete match,
                    // or it turns out to be a false alarm
                    continue;
                }

                if (complete) {
                    /*if(currentPattern.chain) {
                        this.chainMode = true;
                        this.buffer = '';
                        continue;

                    } else { 
                        this.popStacks(true);
                        continue;
                    }*/

                    this.popStacks(true);
                    continue;
                }

                const didStart = this.potentialStart();
                if (didStart) {
                    continue;
                }

                // @ts-ignore
                // for the attribute not being present
                // cuz we commented out the links and images.
                this.appendToCurrentNode(this.buffer, true, currentPattern.attribute);
                continue;
            }


            const didStart = this.potentialStart();
            if (!didStart || this.isWhiteSpace(this.buffer)) {
                this.appendToCurrentNode(this.buffer, true);
            }
        }
    }

    potentialStart(): boolean {
        // we try to start searching for an active pattern
        const { match, complete, patternIndex } = this.potentialMatch(this.buffer.trim());

        // if we got no match, just flush the buffer
        if (!match) {
            // this.flushBuffer();
            return false;
        }

        // else we check if it's compelete or no
        // if it is, then we mark it as an active section rn,
        // current active section is just the top of the stack

        if (complete && patternIndex !== undefined) {
            // append entry for it in the paresdOutput
            const { element, end } = MARKDOWN_PATTERNS[patternIndex];

            const newParent = {
                element,
                children: [!!end ? this.buffer[this.buffer.length - 1] : ""],
                attributes: []
            };

            this.appendToCurrentNode(newParent, true);
            this.nodeStack.push(newParent)

            // then activate the pattern
            this.activePatternsStack.push(patternIndex);

            return true;
        }

        return match;
    }

    potentialMatch(input: string): { match: boolean; complete: boolean; patternIndex?: number } {
        const matchers = this.matchers;

        for (let i = 0; i < matchers.length; i++) {
            const result = matchers[i].match(input);

            if (result.match) {
                return { ...result, patternIndex: i };
            }
        }

        return { match: false, complete: false };
    }

    clearAllStates(): void {
        this.buffer = '';
        this.activePatternsStack = [];
        this.parsedOutput = [];
        this.chainMode = false;

        // Reset root node and nodeStack to prevent content duplication
        this.root = { element: "root", children: [], attributes: [] };
        this.nodeStack = [this.root];
    }
}

/* 
* Supported Patterns definitions for markdown parsing
*/
const MARKDOWN_PATTERNS = [
    // Inline elements
    {
        start: /\*\*\*[^*\s]/,
        end: /\*\*\*/,
        element: 'em-strong'
    },
    {
        start: /\*\*[^*\s]/,
        end: /\*\*/,
        element: 'strong'
    },
    {
        start: /\*[^*\s]/,
        end: /\*/,
        element: 'em'
    },
    {
        start: /~~[^~\s]/,
        end: /~~/,
        element: 'del'
    },
    {
        start: /```[^\s]/,
        end: /```/,
        element: 'pre'
    },
    {
        start: /`[^`\s]/,
        end: /`/,
        element: 'code'
    },
    {
        start: /> /,
        end: "\n",
        element: 'blockquote'
    },

    // lists
    {
        start: /[-*] /,
        end: "\n",
        element: 'ul'
    },
    {
        start: /^\d+\. /, /* if it did not work cuz of the ^, then
     * then we have to fix claude's regex, not anything else.
     */
        end: "\n",
        element: 'ol'
    },

    // links and imgs ( chainables )
    /*{
      start: /!\[[^\[\s]/,
      end: '](',
      element: 'img',
      chain: {
        end: ')',
        attribute: 'src'
      },
      attribute: 'alt'
    },*/
    /*{
      start: /\[[^\[\s]/,
      end: '](',
      element: 'a',
      chain: {
        end: ')',
        attribute: 'href'
      }
    },*/

    // Headings
    {
        start: /# [^#\s]/,
        end: '\n',
        element: 'h1'
    },
    {
        start: /##\s[^#\s]/,
        end: /\n/,
        element: 'h2'
    },
    {
        start: /###\s[^#\s]/,
        end: /\n/,
        element: 'h3'
    },
    {
        start: /####\s[^#\s]/,
        end: /\n/,
        element: 'h4'
    },
    {
        start: /#####\s[^#\s]/,
        end: /\n/,
        element: 'h5'
    },
    {
        start: /######\s[^#\s]/,
        end: /\n/,
        element: 'h6'
    },

    // Block elements
    // NOTE: we might have to check before appending this if the last element
    // has a \n at its end or not.
    {
        start: /---/,
        end: null,
        element: 'hr'
    },
];