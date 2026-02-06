type JSONStreamParserState =
  | 'INIT' // { or [
  | 'SECTION_NAME_START'
  | 'CAPTURE_SECTION_NAME'
  | 'SECTION_CONTENT_START'
  | 'CAPTURE_SECTION_CONTENT'
  | 'SECTION_END' // depends on the section type
  | 'ARRAY_ROOT' // Handling array at root level
  | 'ARRAY_ROOT_END' // After array root is complete
  | 'WAIT_FOR_STRING_JSON_END';

const JSON_TRANSITION_WHITESPACE_CHARS = [' ', '\n', '\t', '\r'];

// Regex to match valid JSON value starts with capture groups
const JSON_VALUE_START_REGEX = /^(")|(-)|([0-9])|(\{)|(\[)|(t)|(f)|(n)/;

// Map to determine section type based on the matched group
const JSON_VALUE_TYPE_MAP: Record<number, string> = {
  1: 'string',    // " (string start)
  2: 'number',    // - (negative number)
  3: 'number',    // 0-9 (number)
  4: 'object',    // { (object start)
  5: 'array',     // [ (array start)
  6: 'boolean',   // t (true)
  7: 'boolean',   // f (false)
  8: 'null'       // n (null)
} as const;

const harmonicaRe = /["\s]*\[?\s*\{\s*\\\"/;

export class JSONStreamParser {
  private allowedSections: readonly string[] | null;

  private skipNonValidSections: boolean = false;



  private state: JSONStreamParserState = 'INIT';

  private buffer: string = '';

  private currentSectionType: string = '';

  private token: string = '';

  // Stack to track nested objects/arrays
  private nestingStack: string[] = [];

  private completedSections: {
    sectionName: string;
    sectionContent: string;
    sectionContentType?: string;
  }[] = [];

  private isRootArray: boolean = false;

  constructor(allowedSections: readonly string[] | null, skipNonValidSections: boolean = false) {
    this.allowedSections = allowedSections;
    this.skipNonValidSections = skipNonValidSections;
  }


  private harmonica(str: string): string {
    return str.replace(/\\"/g, '"').replace(/"\s*(\[|\{)/g, '$1');
  }





  processToken(token: string) {
    this.token = token;
    for (const char of token) {
      // Handle array root end state
      if (this.state === 'ARRAY_ROOT_END') {
        if (JSON_TRANSITION_WHITESPACE_CHARS.includes(char)) {
          continue; // Skip whitespace after root array
        }

        // If we encounter a new object or array, transition back to INIT
        if (char === '{' || char === '[') {
          this.state = 'INIT';
          this.isRootArray = false; // Reset root array flag
          this.JSONModeParser(char);
          continue;
        }

        this.handleJSONMalformed(this.state, char);

        continue;
      }

      if (this.state == "WAIT_FOR_STRING_JSON_END") {
        this.state = 'INIT';
        if (char == '"') { // this is an extra " coming from the fucking json as a string fucking thing
          continue; // we just consume it and move on
        }
      }


      // we found the end of the sections that have a defined end
      // and now we have to check if we gonna have a section state or an INIT state
      if (this.state === 'SECTION_END') {
        if (char == '}') {
          this.state = 'WAIT_FOR_STRING_JSON_END';
          continue;
        }
        if (char == ',') {
          this.state = 'SECTION_NAME_START';
          continue;
        }
        if (char == '\"') { // this is
          this.state = 'SECTION_NAME_START';
          this.JSONModeParser(char);
          continue;
        }
        // Skip whitespace characters in SECTION_END state
        if (!JSON_TRANSITION_WHITESPACE_CHARS.includes(char)) {
          this.handleJSONMalformed(this.state, char);
        }
      }
      this.JSONModeParser(char);
    }
  }
  JSONModeParser(c: string) {
    switch (this.state) {
      case 'INIT':
        if (c === '{') {
          this.state = 'SECTION_NAME_START';
          return true;
        } else if (c === '[') {
          // Start of an array at root
          this.state = 'ARRAY_ROOT';
          this.isRootArray = true;
          // Initialize the nesting stack for the root array
          this.nestingStack = [']']; // We expect a closing ']'
          // Create a special section for the root array
          this.completedSections.push({
            sectionName: 'root',
            sectionContent: '[',
            sectionContentType: 'array'
          });
          return true;
        } else {
          return false;
        }
      case 'ARRAY_ROOT':
        return this.handleArrayRoot(c);
      case 'SECTION_NAME_START':
        if (c === '"') {
          this.state = 'CAPTURE_SECTION_NAME';
          return true;
        }
        // so the current char can be a ' ', or \n or whatever,
        // but we should have an allowed list here, if we went out of it, 
        // then we have a malformed json object.
        if (!JSON_TRANSITION_WHITESPACE_CHARS.includes(c)) {
          this.handleJSONMalformed(this.state, c);
          return false;
        }

      // we capture the : here just to not make a whole new step for it.
      // cuz it's useless
      case 'CAPTURE_SECTION_NAME':
        // we use endsWith here for extra safety, it's not that importnat since we 
        // gonna have only " in the buffer
        if (this.buffer.endsWith('"')) {
          // so now we start handling the : logic
          if (c === ':') {
            // now make sure to reset the buffer, cuz this shit is gonna hold 
            // some shit for the cotnent to not get fucked.
            this.buffer = '';
            this.state = 'SECTION_CONTENT_START';
            return true;
          }
          if (!JSON_TRANSITION_WHITESPACE_CHARS.includes(c)) {
            this.handleJSONMalformed(this.state, c);
            return false;
          }

          return false; // Continue waiting for the colon
        }
        // to skip the closing '"'
        if (c != '"') {
          this.buffer += c;
          return false; // Important: return here to prevent fall-through
        } else {
          // means we finally hit the end of the section name.
          if (!this.isValidSection(this.buffer.trim())) {
            this.handleJSONMalformed(this.state, this.buffer);
            return false;
          }
          this.completedSections.push({
            sectionName: this.buffer.trim(),
            sectionContent: ''
          });
          // override the buffer, instead of setting to '' then adding this char
          // we just override it to have the char.
          this.buffer = c;
        }
        return false;
      case 'SECTION_CONTENT_START':
        // so the current char can be a ' ', or \n or whatever,
        // but we should have an allowed list here, if we went out of it, 
        // then we have a malformed json object.
        this.buffer += c;
        // make sure to trim the buffer as it might get the \n or \t or whatever
        // along the way
        const match = this.buffer.trim().match(JSON_VALUE_START_REGEX);
        if (match) {
          // Find which capture group matched (groups 1-8)
          const groupIndex = match.findIndex((group, index) => index > 0 && group !== undefined);

          const type = JSON_VALUE_TYPE_MAP[groupIndex];
          this.currentSectionType = type;
          this.buffer = '';
          // Initialize nesting stack for objects and arrays
          if (type === 'object') {
            this.nestingStack = ['}'];
            this.appendToCurrentSectionContent('{');
          } else if (type === 'array') {
            this.nestingStack = [']'];
            this.appendToCurrentSectionContent('[');
          } else if (type != 'string') {
            // For primitive values, other than strings,
            // add the first character to the section content
            // as types: null, true, and false do not have a start yk.
            // unlike strings ( " ), objects/arrays ( {/[ )
            this.appendToCurrentSectionContent(match[0]);
          }

          // now that we have the seciton's content type, we 
          // attach it to the section
          if (this.completedSections.length > 0) {
            this.completedSections[this.completedSections.length - 1].sectionContentType = type;
          }
          this.state = 'CAPTURE_SECTION_CONTENT';
          return true;
        }
        if (!JSON_TRANSITION_WHITESPACE_CHARS.includes(c)) {
          this.handleJSONMalformed(this.state, c);
          return false;
        }
        return false;
      case 'CAPTURE_SECTION_CONTENT':
        // if we already had escape character
        // we see how we gonna deal with it.
        if (this.buffer == '\\') {
          // preserve the escape sequence as-is (e.g., \" stays \" and \n stays \n)
          this.buffer = '';
          this.appendToCurrentSectionContent('\\' + c);
          return;
        }
        // CAPTURE ESCAPE CHARACTER!!
        if (c == '\\') {
          this.buffer += c;
          return;
        }
        // Handle nested structures for objects and arrays
        if (this.currentSectionType === 'object' || this.currentSectionType === 'array') {
          return this.handleNestedBrackets(c);
        }
        // Handle string content with proper escape handling
        if (this.currentSectionType === 'string') {
          if (c === '"') {
            this.state = 'SECTION_END';
            return true;
          }
          this.appendToCurrentSectionContent(c);
          return;
        }
        // for numbers, booleans, and null, we just need a comma to end the section
        if (c === ',') {
          this.state = 'SECTION_END';
          return true;
        }
        // or closing bracket if we are at the end of the whole object.
        if (c === '}') {
          this.state = 'WAIT_FOR_STRING_JSON_END';
          return true;
        }
        // For primitive values (not string, object, or array), only add non-whitespace characters
        if (this.currentSectionType !== 'string' &&
          this.currentSectionType !== 'object' &&
          this.currentSectionType !== 'array' &&
          !JSON_TRANSITION_WHITESPACE_CHARS.includes(c)) {
          this.appendToCurrentSectionContent(c);
        } else if (this.currentSectionType === 'string') {
          // Strings can include whitespace
          this.appendToCurrentSectionContent(c);
        }
        return false;
      case 'ARRAY_ROOT_END':
        if (JSON_TRANSITION_WHITESPACE_CHARS.includes(c)) {
          return true;
        }
        this.handleJSONMalformed(this.state, c);
        return false;
    }
  }

  private handleArrayRoot(c: string): boolean {
    // Track opening brackets
    if (c === '[') {
      this.nestingStack.push(']');
    } else if (c === '{') {
      this.nestingStack.push('}');
    }
    // Track closing brackets
    else if (c === '}' || c === ']') {
      if (this.nestingStack.length > 0 && this.nestingStack[this.nestingStack.length - 1] === c) {
        this.nestingStack.pop();
      }

      // If stack is empty and we hit the matching closing bracket for the root array
      if (c === ']' && this.nestingStack.length === 0) {
        this.appendToCurrentSectionContent(c);
        this.state = 'ARRAY_ROOT_END';
        return true;
      }
    }

    this.appendToCurrentSectionContent(c);
    return false;
  }

  appendToCurrentSectionContent(c: string) {
    if (this.completedSections.length > 0) {
      this.completedSections[this.completedSections.length - 1].sectionContent += c;
    }
  }
  private handleNestedBrackets(c: string): boolean {
    // Track opening brackets
    if (c === '{') {
      this.nestingStack.push('}');
    } else if (c === '[') {
      this.nestingStack.push(']');
    }
    // Track closing brackets
    else if (c === '}' || c === ']') {
      if (this.nestingStack.length > 0 && this.nestingStack[this.nestingStack.length - 1] === c) {
        this.nestingStack.pop();
      }

      // If stack is empty and we hit the matching closing bracket, we're done
      if (this.nestingStack.length === 0 &&
        ((this.currentSectionType === 'object' && c === '}') ||
          (this.currentSectionType === 'array' && c === ']'))) {
        this.appendToCurrentSectionContent(c);
        this.state = 'WAIT_FOR_STRING_JSON_END';
        return true;
      }
    }

    this.appendToCurrentSectionContent(c);
    return false;
  }
  isValidSection(section: string): boolean {
    if (this.skipNonValidSections) return true;
    if (this.allowedSections === null) return true;
    return this.allowedSections.includes(section);
  }
  // this function is mainly used 
  handleJSONMalformed(state: JSONStreamParserState, c: string) {
    const runtimeDetails = {
      state: state,
      currentChar: c,
      charCode: c.charCodeAt(0),
      buffer: this.buffer,
      currentSectionType: this.currentSectionType,
      completedSectionsCount: this.completedSections,
      token: this.token,
    };
    // Generate specific error messages based on the state where the error occurred
    let message = '';
    switch (state) {
      case 'INIT':
        message = `Expected JSON object to start with '{' or '[' but received '${c}'. The stream should begin with a valid JSON object or array.`;
        break;
      case 'SECTION_NAME_START':
        message = `Expected section name to start with '"' but received '${c}'. Valid section names must be quoted strings like "response" or "action_json".`;
        break;
      case 'CAPTURE_SECTION_NAME':
        if (this.buffer.endsWith('"')) {
          message = `Expected ':' after section name "${this.buffer.slice(0, -1)}" but received '${c}'. JSON format requires "section_name": value pairs.`;
        } else {
          const sectionsList = this.allowedSections ? this.allowedSections.join(', ') : 'any section';
          message = `Invalid character '${c}' in section name "${this.buffer}". Section names must contain only valid characters and match one of: ${sectionsList}.`;
        }
        break;
      case 'SECTION_CONTENT_START':
        message = `Expected valid JSON value to start section content but received '${c}'. Valid JSON values start with: " (string), { (object), [ (array), t/f (boolean), n (null), or digits/- (number). Current buffer: "${this.buffer.trim()}".`;
        break;
      case 'CAPTURE_SECTION_CONTENT':
        if (this.currentSectionType === 'string') {
          message = `Unexpected character '${c}' while parsing string content. String values must be properly escaped and terminated with a closing quote.`;
        } else if (this.currentSectionType === 'object' || this.currentSectionType === 'array') {
          message = `Invalid character '${c}' in ${this.currentSectionType} content. Nested structures must have properly matched brackets. Current nesting depth: ${this.nestingStack.length}.`;
        } else {
          message = `Invalid character '${c}' in ${this.currentSectionType || 'unknown'} value. Expected comma ',' to end section or '}' to end JSON object.`;
        }
        break;
      case 'SECTION_END':
        message = `Expected ',' to continue to next section or '}' to end JSON object but received '${c}'. Each section must be properly separated or the object must be properly closed.`;
        break;
      case 'ARRAY_ROOT':
        message = `Invalid character '${c}' in root array content. Arrays must have properly matched brackets. Current nesting depth: ${this.nestingStack.length}.`;
        break;
      case 'ARRAY_ROOT_END':
        message = `Unexpected character '${c}' after root array. Expected end of input.`;
        break;
      default:
        message = `Unexpected parsing state '${state}' with character '${c}'. This indicates a parser logic error.`;
    }
    // console.error(`JSON Malformed Error: ${message}`, runtimeDetails);
  }
  resetAll() {
    this.state = 'INIT';
    this.buffer = '';
    this.currentSectionType = '';
    this.nestingStack = [];
    this.completedSections = [];
    this.isRootArray = false;
  }

  getCompletedSections() {
    // Return an array of all parsed elements
    const results: any[] = [];

    this.completedSections.forEach(section => {
      const { sectionName, sectionContent, sectionContentType } = section;

      // Special handling for root array sections
      if (sectionName === 'root' && sectionContentType === 'array') {
        // Parse the array and add each element to results
        const arrayElements = this.parseArrayContent(sectionContent);
        results.push(arrayElements); // Push the entire array, not spread it
      } else if (this.allowedSections === null || this.allowedSections.includes(sectionName)) {
        // Create an object with the section name as key
        const result: Record<string, any> = {};

        // Handle array content
        if (sectionContentType === 'array') {
          result[sectionName] = this.parseArrayContent(sectionContent);
        }
        // Handle object content
       // Handle object content
else if (sectionContentType === 'object') {
  // Create a new parser instance for nested content
  const nestedParser = new JSONStreamParser(
    null, // Skip validation for nested content
    true // Always skip validation for nested content
  );

  // Process the nested content
  nestedParser.processToken(sectionContent);

  // Get the parsed nested content
  const nestedContent = nestedParser.getCompletedSections();

  // ALWAYS merge into a single object for object types
  const mergedObject: Record<string, any> = {};
  if (Array.isArray(nestedContent)) {
    nestedContent.forEach(item => {
      if (typeof item === 'object' && !Array.isArray(item)) {
        Object.assign(mergedObject, item);
      }
    });
  }
  result[sectionName] = mergedObject;
}
        // Handle boolean content
        else if (sectionContentType === 'boolean') {
          const trueRegex = /^t(r(u(e?)?)?)?$/;
          const falseRegex = /^f(a(l(s(e?)?)?)?)?$/;
          if (trueRegex.test(sectionContent)) {
            result[sectionName] = true;
          }
          else if (falseRegex.test(sectionContent)) {
            result[sectionName] = false;
          }
          else {
            result[sectionName] = null;
          }
        }
        // Handle null content
        else if (sectionContentType === 'null') {
          result[sectionName] = null;
        }
        // Handle number content
        else if (sectionContentType === 'number') {
          result[sectionName] = +sectionContent;
        }
        // Handle string content - check if it's a harmonican_object
        else if (sectionContentType === 'string') {
          // Check if this string is a harmonican_object (matches harmonica pattern)
          if (harmonicaRe.test(sectionContent)) {
            // Apply harmonica function to convert escaped JSON string to actual JSON
            const harmonizedContent = this.harmonica(sectionContent);

            // Create a new parser instance for the harmonican_object content
            const harmonicanParser = new JSONStreamParser(
              null, // Skip validation for harmonican content
              true // Always skip validation for harmonican content
            );

            // Process the harmonized content
            harmonicanParser.processToken(harmonizedContent);

            // Get the parsed harmonican content
            const harmonicanContent = harmonicanParser.getCompletedSections();

            // Reconstruct the object from the array of sections
            if (Array.isArray(harmonicanContent) && harmonicanContent.length > 0) {
              // Check if all elements are objects with single keys (indicating they were parsed as sections)
              const allAreSingleKeyObjects = harmonicanContent.every(item =>
                typeof item === 'object' &&
                !Array.isArray(item) &&
                Object.keys(item).length === 1
              );

              if (allAreSingleKeyObjects) {
                // Merge all the single-key objects into one object
                const mergedObject: Record<string, any> = {};
                harmonicanContent.forEach(item => {
                  Object.assign(mergedObject, item);
                });
                result[sectionName] = mergedObject;
              } else {
                // If not all are single-key objects, use the content as-is
                result[sectionName] = harmonicanContent.length === 1 ? harmonicanContent[0] : harmonicanContent;
              }
            } else {
              result[sectionName] = harmonicanContent;
            }
          } else {
            // Regular string content
            result[sectionName] = sectionContent;
          }
        }
        // Fallback for unknown content types
        else {
          result[sectionName] = sectionContent;
        }

        results.push(result);
      }
    });

    return results;
  }

  // Add these methods to parse array content without creating a new parser
  private parseArrayContent(content: string): any[] {
    // Remove the surrounding brackets
    const innerContent = content.substring(1, content.length - 1).trim();
    if (innerContent === '') {
      return [];
    }

    const elements: any[] = [];
    let currentElement = '';
    let depth = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < innerContent.length; i++) {
      const char = innerContent[i];

      if (escapeNext) {
        currentElement += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        currentElement += char;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        currentElement += char;
        continue;
      }

      if (inString) {
        currentElement += char;
        continue;
      }

      if (char === '{' || char === '[') {
        depth++;
        currentElement += char;
      } else if (char === '}' || char === ']') {
        depth--;
        currentElement += char;
      } else if (char === ',' && depth === 0) {
        // End of an element
        elements.push(this.parseArrayElement(currentElement.trim()));
        currentElement = '';
      } else {
        currentElement += char;
      }
    }

    // Add the last element
    if (currentElement.trim() !== '') {
      elements.push(this.parseArrayElement(currentElement.trim()));
    }

    return elements;
  }

  private parseArrayElement(element: string): any {
    const trueRegex = /^t(r(u(e?)?)?)?$/;
    const falseRegex = /^f(a(l(s(e?)?)?)?)?$/;
    const nullRegex = /^n(u(l(l)?)?)?$/;

    // Determine the type of the element
    if (element.startsWith('"') && element.endsWith('"')) {
      return element.substring(1, element.length - 1);
    } else if (element.startsWith('{')) {
  // For objects, create a new parser
  const objectParser = new JSONStreamParser(
    null, // Skip validation for nested content
    true // Always skip validation for nested content
  );
  objectParser.processToken(element);
  const parsedSections = objectParser.getCompletedSections();

  // ALWAYS merge for objects
  const mergedObject: Record<string, any> = {};
  if (Array.isArray(parsedSections)) {
    parsedSections.forEach(section => {
      if (typeof section === 'object' && !Array.isArray(section)) {
        Object.assign(mergedObject, section);
      }
    });
  }
  return mergedObject;
} else if (element.startsWith('[')) {
      // For nested arrays, parse recursively
      return this.parseArrayContent(element);
    } else if (trueRegex.test(element)) {
      return true;
    } else if (falseRegex.test(element)) {
      return false;
    } else if (nullRegex.test(element)) {
      return null;
    } else if (/^-?\d*\.?\d+$/.test(element)) {
      return parseFloat(element);
    } else {
      return element; // fallback
    }
  }
}