import * as clarinet from 'clarinet';

interface CompletedSection {
  sectionName: string;
  sectionContent: string;
  sectionContentType?: string;
}

const harmonicaRe = /["\s]*\[?\s*\{\s*\\\"/;

export class ClarineJSONStreamParser {
  private allowedSections: readonly string[] | null;
  private skipNonValidSections: boolean = false;
  private parser: any;
  private completedSections: CompletedSection[] = [];
  
  // State for tracking current parsing context
  private currentSectionName: string | null = null;
  private currentSectionValue: any = null;
  private isCapturingSection: boolean = false;
  private depth: number = 0;
  private isInRootObject: boolean = false;
  private isRootArray: boolean = false;
  private pendingKey: string | null = null;
  
  // For building complex values (objects/arrays) as they stream in
  private valueStack: any[] = [];
  private keyStack: string[] = [];

  constructor(allowedSections: readonly string[] | null, skipNonValidSections: boolean = false) {
    this.allowedSections = allowedSections;
    this.skipNonValidSections = skipNonValidSections;
    this.initializeParser();
  }

  private initializeParser() {
    this.parser = clarinet.parser();
    
    this.parser.onerror = (e: Error) => {
      console.error('[ClarineJSONStreamParser] Parse error:', e);
    };

    this.parser.onopenobject = (key: string | null) => {
      this.depth++;
      
      if (this.depth === 1) {
        // Root object started
        this.isInRootObject = true;
        this.valueStack.push({});
        
        if (key) {
          this.handleRootKey(key);
        }
      } else {
        // Nested object
        const newObj = {};
        this.valueStack.push(newObj);
        
        if (this.isCapturingSection && this.depth === 2) {
          // This is the value for our current section
          this.currentSectionValue = newObj;
        }
      }
    };

    this.parser.onkey = (key: string) => {
      this.keyStack[this.depth - 1] = key;
      
      if (this.depth === 1) {
        // Root level key - potential section
        this.handleRootKey(key);
      }
    };

    this.parser.oncloseobject = () => {
      const completedObj = this.valueStack.pop();
      this.depth--;
      
      if (this.depth === 0) {
        // Root object closed
        this.isInRootObject = false;
      } else if (this.depth === 1 && this.isCapturingSection) {
        // Section object completed
        this.finalizeCapturedSection();
      } else if (this.depth > 0) {
        // Add completed object to parent
        this.addToParent(completedObj);
      }
    };

    this.parser.onopenarray = () => {
      this.depth++;
      
      if (this.depth === 1) {
        // Root array
        this.isRootArray = true;
        this.valueStack.push([]);
        this.completedSections.push({
          sectionName: 'root',
          sectionContent: '',
          sectionContentType: 'array'
        });
      } else {
        // Nested array
        const newArray: any[] = [];
        this.valueStack.push(newArray);
        
        if (this.isCapturingSection && this.depth === 2) {
          this.currentSectionValue = newArray;
        }
      }
    };

    this.parser.onclosearray = () => {
      const completedArray = this.valueStack.pop();
      this.depth--;
      
      if (this.depth === 0 && this.isRootArray) {
        // Root array completed
        this.isRootArray = false;
        // Update the root section with final content
        const rootSection = this.completedSections.find(s => s.sectionName === 'root');
        if (rootSection) {
          rootSection.sectionContent = JSON.stringify(completedArray);
        }
      } else if (this.depth === 1 && this.isCapturingSection) {
        // Section array completed
        this.finalizeCapturedSection();
      } else if (this.depth > 0) {
        // Add completed array to parent
        this.addToParent(completedArray);
      }
    };

    this.parser.onvalue = (value: any) => {
      if (this.depth === 1 && this.isCapturingSection) {
        // Simple value for current section
        this.currentSectionValue = value;
        this.finalizeCapturedSection();
      } else if (this.depth > 1) {
        // Add value to parent object/array
        this.addToParent(value);
      }
    };

    this.parser.onend = () => {
      // Stream ended - finalize any pending section
      if (this.isCapturingSection) {
        this.finalizeCapturedSection();
      }
    };
  }

  private handleRootKey(key: string) {
    // Finalize any previous section first
    if (this.isCapturingSection) {
      this.finalizeCapturedSection();
    }
    
    // Check if this is a valid section to capture
    if (this.isValidSection(key)) {
      this.currentSectionName = key;
      this.isCapturingSection = true;
      this.currentSectionValue = null;
      this.pendingKey = key;
    }
  }

  private addToParent(value: any) {
    if (this.valueStack.length === 0) return;
    
    const parent = this.valueStack[this.valueStack.length - 1];
    const key = this.keyStack[this.depth - 1];
    
    if (Array.isArray(parent)) {
      parent.push(value);
    } else if (key) {
      parent[key] = value;
    }
  }

  private finalizeCapturedSection() {
    if (!this.isCapturingSection || !this.currentSectionName) return;
    
    let finalValue = this.currentSectionValue;
    let contentType = this.getValueType(finalValue);
    let content: string;
    
    if (typeof finalValue === 'string') {
      content = finalValue;
    } else {
      content = JSON.stringify(finalValue);
    }
    
    // Handle special JSON string sections like action_json
    if (typeof finalValue === 'string') {
      // Check if this is action_json or similar sections that contain JSON strings
      if (this.currentSectionName === 'action_json' || this.currentSectionName === 'params') {
        try {
          const parsed = JSON.parse(finalValue);
          content = JSON.stringify(parsed);
          contentType = 'object';
        } catch (e) {
          // Keep as string if parsing fails
        }
      } else if (harmonicaRe.test(finalValue)) {
        // Handle harmonican objects (escaped JSON strings)
        try {
          const harmonized = this.harmonica(finalValue);
          const parsed = JSON.parse(harmonized);
          content = JSON.stringify(parsed);
          contentType = 'object';
        } catch (e) {
          // Keep as string if parsing fails
        }
      }
    }
    
    this.completedSections.push({
      sectionName: this.currentSectionName,
      sectionContent: content,
      sectionContentType: contentType
    });
    
    // Reset capture state
    this.currentSectionName = null;
    this.currentSectionValue = null;
    this.isCapturingSection = false;
    this.pendingKey = null;
  }

  private getValueType(value: any): string {
    if (value === null) return 'null';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'unknown';
  }

  private isValidSection(section: string): boolean {
    if (this.skipNonValidSections) return true;
    if (this.allowedSections === null) return true;
    return this.allowedSections.includes(section);
  }

  private harmonica(str: string): string {
    return str.replace(/\\"/g, '"').replace(/"\s*(\[|\{)/g, '$1');
  }

  // Public API methods (compatible with original JSONStreamParser)
  processToken(token: string): void {
    try {
      this.parser.write(token);
    } catch (error) {
      console.warn('[ClarineJSONStreamParser] Parsing warning:', error);
    }
  }

  getCompletedSections(): any[] {
    const results: any[] = [];

    this.completedSections.forEach(section => {
      const { sectionName, sectionContent, sectionContentType } = section;

      // Special handling for root array sections
      if (sectionName === 'root' && sectionContentType === 'array') {
        try {
          const arrayElements = JSON.parse(sectionContent || '[]');
          results.push(arrayElements);
        } catch (e) {
          results.push([]);
        }
        return;
      }

      // Only include allowed sections
      if (this.allowedSections === null || this.allowedSections.includes(sectionName)) {
        const result: Record<string, any> = {};

        try {
          if (sectionContentType === 'string') {
            result[sectionName] = sectionContent;
          } else if (sectionContentType === 'number') {
            result[sectionName] = Number(sectionContent);
          } else if (sectionContentType === 'boolean') {
            result[sectionName] = sectionContent === 'true';
          } else if (sectionContentType === 'null') {
            result[sectionName] = null;
          } else {
            // object or array
            result[sectionName] = JSON.parse(sectionContent);
          }
        } catch (e) {
          // Fallback to string content
          result[sectionName] = sectionContent;
        }

        results.push(result);
      }
    });

    return results;
  }

  resetAll(): void {
    // Reset all state
    this.completedSections = [];
    this.currentSectionName = null;
    this.currentSectionValue = null;
    this.isCapturingSection = false;
    this.depth = 0;
    this.isInRootObject = false;
    this.isRootArray = false;
    this.pendingKey = null;
    this.valueStack = [];
    this.keyStack = [];
    
    // Re-initialize parser
    this.initializeParser();
  }
}