// AST Node Types
class RegexNode {
    public type: string;

    constructor(type: string) {
        this.type = type;
    }
}

class CharNode extends RegexNode {
    public char: string;

    constructor(char: string) {
        super('CHAR');
        this.char = char;
    }
}

class CharClassNode extends RegexNode {
    public chars: Set<string>;
    public negated: boolean;

    constructor(chars: Set<string>, negated: boolean = false) {
        super('CHAR_CLASS');
        this.chars = chars;
        this.negated = negated;
    }
}

class ConcatNode extends RegexNode {
    public children: RegexNode[];

    constructor(children: RegexNode[]) {
        super('CONCAT');
        this.children = children;
    }
}

// Add a new node type for dot
class DotNode extends RegexNode {
    constructor() {
        super('DOT');
    }
}

class StarNode extends RegexNode {
    public child: RegexNode;

    constructor(child: RegexNode) {
        super('STAR');
        this.child = child;
    }
}

class PlusNode extends RegexNode {
    public child: RegexNode;

    constructor(child: RegexNode) {
        super('PLUS');
        this.child = child;
    }
}

class OrNode extends RegexNode {
    public left: RegexNode;
    public right: RegexNode;

    constructor(left: RegexNode, right: RegexNode) {
        super('OR');
        this.left = left;
        this.right = right;
    }
}

class RegexParser {
    private pattern: string;
    private pos: number;

    constructor(pattern: string) {
        this.pattern = pattern;
        this.pos = 0;
    }

    parse(): RegexNode {
        return this.parseOr();
    }

    parseOr(): RegexNode {
        let left: RegexNode = this.parseConcat();

        while (this.pos < this.pattern.length && this.pattern[this.pos] === '|') {
            this.pos++; // consume '|'
            let right: RegexNode = this.parseConcat();
            left = new OrNode(left, right);
        }

        return left;
    }

    parseConcat(): RegexNode {
        const nodes: RegexNode[] = [];

        while (this.pos < this.pattern.length && this.pattern[this.pos] !== '|' && this.pattern[this.pos] !== ')') {
            const node = this.parsePostfix();
            if (node) {
                nodes.push(node);
            }
        }

        if (nodes.length === 0) return new CharNode(''); // Return empty char node as fallback
        if (nodes.length === 1) return nodes[0];
        return new ConcatNode(nodes);
    }

    parsePostfix(): RegexNode {
        let node: RegexNode = this.parseAtom();

        while (this.pos < this.pattern.length) {
            const char = this.pattern[this.pos];
            if (char === '*') {
                this.pos++;
                node = new StarNode(node);
            } else if (char === '+') {
                this.pos++;
                node = new PlusNode(node);
            } else {
                break;
            }
        }

        return node;
    }

    parseAtom(): RegexNode {
        if (this.pos >= this.pattern.length) {
            throw new Error('Unexpected end of pattern');
        }

        const char = this.pattern[this.pos];


        // In parseAtom:
        if (char === '.') {
            this.pos++;
            return new DotNode();
        }

        if (char === '\\') {
            this.pos++;
            if (this.pos >= this.pattern.length) {
                throw new Error('Unexpected end after backslash');
            }
            const escapedChar = this.pattern[this.pos];
            this.pos++;
            // Handle escape sequences properly
            switch (escapedChar) {
                case 'n':
                    return new CharNode('\n');
                case 't':
                    return new CharNode('\t');
                case 'r':
                    return new CharNode('\r');
                case 's':
                    // Whitespace character class
                    const wsChars = new Set<string>([' ', '\t', '\n', '\r']);
                    return new CharClassNode(wsChars, false);
                case 'd':
                    // Digit character class
                    const digitChars = new Set<string>();
                    for (let i = 0; i <= 9; i++) {
                        digitChars.add(i.toString());
                    }
                    return new CharClassNode(digitChars, false);
                case 'w':
                    // Word characters
                    const wordChars = new Set<string>();
                    for (let c = 'a'.charCodeAt(0); c <= 'z'.charCodeAt(0); c++) {
                        wordChars.add(String.fromCharCode(c));
                    }
                    for (let c = 'A'.charCodeAt(0); c <= 'Z'.charCodeAt(0); c++) {
                        wordChars.add(String.fromCharCode(c));
                    }
                    for (let i = 0; i <= 9; i++) {
                        wordChars.add(i.toString());
                    }
                    wordChars.add('_');
                    return new CharClassNode(wordChars, false);
                case '.':
                    // Literal dot
                    return new CharNode('.');
                default:
                    // For any other escaped character, return the literal character
                    return new CharNode(escapedChar);
            }
        }

        if (char === '[') {
            return this.parseCharClass();
        }

        if (char === '(') {
            this.pos++; // consume '('
            const node: RegexNode = this.parseOr();
            if (this.pos >= this.pattern.length || this.pattern[this.pos] !== ')') {
                throw new Error('Expected closing parenthesis');
            }
            this.pos++; // consume ')'


            return node;
        }

        // Handle other metacharacters that shouldn't be treated as literals
        if (char === '*' || char === '+' || char === '?' || char === '|' || char === ')') {
            throw new Error(`Unexpected metacharacter '${char}'`);
        }

        this.pos++;
        return new CharNode(char);
    }

    parseCharClass(): CharClassNode {
        this.pos++; // consume '['
        let negated = false;

        if (this.pos < this.pattern.length && this.pattern[this.pos] === '^') {
            negated = true;
            this.pos++;
        }

        const chars = new Set<string>();

        while (this.pos < this.pattern.length && this.pattern[this.pos] !== ']') {
            if (this.pattern[this.pos] === '\\') {
                this.pos++;
                if (this.pos < this.pattern.length) {
                    if (this.pattern[this.pos] === 's') {
                        // Add whitespace characters
                        chars.add(' ');
                        chars.add('\t');
                        chars.add('\n');
                        chars.add('\r');
                    } else {
                        chars.add(this.pattern[this.pos]);
                    }
                    this.pos++;
                }
            } else {
                chars.add(this.pattern[this.pos]);
                this.pos++;
            }
        }

        if (this.pos >= this.pattern.length) {
            throw new Error('Unclosed character class');
        }

        this.pos++; // consume ']'
        return new CharClassNode(chars, negated);
    }
}

// NFA State
class NFAState {
    public id: number;
    public transitions: Map<string, Set<NFAState>>;
    public epsilonTransitions: Set<NFAState>;
    public isAccepting: boolean;
    public negatedChars?: Set<string>; // For negated character classes

    constructor(id: number) {
        this.id = id;
        this.transitions = new Map(); // char -> Set of states
        this.epsilonTransitions = new Set();
        this.isAccepting = false;
    }

    addTransition(char: string, state: NFAState): void {
        if (!this.transitions.has(char)) {
            this.transitions.set(char, new Set());
        }
        this.transitions.get(char)!.add(state);
    }

    addEpsilonTransition(state: NFAState): void {
        this.epsilonTransitions.add(state);
    }
}

// NFA Builder
class NFABuilder {
    private stateCounter: number;

    constructor() {
        this.stateCounter = 0;
    }

    createState(): NFAState {
        return new NFAState(this.stateCounter++);
    }

    buildFromAST(ast: RegexNode): { start: NFAState; states: number } {
        const start = this.createState();
        const end = this.createState();
        end.isAccepting = true;

        this.build(ast, start, end);

        return { start, states: this.stateCounter };
    }

    build(node: RegexNode, start: NFAState, end: NFAState): void {
        switch (node.type) {
            case 'CHAR':
                start.addTransition((node as CharNode).char, end);
                break;

            case 'CHAR_CLASS':
                const charClassNode = node as CharClassNode;
                if (charClassNode.negated) {
                    // For negated char class, we need to handle all chars except the ones in the set
                    // For simplicity, we'll check this during matching
                    start.addTransition('__NEGATED_CLASS__', end);
                    start.negatedChars = charClassNode.chars;
                } else {
                    for (const char of charClassNode.chars) {
                        start.addTransition(char, end);
                    }
                }
                break;

            case 'CONCAT':
                const concatNode = node as ConcatNode;
                let current = start;
                for (let i = 0; i < concatNode.children.length; i++) {
                    if (i === concatNode.children.length - 1) {
                        this.build(concatNode.children[i], current, end);
                    } else {
                        const next = this.createState();
                        this.build(concatNode.children[i], current, next);
                        current = next;
                    }
                }
                break;

            // In NFABuilder.build:
            case 'DOT':
                // Add a special transition for dot
                start.addTransition('__DOT__', end);
                break;

            case 'STAR':
                const starNode = node as StarNode;
                const starStart = this.createState();
                const starEnd = this.createState();

                start.addEpsilonTransition(starStart);
                starStart.addEpsilonTransition(starEnd);
                starEnd.addEpsilonTransition(end);

                this.build(starNode.child, starStart, starEnd);
                starEnd.addEpsilonTransition(starStart);

                start.addEpsilonTransition(end); // Allow zero occurrences
                break;

            case 'PLUS':
                const plusNode = node as PlusNode;
                const plusMid = this.createState();
                this.build(plusNode.child, start, plusMid);

                // For one or more, add epsilon back to start
                plusMid.addEpsilonTransition(start);
                plusMid.addEpsilonTransition(end);
                break;

            case 'OR':
                const orNode = node as OrNode;
                const leftStart = this.createState();
                const leftEnd = this.createState();
                const rightStart = this.createState();
                const rightEnd = this.createState();

                start.addEpsilonTransition(leftStart);
                start.addEpsilonTransition(rightStart);

                this.build(orNode.left, leftStart, leftEnd);
                this.build(orNode.right, rightStart, rightEnd);

                leftEnd.addEpsilonTransition(end);
                rightEnd.addEpsilonTransition(end);
                break;
        }
    }
}

// NFA Simulator
class NFASimulator {
    private nfa: { start: NFAState; states: number };

    constructor(nfa: { start: NFAState; states: number }) {
        this.nfa = nfa;
    }

    epsilonClosure(states: Set<NFAState>): Set<NFAState> {
        const closure = new Set<NFAState>(states);
        const stack: NFAState[] = [...states];

        while (stack.length > 0) {
            const state = stack.pop()!;
            for (const epsilonState of state.epsilonTransitions) {
                if (!closure.has(epsilonState)) {
                    closure.add(epsilonState);
                    stack.push(epsilonState);
                }
            }
        }

        return closure;
    }

    move(states: Set<NFAState>, char: string): Set<NFAState> {
        const nextStates = new Set<NFAState>();

        for (const state of states) {
            // Handle regular transitions
            if (state.transitions.has(char)) {
                for (const nextState of state.transitions.get(char)!) {
                    nextStates.add(nextState);
                }
            }

            // Handle dot transitions (matches any char except newline)
            if (state.transitions.has('__DOT__') && char !== '\n') {
                for (const nextState of state.transitions.get('__DOT__')!) {
                    nextStates.add(nextState);
                }
            }

            // Handle negated character class
            if (state.transitions.has('__NEGATED_CLASS__') && state.negatedChars) {
                if (!state.negatedChars.has(char)) {
                    for (const nextState of state.transitions.get('__NEGATED_CLASS__')!) {
                        nextStates.add(nextState);
                    }
                }
            }
        }

        return nextStates;
    }

    canMatch(input: string): { match: boolean; complete: boolean } {
        let currentStates = this.epsilonClosure(new Set([this.nfa.start]));

        // Process each character
        for (const char of input) {
            const nextStates = this.move(currentStates, char);
            currentStates = this.epsilonClosure(nextStates);

            if (currentStates.size === 0) {
                return { match: false, complete: false };
            }
        }

        // Check if any current state is accepting
        const isComplete = Array.from(currentStates).some((state: NFAState) => state.isAccepting);

        // For partial matching: we have a match if:
        // 1. We're already complete, OR
        // 2. We're in a valid state (currentStates.size > 0) and haven't failed yet
        const canMatch = currentStates.size > 0;

        return {
            match: canMatch,
            complete: isComplete
        };
    }

    canReachAcceptingState(states: Set<NFAState>): boolean {
        // BFS to check if we can reach an accepting state
        const visited = new Set<NFAState>();
        const queue: NFAState[] = [...states];

        while (queue.length > 0) {
            const state = queue.shift()!;

            if (visited.has(state)) continue;
            visited.add(state);

            if (state.isAccepting) return true;

            // Add epsilon transitions
            for (const epsilonState of state.epsilonTransitions) {
                if (!visited.has(epsilonState)) {
                    queue.push(epsilonState);
                }
            }

            // Don't just return true for any state with transitions!
            // We need to actually check if we can reach an accepting state
            // by following the transitions
            for (const [char, nextStates] of state.transitions) {
                for (const nextState of nextStates) {
                    if (!visited.has(nextState)) {
                        queue.push(nextState);
                    }
                }
            }
        }

        return false;
    }
}

// Main Partial Regex Matcher
export class PartialRegexMatcher {
    private nfa: { start: NFAState; states: number };
    private simulator: NFASimulator;

    constructor(pattern: string | RegExp) {
        // Remove leading/trailing slashes if present
        if (typeof pattern === 'string') {
            if (pattern.startsWith('/') && pattern.endsWith('/')) {
                pattern = pattern.slice(1, -1);
            }
        } else if (pattern instanceof RegExp) {
            pattern = pattern.source.replace(/\\\\/g, "\\");
        } else {
            throw Error("Pattern format not supported: Either String or regex expression");
        }

        const parser = new RegexParser(pattern);
        const ast = parser.parse();

        const builder = new NFABuilder();
        this.nfa = builder.buildFromAST(ast);

        this.simulator = new NFASimulator(this.nfa);
    }

    match(input: string): { match: boolean; complete: boolean } {
        return this.simulator.canMatch(input);
    }
}