import { query } from '@anthropic-ai/claude-code';
import { EventEmitter } from 'events';
import { createMigrationGuideLoader, MigrationGuideLoader } from './migration-guide-loader';
import { logger } from '@elizaos/core';

export interface SimpleMigrationResult {
  success: boolean;
  repoPath: string;
  duration: number;
  messageCount: number;
  error?: Error;
  guidesUsed?: string[];
}

export class SimpleMigrationAgent extends EventEmitter {
  private repoPath: string;
  private abortController: AbortController;
  private verbose: boolean;
  private guideLoader: MigrationGuideLoader;

  constructor(repoPath: string, options: { verbose?: boolean } = {}) {
    super();
    this.repoPath = repoPath;
    this.abortController = new AbortController();
    this.verbose = options.verbose || false;

    // Initialize guide loader with enhanced migration knowledge
    try {
      this.guideLoader = createMigrationGuideLoader();
      if (this.verbose) {
        logger.info('Migration guide loader initialized successfully');
      }
    } catch (error) {
      logger.warn('Failed to initialize migration guide loader', error);
      throw new Error('Cannot initialize migration system without guide access');
    }
  }

  private isImportantUpdate(text: string): boolean {
    // Only show progress updates, gate completions, and major status changes
    const importantPatterns = [
      /GATE \d+/i,
      /analysis/i,
      /migration/i,
      /complete/i,
      /success/i,
      /error/i,
      /building/i,
      /testing/i,
      /✓|✗|🎉|🚀|📊/,
    ];

    return importantPatterns.some((pattern) => pattern.test(text)) && text.length < 200; // Avoid very long messages
  }

  private formatProgressUpdate(text: string): string {
    // Clean up and format the text for better readability
    text = text.trim();

    // Add appropriate emojis and formatting
    if (text.includes('GATE')) {
      return `\n🎯 ${text}`;
    } else if (text.includes('complete') || text.includes('✓')) {
      return `✅ ${text}`;
    } else if (text.includes('error') || text.includes('✗')) {
      return `❌ ${text}`;
    } else if (text.includes('analyzing') || text.includes('migration')) {
      return `🔍 ${text}`;
    } else if (text.includes('building')) {
      return `🔨 ${text}`;
    } else if (text.includes('testing')) {
      return `🧪 ${text}`;
    }

    return text;
  }

  private getSimplifiedToolName(toolName: string): string | null {
    const toolMap: Record<string, string> = {
      TodoWrite: '📝 Planning',
      Bash: '⚡ Running',
      Read: '📖 Reading',
      Edit: '✏️  Editing',
      Write: '📄 Writing',
      LS: '🔍 Exploring',
      Grep: '🔎 Searching',
      Task: '🔧 Processing',
    };

    return toolMap[toolName] || null;
  }

  async migrate(): Promise<SimpleMigrationResult> {
    const startTime = Date.now();
    let messageCount = 0;

    try {
      // Disable verbose telemetry to reduce noise
      process.env.CLAUDE_CODE_ENABLE_TELEMETRY = '0';
      process.env.OTEL_LOGS_EXPORTER = '';
      process.env.OTEL_LOG_USER_PROMPTS = '0';
      process.env.OTEL_METRICS_EXPORTER = '';

      console.log('Claude is analyzing and migrating your plugin...\n');
      this.emit('start');

      console.log(`Starting migration in directory: ${this.repoPath}`);

      // Generate comprehensive migration context with all guide knowledge
      const migrationContext = this.guideLoader.getAllGuidesContent();
      const guideReferences = this.guideLoader.generateMigrationContext();

      const migrationPrompt = `You are about to help migrate an ElizaOS plugin from 0.x to 1.x format.

CRITICAL: You must follow the INTEGRATED EXECUTION PROTOCOL exactly as specified in the CLAUDE.md file.

This is a GATED PROCESS with 9 gates (0-8). You CANNOT skip steps.

COMPREHENSIVE MIGRATION KNOWLEDGE BASE:
${migrationContext}

GUIDE REFERENCE SYSTEM:
${guideReferences}

REFERENCE GUIDES are in migration-guides/ directory:
- migration-guide.md (basic migration steps)
- state-and-providers-guide.md (state & providers migration)
- prompt-and-generation-guide.md (templates & generation)
- advanced-migration-guide.md (services, settings, evaluators)
- testing-guide.md (comprehensive testing requirements)
- completion-requirements.md (final validation and release preparation)

ENHANCED RAG CAPABILITIES:
You have access to the complete content of all migration guides above. Use this knowledge to:
1. Provide specific, detailed migration steps
2. Reference exact sections from the appropriate guides
3. Troubleshoot specific issues with targeted solutions
4. Ensure comprehensive coverage of all migration requirements

CRITICAL TEST VALIDATION REQUIREMENTS - ABSOLUTE REQUIREMENTS

MIGRATION CANNOT BE COMPLETED UNTIL ALL TESTS PASS

Throughout the migration process, you MUST validate these requirements and loop until they pass:

1. MANDATORY TEST VALIDATION LOOP: After every significant code change, run:
   - bun run test - ALL tests must pass (100% success rate, ZERO failures)
   - bunx tsc --noEmit - ZERO TypeScript errors in src/ directory
   - Only test files can have type errors, src/ must be error-free

2. CONTINUOUS VALIDATION LOOP: If ANY of these fail:
   - Analyze the errors thoroughly
   - Fix all issues identified
   - Re-run the validation commands
   - Repeat until BOTH commands succeed with zero errors
   - DO NOT PROCEED until validation passes

3. COVERAGE VS TEST CONFLICTS: If tests conflict with 95% coverage requirements:
   - Prioritize making tests pass over coverage percentage
   - Use workarounds like test mocks, stubs, or simplified implementations
   - Lower coverage if necessary - tests passing is more important
   - Add // @ts-ignore comments if needed for test compatibility

4. RELEASE WORKFLOW REQUIREMENT: The .github/workflows/release.yml requires bun run test to pass before npm publish. Migration is NOT complete until all tests pass.

5. ABSOLUTE REQUIREMENTS - NO EXCEPTIONS:
   - bun run test MUST show 0 failing tests
   - If ANY test fails, the migration is INCOMPLETE
   - Do not declare success until bun run test passes completely
   - Work around any test issues rather than leaving them failing

START WITH GATE 0: Create 1.x branch
Execute: git checkout -b 1.x
Gate Check: git branch --show-current must output "1.x"

THEN GATE 1: Complete analysis following the exact format in the integrated-migration-loop.md

DO NOT PROCEED until each gate check passes AND all validation requirements are met.

Remember: You must grind on test failures and TypeScript errors until they are 100% resolved. The release workflow will fail if tests don't pass.

FINAL VALIDATION REQUIREMENTS (GATE 8+) - ABSOLUTELY MANDATORY

THE MIGRATION IS NOT COMPLETE UNTIL EVERY SINGLE TEST PASSES

After completing all 9 gates, you MUST perform final validation and loop until both pass:

FINAL VALIDATION LOOP - REPEAT UNTIL SUCCESS:
1. Run: bun run test
   - MUST pass 100% - this is required for npm release workflow
   - If ANY tests fail, analyze and fix them, then retry
   - Use workarounds, mocks, simplified implementations if needed
   - Lower coverage requirements if tests conflict with coverage
   - Do NOT declare migration complete until this shows ZERO failures

2. Run: bunx tsc --noEmit  
   - MUST have ZERO errors in src/ directory
   - Test files can have type errors as exception, but fix if possible
   - If any src/ errors exist, fix them and retry

3. REPEAT FINAL VALIDATION LOOP until both commands succeed with zero errors
   - Keep trying different approaches
   - Simplify tests if needed
   - Use test mocks and stubs
   - Do whatever it takes to make tests pass

4. Only AFTER both final validations pass with ZERO failures, declare migration complete

ABSOLUTE REQUIREMENT: The migration is NOT complete until bun run test shows zero failures. The release workflow will fail otherwise. NO EXCEPTIONS.`;

      // Wrap the query call to handle SDK-level errors more gracefully
      let queryGenerator;
      try {
        queryGenerator = query({
          prompt: migrationPrompt,
          abortController: this.abortController,
          options: {
            cwd: this.repoPath,
            model: 'opus',
            permissionMode: 'bypassPermissions',
          },
        });
      } catch (queryError) {
        const errorMessage = queryError instanceof Error ? queryError.message : String(queryError);
        throw new Error(`Failed to initialize Claude Code SDK query: ${errorMessage}`);
      }

      for await (const message of queryGenerator) {
        messageCount++;

        try {
          // Much cleaner message parsing - focus on high-level progress
          if (message.type === 'assistant') {
            if (message.message && message.message.content) {
              const content = message.message.content;

              // Handle content as array (newer format)
              if (Array.isArray(content)) {
                for (const block of content) {
                  if (block.type === 'text') {
                    // Filter out verbose text, show only key progress updates
                    const text = block.text;
                    if (this.isImportantUpdate(text)) {
                      console.log(this.formatProgressUpdate(text));
                    }
                  } else if (block.type === 'tool_use') {
                    // Show simplified tool usage
                    const toolName = this.getSimplifiedToolName(block.name);
                    if (toolName) {
                      process.stdout.write(`${toolName}...`);
                    }
                  }
                }
              } else if (typeof content === 'string') {
                if (this.isImportantUpdate(content)) {
                  console.log(this.formatProgressUpdate(content));
                }
              }
            }
          }

          // Simple tool completion indicator
          // Check if this is a tool result message (type might vary by SDK version)
          if ('type' in message && (message as any).type === 'tool_result') {
            process.stdout.write(' ✓\n');
          }

          // Final result messages with key info only
          if (message.type === 'result') {
            console.log(`\n\n📊 Migration Summary:`);
            console.log(`Status: ${message.subtype === 'success' ? '✅ Completed' : '❌ Failed'}`);
            if (message.total_cost_usd) console.log(`Cost: $${message.total_cost_usd}`);
            if (message.duration_ms)
              console.log(`Duration: ${Math.round(message.duration_ms / 1000)}s`);
            if (message.num_turns) console.log(`AI Operations: ${message.num_turns}`);
            console.log('');
          }

          // System init message - clean display
          if (message.type === 'system' && message.subtype === 'init') {
            console.log(`Starting migration session...\n`);
          }
        } catch (messageError) {
          // Silently handle message processing errors to avoid noise
          if (this.verbose) {
            const errorMessage =
              messageError instanceof Error ? messageError.message : String(messageError);
            console.log(`\n❌ Message processing error: ${errorMessage}`);
          }
        }

        // Show minimal progress updates
        if (messageCount % 20 === 0) {
          console.log(`\n⏳ Processing... (${messageCount} operations)\n`);
          this.emit('progress', messageCount);
        }
      }

      console.log('\nMigration completed successfully!');

      // Get list of guides that were available
      const guidesUsed = this.guideLoader
        .getGuidesByCategory('basic')
        .concat(this.guideLoader.getGuidesByCategory('advanced'))
        .concat(this.guideLoader.getGuidesByCategory('testing'))
        .concat(this.guideLoader.getGuidesByCategory('completion'))
        .map((guide) => guide.name);

      return {
        success: true,
        repoPath: this.repoPath,
        duration: Date.now() - startTime,
        messageCount,
        guidesUsed,
      };
    } catch (error) {
      console.log('\n✗ Migration failed');

      console.log(`\nError details:`, error);

      return {
        success: false,
        repoPath: this.repoPath,
        duration: Date.now() - startTime,
        messageCount,
        error: error as Error,
      };
    }
  }

  abort(): void {
    this.abortController.abort();
    console.log('\nMigration aborted by user');
  }

  /**
   * Get migration help for specific issues
   */
  getMigrationHelp(issue: string): string {
    try {
      const results = this.guideLoader.getRelevantGuidesForIssue(issue);

      if (results.length === 0) {
        return `No specific guidance found for: ${issue}\nCheck the basic migration-guide.md for general steps.`;
      }

      const help = [
        `MIGRATION GUIDANCE FOR: ${issue.toUpperCase()}`,
        '',
        'Relevant guides found:',
        '',
      ];

      for (const result of results) {
        help.push(`## ${result.guide.name}`);
        help.push(`Relevance Score: ${result.relevanceScore.toFixed(1)}`);
        help.push(`Matched Keywords: ${result.matchedKeywords.join(', ')}`);
        help.push(`Category: ${result.guide.category}`);
        help.push('');
      }

      return help.join('\n');
    } catch (error) {
      return `Error getting migration help: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Search guides for specific content
   */
  searchGuides(query: string, limit: number = 3): string {
    try {
      const results = this.guideLoader.searchGuides(query, limit);

      if (results.length === 0) {
        return `No guides found matching: ${query}`;
      }

      const searchResults = [
        `SEARCH RESULTS FOR: ${query}`,
        '',
        `Found ${results.length} relevant guide(s):`,
        '',
      ];

      for (const result of results) {
        searchResults.push(`## ${result.guide.name}`);
        searchResults.push(`Score: ${result.relevanceScore.toFixed(1)}`);
        searchResults.push(`Keywords: ${result.matchedKeywords.join(', ')}`);
        searchResults.push(`Path: ${result.guide.path}`);
        searchResults.push('');
      }

      return searchResults.join('\n');
    } catch (error) {
      return `Error searching guides: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Get complete migration context for debugging
   */
  getFullMigrationContext(): string {
    try {
      return this.guideLoader.getAllGuidesContent();
    } catch (error) {
      return `Error getting migration context: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}
