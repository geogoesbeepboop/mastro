import {createInterface, emitKeypressEvents} from 'readline';
import chalk from 'chalk';
import type {CommitMessage, MastroConfig} from '../types/index.js';

interface RefinementOptions {
  message: string;
  suggestions: string[];
  allowCustom: boolean;
}

export class InteractiveUI {
  private config: MastroConfig;
  private readline: any;

  constructor(config: MastroConfig) {
    this.config = config;
  }

  async promptForRefinement(options: RefinementOptions): Promise<string | null> {
    if (!this.config.ui.interactive) {
      return null;
    }

    return new Promise((resolve) => {
      try {
        // Prepare menu with "Accept as is" first
        const baseSuggestions = options.suggestions;
        const choices: Array<{ label: string; type: 'accept' | 'suggestion' | 'custom'; index?: number }> = [];
        choices.push({ label: 'Accept as is', type: 'accept' });
        baseSuggestions.forEach((s, idx) => choices.push({ label: s, type: 'suggestion', index: idx }));
        if (options.allowCustom) choices.push({ label: 'Custom refinement', type: 'custom' });

        const renderMenu = (selectedIndex: number) => {
          choices.forEach((choice, idx) => {
            const pointer = idx === selectedIndex ? chalk.green('>') : ' ';
            const displayIndex = choice.type === 'accept'
              ? '0'
              : choice.type === 'custom'
                ? String(baseSuggestions.length + 1)
                : String((choice.index || 0) + 1);
            console.log(`${pointer} ${displayIndex}. ${choice.label}`);
          });
          console.log(''); 
          console.log(chalk.gray('Use ↑/↓ and Enter, or type a number. Esc to cancel.'));
        };

        const supportsRawMode = typeof (process.stdin as any).setRawMode === 'function' && process.stdin.isTTY;

        // Arrow-key interactive mode when raw mode is supported
        if (supportsRawMode) {
          if (this.readline) {
            this.readline.close();
            this.readline = undefined;
          }

          emitKeypressEvents(process.stdin);
          (process.stdin as any).setRawMode(true);
          // Ensure stdin is actively emitting keypress events
          if (typeof (process.stdin as any).resume === 'function') {
            (process.stdin as any).resume();
          }

          let selected = 0;
          console.log(chalk.cyan('🎯 Refinement Options:')); 
          renderMenu(selected);

          // Ignore an immediate stray Enter from a previous readline prompt
          let suppressInitialEnter = true;
          const suppressTimer = setTimeout(() => {
            suppressInitialEnter = false;
          }, 120);

          const onKeypress = (_str: string, key: any) => {
            if (!key) return;

            if (key.name === 'up') {
              selected = (selected - 1 + choices.length) % choices.length;
              this.clearAndRedrawMenu(choices.length, selected, renderMenu);
              return;
            }
            if (key.name === 'down') {
              selected = (selected + 1) % choices.length;
              this.clearAndRedrawMenu(choices.length, selected, renderMenu);
              return;
            }
            if (key.name === 'return' || key.name === 'enter') {
              if (suppressInitialEnter) {
                return;
              }
              const chosen = choices[selected];
              // Clean up keypress handler and raw mode first
              this.cleanupRawMode(onKeypress);
              clearTimeout(suppressTimer);
              console.log('');
              
              if (chosen.type === 'accept') {
                resolve(null);
                return;
              }
              if (chosen.type === 'suggestion' && typeof chosen.index === 'number') {
                resolve(baseSuggestions[chosen.index]);
                return;
              }
              if (chosen.type === 'custom') {
                // Now safe to create new readline interface
                this.handleCustomRefinement(resolve);
                return;
              }
            }

            // Direct numeric selection
            if (key.sequence && /[0-9]/.test(key.sequence)) {
              const num = parseInt(key.sequence, 10);
              let targetIndex = -1;
              if (num === 0) targetIndex = 0; // accept
              else if (num >= 1 && num <= baseSuggestions.length) {
                targetIndex = choices.findIndex(c => c.type === 'suggestion' && c.index === num - 1);
              } else if (options.allowCustom && num === baseSuggestions.length + 1) {
                targetIndex = choices.findIndex(c => c.type === 'custom');
              }
              if (targetIndex >= 0) {
                selected = targetIndex;
                this.clearAndRedrawMenu(choices.length, selected, renderMenu);
              }
              return;
            }

            // Cancel -> accept as is
            if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
              this.cleanupRawMode(onKeypress);
              clearTimeout(suppressTimer);
              console.log('\nUsing original message.');
              resolve(null);
            }
          };

          process.stdin.on('keypress', onKeypress);
          return;
        }

        // Fallback numeric mode
        if (this.readline) {
          this.readline.close();
          this.readline = undefined;
        }

        this.readline = createInterface({ input: process.stdin, output: process.stdout });
        this.readline.on('error', (error: Error) => {
          console.error(chalk.red('Readline error:', error.message));
          this.cleanup();
          resolve(null);
        });

        baseSuggestions.forEach((suggestion, index) => {
          console.log(`  ${index + 1}. ${suggestion}`);
        });
        if (options.allowCustom) {
          console.log(`  ${baseSuggestions.length + 1}. Custom refinement`);
        }

        const maxOption = baseSuggestions.length + (options.allowCustom ? 1 : 0);
        this.readline.question(`\nSelect an option (0-${maxOption}): `, (answer: string) => {
          const choice = parseInt(answer.trim(), 10);
          if (isNaN(choice) || choice < 0 || choice > maxOption) {
            console.log(chalk.red(`Invalid choice: "${answer}". Please enter a number between 0 and ${maxOption}. Accepting as is.`));
            this.readline?.close();
            this.readline = undefined;
            resolve(null);
            return;
          }
          if (choice === 0) {
            this.readline?.close();
            this.readline = undefined;
            resolve(null);
            return;
          }
          if (choice > 0 && choice <= baseSuggestions.length) {
            const selectedSuggestion = baseSuggestions[choice - 1];
            this.readline?.close();
            this.readline = undefined;
            resolve(selectedSuggestion);
            return;
          }
          if (options.allowCustom && choice === baseSuggestions.length + 1) {
            this.readline?.question('Enter custom refinement: ', (custom: string) => {
              const customRefinement = custom.trim();
              this.readline?.close();
              this.readline = undefined;
              if (customRefinement.length === 0) {
                console.log(chalk.yellow('Empty refinement. Using original message.'));
                resolve(null);
              } else {
                resolve(customRefinement);
              }
            });
            return;
          }
          console.log(chalk.red('Invalid choice. Accepting as is.'));
          this.readline?.close();
          this.readline = undefined;
          resolve(null);
        });
        
      } catch (error) {
        this.cleanup();
        resolve(null);
      }
    });
  }

  async confirmAction(message: string, defaultYes = true): Promise<boolean> {
    if (!this.config.ui.interactive) {
      return defaultYes;
    }

    return new Promise((resolve) => {
      try {
        // Clean up any existing readline instance
        if (this.readline) {
          this.readline.close();
          this.readline = undefined;
        }
        
        this.readline = createInterface({
          input: process.stdin,
          output: process.stdout
        });

        // Add error handling for readline
        this.readline.on('error', (error: Error) => {
          console.error(chalk.red('Readline error:', error.message));
          this.cleanup();
          resolve(defaultYes);
        });

        const prompt = defaultYes ? `${message} (Y/n): ` : `${message} (y/N): `;
        
        this.readline.question(prompt, (answer: string) => {
          this.readline?.close();
          this.readline = undefined;
          
          const response = answer.trim().toLowerCase();
          if (response === '') {
            resolve(defaultYes);
          } else if (response === 'y' || response === 'yes') {
            resolve(true);
          } else if (response === 'n' || response === 'no') {
            resolve(false);
          } else {
            // Invalid response, show what they typed and use default
            console.log(chalk.yellow(`Invalid response "${answer}". Using default (${defaultYes ? 'Yes' : 'No'}).`));
            resolve(defaultYes);
          }
        });
        
      } catch (error) {
        console.error(chalk.red('Error in confirmAction:', error instanceof Error ? error.message : 'Unknown error'));
        this.cleanup();
        resolve(defaultYes);
      }
    });
  }

  async selectFromList<T>(items: T[], displayFn: (item: T) => string, message = 'Select an option'): Promise<T | null> {
    if (!this.config.ui.interactive || items.length === 0) {
      return items[0] || null;
    }

    return new Promise((resolve) => {
      this.readline = createInterface({
        input: process.stdin,
        output: process.stdout
      });

      console.log(chalk.cyan(`\n${message}:`));
      items.forEach((item, index) => {
        console.log(`  ${index + 1}. ${displayFn(item)}`);
      });
      console.log('  0. Cancel');

      this.readline.question(`\nSelect (0-${items.length}): `, (answer: string) => {
        this.readline.close();
        
        const choice = parseInt(answer.trim(), 10);
        if (choice === 0) {
          resolve(null);
        } else if (choice > 0 && choice <= items.length) {
          resolve(items[choice - 1]);
        } else {
          console.log(chalk.red('Invalid choice. Cancelled.'));
          resolve(null);
        }
      });
    });
  }

  async getTextInput(prompt: string, defaultValue?: string): Promise<string | null> {
    if (!this.config.ui.interactive) {
      return defaultValue || null;
    }

    return new Promise((resolve) => {
      this.readline = createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const fullPrompt = defaultValue ? `${prompt} (${defaultValue}): ` : `${prompt}: `;
      
      this.readline.question(fullPrompt, (answer: string) => {
        this.readline.close();
        
        const response = answer.trim();
        if (response === '' && defaultValue) {
          resolve(defaultValue);
        } else if (response === '') {
          resolve(null);
        } else {
          resolve(response);
        }
      });
    });
  }

  async showProgressiveEnhancement(
    initialMessage: CommitMessage,
    enhancedMessage: CommitMessage,
    onSelect: (message: CommitMessage) => void
  ): Promise<void> {
    if (!this.config.ui.interactive) {
      onSelect(enhancedMessage);
      return;
    }

    console.log(chalk.cyan('\n📈 Progressive Enhancement Available'));
    console.log(chalk.gray('─'.repeat(40)));
    
    console.log(chalk.yellow('\n⚡ Quick Version:'));
    console.log(`${initialMessage.type}${initialMessage.scope ? `(${initialMessage.scope})` : ''}: ${initialMessage.title}`);
    
    console.log(chalk.green('\n🎯 Enhanced Version:'));
    console.log(`${enhancedMessage.type}${enhancedMessage.scope ? `(${enhancedMessage.scope})` : ''}: ${enhancedMessage.title}`);
    if (enhancedMessage.body) {
      console.log(`\n${enhancedMessage.body}`);
    }
    
    const choice = await this.selectFromList(
      [
        { label: 'Use Quick Version', message: initialMessage },
        { label: 'Use Enhanced Version', message: enhancedMessage }
      ],
      item => item.label,
      'Which version would you like to use'
    );

    if (choice) {
      onSelect(choice.message);
    } else {
      onSelect(initialMessage); // Default to quick version
    }
  }

  cleanup(): void {
    if (this.readline) {
      try {
        this.readline.close();
      } catch (error) {
        // Ignore cleanup errors
      } finally {
        this.readline = undefined;
      }
    }
  }

  private cleanupRawMode(keyHandler: (str: string, key: any) => void): void {
    try {
      // Remove keypress event listener
      process.stdin.off('keypress', keyHandler);
      // Exit raw mode
      if (typeof (process.stdin as any).setRawMode === 'function') {
        (process.stdin as any).setRawMode(false);
      }
    } catch (error) {
      // Ignore cleanup errors, but ensure we don't leave dangling handlers
    }
  }

  private handleCustomRefinement(resolve: (value: string | null) => void): void {
    try {
      // Clean up any existing readline instance
      if (this.readline) {
        this.readline.close();
        this.readline = undefined;
      }
      
      this.readline = createInterface({ input: process.stdin, output: process.stdout });
      this.readline.on('error', (error: Error) => {
        console.error(chalk.red('Readline error:', error.message));
        this.cleanup();
        resolve(null);
      });

      this.readline.question('Enter custom refinement: ', (custom: string) => {
        const customRefinement = custom.trim();
        this.readline?.close();
        this.readline = undefined;
        
        if (customRefinement.length === 0) {
          console.log(chalk.yellow('Empty refinement. Using original message.'));
          resolve(null);
        } else {
          resolve(customRefinement);
        }
      });
    } catch (error) {
      console.error(chalk.red('Error in custom refinement:', error instanceof Error ? error.message : 'Unknown error'));
      this.cleanup();
      resolve(null);
    }
  }

  private clearAndRedrawMenu(menuItemCount: number, selectedIndex: number, renderMenu: (index: number) => void): void {
    try {
      // Total lines printed includes:
      // - 1 header line
      // - menuItemCount items
      // - 1 instructions line
      const linesToClear = menuItemCount + 2;
  
      if (
        typeof (process.stdout as any).moveCursor === 'function' &&
        typeof (process.stdout as any).cursorTo === 'function' &&
        typeof (process.stdout as any).clearScreenDown === 'function'
      ) {
        // Move cursor to the beginning of the header line
        (process.stdout as any).moveCursor(0, -linesToClear);
        (process.stdout as any).cursorTo(0);
        (process.stdout as any).clearScreenDown();
        renderMenu(selectedIndex);
      } else {
        console.clear(); // full clear fallback if moveCursor not supported
        console.log(chalk.cyan('🎯 Refinement Options:'));
        renderMenu(selectedIndex);
      }
    } catch (error) {
      console.clear(); // absolute fallback
      console.log(chalk.cyan('🎯 Refinement Options:'));
      renderMenu(selectedIndex);
    }
  }  

  /**
   * Select from a list of options and return the selected index
   */
  async selectIndex(message: string, options: string[]): Promise<number> {
    if (!this.config.ui.interactive || options.length === 0) {
      return 0;
    }

    return new Promise((resolve) => {
      try {
        // Clean up any existing readline instance
        if (this.readline) {
          this.readline.close();
          this.readline = undefined;
        }
        
        this.readline = createInterface({
          input: process.stdin,
          output: process.stdout
        });

        // Add error handling for readline
        this.readline.on('error', (error: Error) => {
          console.error(chalk.red('Readline error:', error.message));
          this.cleanup();
          resolve(0);
        });

        console.log(chalk.cyan(`\n${message}`));
        options.forEach((option, index) => {
          console.log(`  ${index + 1}. ${option}`);
        });
        
        this.readline.question(`\nSelect option (1-${options.length}): `, (answer: string) => {
          const choice = parseInt(answer.trim(), 10);
          
          if (choice >= 1 && choice <= options.length) {
            this.readline?.close();
            this.readline = undefined;
            resolve(choice - 1); // Return 0-based index
          } else {
            console.log(chalk.yellow(`Invalid choice "${answer}". Selecting first option.`));
            this.readline?.close();
            this.readline = undefined;
            resolve(0);
          }
        });
        
      } catch (error) {
        console.error(chalk.red('Error in selectIndex:', error instanceof Error ? error.message : 'Unknown error'));
        this.cleanup();
        resolve(0);
      }
    });
  }
}

// Utility function to create common refinement suggestions
export function createRefinementSuggestions(type: 'commit' | 'explanation' | 'pr' | 'review'): string[] {
  const suggestions: Record<string, string[]> = {
    commit: [
      'Make it more technical',
      'Make it more concise',
      'Add more context',
      'Match team style better',
      'Include performance implications',
      'Add security considerations'
    ],
    explanation: [
      'Make it more detailed',
      'Focus on business impact',
      'Simplify for non-technical audience',
      'Add more technical depth',
      'Include migration steps',
      'Add testing guidance'
    ],
    pr: [
      'Add more testing instructions',
      'Include performance impact',
      'Add breaking changes section',
      'Make description more detailed',
      'Add deployment notes',
      'Include rollback plan'
    ],
    review: [
      'Be more strict',
      'Be more lenient',
      'Focus on security',
      'Focus on performance',
      'Focus on maintainability',
      'Add more positive feedback'
    ]
  };

  return suggestions[type] || [];
}