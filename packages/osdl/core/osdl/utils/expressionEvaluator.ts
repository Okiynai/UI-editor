import { Parser } from 'expr-eval';
import { getPath } from './nodeProcessor';

/**
 * A singleton instance of the Parser for performance.
 * We can configure it once with custom functions.
 */
const parser = new Parser({
    operators: {
        // Standard operators
        add: true,
        subtract: true,
        multiply: true,
        divide: true,
        remainder: true,
        // Logical operators
        logical: true,      // `&&`, `||`
        comparison: true,   // `===`, `!==`, `<`, `>`, etc.
        // 'in' operator for checking array/string inclusion
        'in': true, 
        // Ternary operator
        conditional: true       // `cond ? then : else`
  }
});

// --- Define our safe, custom functions ---
// These will be available inside every {{ ... }} expression.

parser.functions.get = (obj: any, path: string, defaultValue: any = undefined) => {
    return getPath(obj, path, defaultValue);
};

parser.functions.toFixed = (num: number, digits: number): string | number => {
    if (typeof num !== 'number') return num; // Return as-is if not a number
    return num.toFixed(digits);
};

parser.functions.round = (num: number, digits: number): string | number => {
    if (typeof num !== 'number') return num; // Return as-is if not a number
    return Math.round(num * Math.pow(10, digits)) / Math.pow(10, digits);
};

parser.functions.toUpperCase = (str: string): string => {
    return String(str).toUpperCase();
};

parser.functions.toLowerCase = (str: string): string => {
    return String(str).toLowerCase();
};

parser.functions.includes = (item: string | any[], value: any): boolean => {
    if (!item || typeof item.includes !== 'function') return false;
    return item.includes(value);
};

parser.functions.len = (item: string | any[]): number => {
    if (!item) return 0;
    return item.length;
}

/**
 * Tokenizes an expression to properly handle string literals
 * Returns tokens with type information to avoid processing strings
 */
function tokenizeExpression(expression: string): Array<{type: string, value: string}> {
    const tokens: Array<{type: string, value: string}> = [];
    let current = 0;

    const operators = [
        '===', '!==', '&&', '||', '>=', '<=', '==', '!=', '>', '<', '+'
    ];
    
    while (current < expression.length) {
        const char = expression[current];
        // Handle whitespace by simply skipping it.
        if (/\s/.test(char)) {
            current++;
            continue;
        }

        // Check for multi-character operators first.
        let foundOperator = false;
        for (const op of operators) {
            if (expression.startsWith(op, current)) {
                tokens.push({ type: 'operator', value: op });
                current += op.length;
                foundOperator = true;
                break;
            }
        }
        if (foundOperator) {
            continue;
        }
        
        // Handle string literals (single quotes)
        if (char === "'") {
            let value = "'";
            current++;
            while (current < expression.length && expression[current] !== "'") {
                if (expression[current] === '\\') {
                    value += expression[current] + (expression[current + 1] || '');
                    current += 2;
                } else {
                    value += expression[current];
                    current++;
                }
            }
            if (current < expression.length) {
                value += "'";
                current++;
            }
            tokens.push({type: 'string', value});
            continue;
        }
        
        // Handle string literals (double quotes)
        if (char === '"') {
            let value = '"';
            current++;
            while (current < expression.length && expression[current] !== '"') {
                if (expression[current] === '\\') {
                    value += expression[current] + (expression[current + 1] || '');
                    current += 2;
                } else {
                    value += expression[current];
                    current++;
                }
            }
            if (current < expression.length) {
                value += '"';
                current++;
            }
            tokens.push({type: 'string', value});
            continue;
        }
        
        // Handle complete paths including bracket notation
        if (/[a-zA-Z_$]/.test(char)) {
            let pathValue = '';
            
            while (current < expression.length) {
                const remainingStr = expression.substring(current);
                
                // Match an identifier part (e.g., "foo", "bar_baz")
                const identMatch = remainingStr.match(/^[a-zA-Z_$][\w$]*/);
                if (identMatch) {
                    pathValue += identMatch[0];
                    current += identMatch[0].length;
                    // After matching an identifier, check for a dot or literal bracket to continue the path
                    const nextChar = expression[current];
                    if (nextChar === '.' || nextChar === '[') {
                        continue;
                    }
                    break; // End of path if not followed by . or [
                }
                
                // Match a dot separator, but only if it's followed by another identifier
                const dotMatch = remainingStr.match(/^\.(?=[a-zA-Z_$])/);
                if (dotMatch) {
                    pathValue += '.';
                    current++;
                    continue;
                }
                
                // Match a LITERAL bracket accessor (e.g., "[0]", "['foo-bar']")
                const bracketMatch = remainingStr.match(/^\[(?:\d+|'[^']+'|"[^"]+")\]/);
                if (bracketMatch) {
                    pathValue += bracketMatch[0];
                    current += bracketMatch[0].length;
                    continue;
                }
                
                // If none of the above path-continuing patterns match, the path token is finished.
                break;
            }
            
            if (pathValue) {
                tokens.push({type: 'identifier', value: pathValue});
            }
            continue;
        }
        
        // Handle numbers
        if (/\d/.test(char)) {
            let value = '';
            while (current < expression.length && /[\d.]/.test(expression[current])) {
                value += expression[current];
                current++;
            }
            tokens.push({type: 'number', value});
            continue;
        }
        
        // Handle operators and other characters
        tokens.push({type: 'operator', value: char});
        current++;
    }
    
    return tokens;
}


function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Evaluates a single expression string against a given context.
 *
 * @param expression The expression to evaluate (the part inside {{...}}).
 * @param context The data context (e.g., finalTemplatingContext).
 * @returns The result of the evaluation.
 */
function evaluate(expression: string, context: any): any {
    try {
        console.log(`[Expression Engine] Evaluating: "${expression}"`);
    
    const compatibleExpression = expression
        .replace(/\[\s*'([^']+)'\s*\]/g, '["$1"]')
        .replace(/&&/g, ' and ')
        .replace(/\|\|/g, ' or ');
  
        // const compatibleExpression = expression.replace(/\[\s*'([^']+)'\s*\]/g, '["$1"]');
        
        // Tokenize the expression to avoid string literals
        const tokens = tokenizeExpression(compatibleExpression);
        const potentialPaths: string[] = [];
        
        tokens.forEach((token, index) => {
            if (token.type === 'identifier') {
                // Only process identifier tokens, not string literals
                // const pathMatch = token.value.match(/^[a-zA-Z_$][\w$]*(?:\.[\w$]+|\[(?:'[^']+'|"[^"]+"|\d+)\])*$/);
                // if (pathMatch) {
                //     potentialPaths.push(token.value);
                // }
                // Only process identifier tokens that look like actual data paths
                // Accept paths with dots, brackets, and array indexing
                // const pathMatch = token.value.match(/^[a-zA-Z_$][\w$]*(?:(?:\.|)\[(?:\d+|'[^']+'|"[^"]+")\]|\.[\w$]+)*$/);
                // if (pathMatch && !token.value.includes('toFixed')) { // Don't treat function calls as paths
                //     potentialPaths.push(token.value);
                // }
                const prevToken = index > 0 ? tokens[index - 1] : null;

                // A token is a potential path ONLY if it's not a property access on a dynamic expression.
                // We identify this by checking if the preceding token is a dot.
                // Your tokenizer correctly creates full paths (e.g., 'states.person.name') as a single token,
                // but splits on dynamic access (e.g., '...]', '.', 'name'). This logic handles that split.
                if (!prevToken || prevToken.value !== '.') {
                    const pathMatch = token.value.match(/^[a-zA-Z_$][\w$]*(?:(?:\.|)\[(?:\d+|'[^']+'|"[^"]+")\]|\.[\w$]+)*$/);
                    if (pathMatch && !token.value.includes('toFixed')) { // Don't treat function calls as paths
                        potentialPaths.push(token.value);
                    }
                }
            }
        });
        
        // Filter out JavaScript keywords, literals, and function names
        const jsKeywords = new Set([
            'true', 'false', 'null', 'undefined', 'in', 'of', 'if', 'else', 'for', 'while', 
            'function', 'return', 'var', 'let', 'const', 'this', 'new', 'typeof', 'instanceof',
            'and', 'or', 'not' // Also ignore the library's keywords     
        ]);
        
        // Also filter out our custom function names
        const customFunctions = new Set([
            'get', 'toFixed', 'toUpperCase', 'toLowerCase', 'includes', 'len'
        ]);

        const uniquePaths = potentialPaths.filter(path => {
            // Skip if it's a keyword or function name
            if (jsKeywords.has(path) || customFunctions.has(path)) return false;
            
            // Skip if it's a simple number
            if (/^\d+$/.test(path)) return false;
            
            return true;
        }).sort((a, b) => b.length - a.length);

        const evaluationContext: Record<string, any> = {};
        let simplifiedExpression = compatibleExpression;

        console.log(`[Expression Engine] Found paths to resolve:`, uniquePaths);

        // Pass 1: Resolve all paths and build the context for the evaluator.
        uniquePaths.forEach(path => {
            // Create a clean, safe variable name from the path.
            const varName = `__${path.replace(/[^a-zA-Z0-9_$]/g, '_')}__`;
            
            // Add the real, resolved value to our evaluation context.
            const resolvedValue = getPath(context, path);
            // We must convert 'undefined' (meaning the path doesn't exist) to 'null',
            // which the library correctly handles as a falsy value in ternary expressions.
            evaluationContext[varName] = resolvedValue === undefined ? null : resolvedValue;
            
            console.log(`[Expression Engine] Resolving path "${path}" to variable "${varName}":`, resolvedValue);
            
            // // Don't replace the path at all if it contains brackets
            // // Instead, add the resolved value directly with the original path as key
            // if (path.includes('[') && path.includes(']')) {
            //     // For array/bracket notation, use the original path as the variable name in a safe way
            //     const safeVarName = `__path_${Object.keys(evaluationContext).length}__`;
            //     evaluationContext[safeVarName] = resolvedValue;
                
            //     // Replace the exact path with the safe variable name
            //     simplifiedExpression = simplifiedExpression.replace(new RegExp(escapeRegExp(path), 'g'), safeVarName);
            // } else {
            //     // For simple dot notation
            //     simplifiedExpression = simplifiedExpression.split(path).join(varName);
            // }
            // Consistently use the descriptive variable name ('varName') for all replacements.
            // This regex-based replacement is robust and works for both dot and bracket notation,
            // resolving the substring replacement issue in complex expressions.
            simplifiedExpression = simplifiedExpression.replace(new RegExp(escapeRegExp(path), 'g'), varName);
        });

        console.log(`function evaluate(expression: string, context: any): any {
[Expression Engine] Simplified expression:`, simplifiedExpression);
        console.log(`[Expression Engine] Evaluation context:`, evaluationContext);

        // Pass 2: Parse the simplified expression and evaluate it with the context we built.
        // Include our custom functions in the evaluation context
        const fullContext = {
            ...evaluationContext,
            // Make custom functions available directly in expressions
            toFixed: parser.functions.toFixed,
            toUpperCase: parser.functions.toUpperCase,
            toLowerCase: parser.functions.toLowerCase,
            includes: parser.functions.includes,
            len: parser.functions.len,
            get: parser.functions.get
        };
        
        const result = parser.parse(simplifiedExpression).evaluate(fullContext);
        console.log(`[Expression Engine] SUCCESS for "${expression}"`, { result });
        return result;
    } catch (error) {
        // Provide more detailed error logging.
        console.warn(`[Expression Engine] Failed to evaluate expression: "{{${expression}}}"\nError:`, error);
        console.log(`[Expression Engine] Context keys available during failure:`, Object.keys(context));
        return '';
    }
}

/**
 * The main function to resolve data bindings in a string.
 * It handles both single, direct bindings and complex interpolated strings.
 *
 * @param templateString The string containing one or more {{...}} bindings.
 * @param context The data context to resolve against.
 * @returns The resolved value. Can be any type (string, boolean, number, etc.).
 */
export function evaluateTemplate(templateString: string, context: any): any {
    if (typeof templateString !== 'string') {
        return templateString; // Not a string, nothing to evaluate.
    }

    // Regex to match a SINGLE, standalone binding (e.g., "{{ user.isAdmin }}")
    // This is crucial for returning native types like booleans and numbers.
    const singleBindingRegex = /^{{\s*(.*?)\s*}}$/;
    const singleMatch = templateString.match(singleBindingRegex);

    if (singleMatch) {
        const expression = singleMatch[1];
        return evaluate(expression, context);
    }

    // --- If it's not a single binding, it's an interpolated string ---
    // e.g., "Welcome, {{ user.name }}! You have {{ user.messages.length }} messages."

    const allBindingsRegex = /{{\s*(.*?)\s*}}/g;

    return templateString.replace(allBindingsRegex, (match, expression) => {
        const value = evaluate(expression, context);

        // Handle different value types for safe string interpolation
        if (value === null || value === undefined) {
            return '';
        }
        if (typeof value === 'object') {
            return JSON.stringify(value, null, 2); // Pretty-print objects if they appear
        }
        return String(value);
    });
}