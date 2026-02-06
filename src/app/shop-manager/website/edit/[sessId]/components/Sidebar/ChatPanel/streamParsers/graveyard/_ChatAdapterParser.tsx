/*
**
** This file is currently not in use, cuz in dspy, we do not use the chat
** adapter anymore. But it was the first thing that we did, so it's
** just left here.
**
*/

// Valid strict mode section types
const PARSEABLE_SECTIONS = [
  /* Old White List */
  // 'analysis',
  // 'execution_plan', 
  // 'needs_rql_discovery',
  // 'estimated_steps',
  // 'thought',
  // 'message_to_user',
  // 'action_json',
  // 'completed',
  // 'needs_asset_info'

  // 'thought_and_message',
  'response',
  'action_json',
  'reasoning'
] as const;

type ParseableSection = typeof PARSEABLE_SECTIONS[number];

type StrictModeParserState = 
  | 'INIT'
  | 'FIRST_BRACKET'
  | 'AFTER_BRACKETS'
  | 'FIRST_HASH'
  | 'AFTER_HASHES'
  | 'CAPTURING_NAME'
  | 'AFTER_NAME'
  | 'CLOSING_FIRST_HASH'
  | 'AFTER_CLOSING_HASHES'
  | 'FIRST_CLOSING_BRACKET'
  | 'COMPLETE';


export class StrictModeParser {
  private state: StrictModeParserState = 'INIT';

  private sectionStack: string = '';
  private sectionNameStack: string = '';

  private buffer: string = '';
  private currentSectionName: string = '';

  private bucket: string = '';

  private completedSections: {
    sectionName: ParseableSection;
    sectionContent: string;
  }[] = [];

  // Check if a string is a valid section name
  private isValidSection(section: string): section is ParseableSection {
    return PARSEABLE_SECTIONS.includes(section as ParseableSection);
  }

  processToken(token: string, eventType?: string) {
    if(eventType === 'workflow_completed') {
      this.syncBucket();
      this.resetParsingState();
      return this.completedSections;
    }

    for (const char of token) {
      this.buffer += char;

       const potentialBucketMode = this.strictModeParser(char);

      if(potentialBucketMode) {
        this.syncBucket();
        this.resetParsingState();
      }

      // Check if we completed a full match
      if(this.state === 'COMPLETE') {
        this.completedSections.push({
          sectionName: this.sectionNameStack as ParseableSection,
          sectionContent: ''
        });

        this.currentSectionName = this.sectionNameStack;
        this.bucket = '';

        this.sectionStack = '';
        this.sectionNameStack = '';
        this.buffer = '';
        this.state = 'INIT';
      }
    }

    return this.completedSections;
  }

  /**
   * This function is used to progress in the checking of the validity of a section name.
   * 
   * @param c - The current character to check.
   * @returns True if we should potentially go into bucket mode (i.e., the section name is invalid or the syntax is broken), otherwise false.
   */
  strictModeParser(c: string): boolean {
    switch (this.state) {
      case 'INIT':
        if (c === '[') {
          this.state = 'FIRST_BRACKET';
          this.sectionStack += c;
          return false;
        }
        return true; // Not in a pattern, try to go into bucket mode

      case 'FIRST_BRACKET':
        if (c === '[') {
          this.state = 'AFTER_BRACKETS';
          this.sectionStack += c;
          return false;
        }
        return true; // Failed match

      case 'AFTER_BRACKETS':
        if (c === ' ') {
          this.sectionStack += c;
          return false; // Optional space, keep going
        } else if (c === '#') {
          this.state = 'FIRST_HASH';
          this.sectionStack += c;
          return false;
        }
        return true; // Failed match

      case 'FIRST_HASH':
        if (c === '#') {
          this.state = 'AFTER_HASHES';
          this.sectionStack += c;
          return false;
        } else if (c === ' ') {
          // Back to looking for first #
          this.state = 'AFTER_BRACKETS';
          this.sectionStack += c;
          return false;
        }
        return true; // Failed match

      case 'AFTER_HASHES':
        if (c === ' ') {
          this.sectionStack += c;
          return false; // Optional space
        } else if (c.match(/\w/)) {
          this.sectionNameStack = c;
          this.sectionStack += '_'; // Placeholder for name
          this.state = 'CAPTURING_NAME';
          return false;
        }
        return true; // Failed match

      case 'CAPTURING_NAME':
        if (c.match(/\w/)) {
          this.sectionNameStack += c;
          // Check max length
          const longestSectionName = PARSEABLE_SECTIONS
            .reduce((a, b) => a.length >= b.length ? a : b, '');
          if (this.sectionNameStack.length > longestSectionName.length) {
            return true; // Name too long
          }
          return false;
        } else if (c === ' ' || c === '#') {
          // End of name, validate it
          if (!this.isValidSection(this.sectionNameStack)) {
            return true; // Invalid section name
          }
          this.sectionStack += ' '; // End of name marker
          this.state = c === ' ' ? 'AFTER_NAME' : 'CLOSING_FIRST_HASH';
          if (c === '#') {
            this.sectionStack += c;
          }
          return false;
        }
        return true; // Invalid character in name

      case 'AFTER_NAME':
        if (c === ' ') {
          this.sectionStack += c;
          return false; // Optional space
        } else if (c === '#') {
          this.state = 'CLOSING_FIRST_HASH';
          this.sectionStack += c;
          return false;
        }
        return true; // Failed match

      case 'CLOSING_FIRST_HASH':
        if (c === '#') {
          this.state = 'AFTER_CLOSING_HASHES';
          this.sectionStack += c;
          return false;
        }
        return true; // Failed match

      case 'AFTER_CLOSING_HASHES':
        if (c === ' ') {
          this.sectionStack += c;
          return false; // Optional space
        } else if (c === ']') {
          this.state = 'FIRST_CLOSING_BRACKET';
          this.sectionStack += c;
          return false;
        }
        return true; // Failed match

      case 'FIRST_CLOSING_BRACKET':
        if (c === ']') {
          this.sectionStack += c;
          this.state = 'COMPLETE';
          return false; // Success!
        }
        return true; // Failed match

      case 'COMPLETE':
        // This shouldn't happen as we reset after complete
        return false;
    }

    return true; // Default to bucket mode
  }

  syncBucket() {
    if (this.currentSectionName) {
      this.bucket += this.buffer;
    }

    // empty the bucket into the last section.
    if (this.completedSections.length > 0) {
      this.completedSections[this.completedSections.length - 1].sectionContent =
        this.bucket;
    }
  }

  resetParsingState() {
    this.state = 'INIT';
    this.sectionStack = '';
    this.sectionNameStack = '';
    this.buffer = '';
  }

  resetAll() {
    this.state = 'INIT';
    this.sectionStack = '';
    this.sectionNameStack = '';
    this.buffer = '';
    this.currentSectionName = '';
    this.bucket = '';
    this.completedSections = [];
  }
}