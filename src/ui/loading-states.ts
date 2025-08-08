import ora, {Ora} from 'ora';
import chalk from 'chalk';
import type {LoadingState, MastroConfig} from '../types/index.js';

export class LoadingStateManager {
  private config: MastroConfig;
  private currentSpinner?: Ora;
  private animationIntervals: NodeJS.Timeout[] = [];

  constructor(config: MastroConfig) {
    this.config = config;
  }

  createLoadingState(message: string, animated = true): LoadingState {
    return {
      status: 'loading',
      message,
      progress: 0,
      animated
    };
  }

  startSpinner(message: string, customSpinner?: string[]): Ora {
    this.stopSpinner();
    
    if (!this.config.ui.spinner) {
      console.log(chalk.cyan(`⏳ ${message}`));
      return {} as Ora; // Return empty object if spinner disabled
    }

    const spinnerOptions = customSpinner ? {
      text: message,
      color: 'cyan' as const,
      spinner: { frames: customSpinner, interval: 100 } as const
    } : {
      text: message,
      color: 'cyan' as const,
      spinner: 'dots2' as const
    };

    this.currentSpinner = ora(spinnerOptions).start();
    return this.currentSpinner;
  }

  updateSpinner(message: string, progress?: number): void {
    if (!this.currentSpinner || !this.config.ui.spinner) {
      if (!this.config.ui.spinner) {
        console.log(chalk.cyan(`⏳ ${message}`));
      }
      return;
    }

    let displayMessage = message;
    if (progress !== undefined) {
      const progressBar = this.createProgressBar(progress);
      displayMessage = `${message} ${progressBar} ${Math.round(progress)}%`;
    }

    this.currentSpinner.text = displayMessage;
  }

  stopSpinner(finalMessage?: string, success = true): void {
    if (this.currentSpinner && this.config.ui.spinner) {
      if (finalMessage) {
        if (success) {
          this.currentSpinner.succeed(finalMessage);
        } else {
          this.currentSpinner.fail(finalMessage);
        }
      } else {
        this.currentSpinner.stop();
      }
    } else if (finalMessage && !this.config.ui.spinner) {
      const icon = success ? '✓' : '✗';
      console.log(chalk[success ? 'green' : 'red'](`${icon} ${finalMessage}`));
    }

    this.currentSpinner = undefined;
  }

  startStreamingIndicator(initialMessage: string): StreamingIndicator {
    return new StreamingIndicator(initialMessage, this.config);
  }

  createProgressBar(percentage: number, width = 20): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    
    const filledBar = chalk.green('█'.repeat(filled));
    const emptyBar = chalk.gray('░'.repeat(empty));
    
    return `[${filledBar}${emptyBar}]`;
  }

  createDotAnimation(message: string, interval = 500): () => void {
    let dotCount = 0;
    const maxDots = 3;
    
    const intervalId = setInterval(() => {
      dotCount = (dotCount + 1) % (maxDots + 1);
      const dots = '.'.repeat(dotCount);
      const spaces = ' '.repeat(maxDots - dotCount);
      
      if (this.currentSpinner && this.config.ui.spinner) {
        this.currentSpinner.text = `${message}${dots}${spaces}`;
      } else if (!this.config.ui.spinner) {
        process.stdout.write(`\r${chalk.cyan(`⏳ ${message}${dots}${spaces}`)}`);
      }
    }, interval);

    this.animationIntervals.push(intervalId);

    return () => {
      clearInterval(intervalId);
      const index = this.animationIntervals.indexOf(intervalId);
      if (index > -1) {
        this.animationIntervals.splice(index, 1);
      }
    };
  }

  cleanup(): void {
    this.stopSpinner();
    this.animationIntervals.forEach(interval => clearInterval(interval));
    this.animationIntervals = [];
  }
}

export class StreamingIndicator {
  private message: string;
  private config: MastroConfig;
  private spinner?: Ora;
  private currentPhase = 0;
  private phases = [
    { name: 'Initializing', icon: '🔄' },
    { name: 'Processing', icon: '⚡' },
    { name: 'Analyzing', icon: '🧠' },
    { name: 'Generating', icon: '✨' },
    { name: 'Finalizing', icon: '🎯' }
  ];

  constructor(message: string, config: MastroConfig) {
    this.message = message;
    this.config = config;
    this.start();
  }

  private start(): void {
    if (this.config.ui.spinner) {
      this.spinner = ora({
        text: `${this.phases[0].icon} ${this.message} - ${this.phases[0].name}`,
        color: 'cyan',
        spinner: 'simpleDotsScrolling'
      }).start();
    } else {
      console.log(chalk.cyan(`${this.phases[0].icon} ${this.message} - ${this.phases[0].name}`));
    }
  }

  nextPhase(): void {
    if (this.currentPhase < this.phases.length - 1) {
      this.currentPhase++;
      const phase = this.phases[this.currentPhase];
      
      if (this.spinner && this.config.ui.spinner) {
        this.spinner.text = `${phase.icon} ${this.message} - ${phase.name}`;
      } else if (!this.config.ui.spinner) {
        console.log(chalk.cyan(`${phase.icon} ${this.message} - ${phase.name}`));
      }
    }
  }

  updateProgress(progress: number): void {
    const phase = this.phases[this.currentPhase];
    const progressBar = this.createProgressBar(progress);
    const text = `${phase.icon} ${this.message} - ${phase.name} ${progressBar} ${Math.round(progress)}%`;
    
    if (this.spinner && this.config.ui.spinner) {
      this.spinner.text = text;
    } else if (!this.config.ui.spinner) {
      process.stdout.write(`\r${chalk.cyan(text)}`);
    }
  }

  complete(finalMessage?: string): void {
    if (this.spinner && this.config.ui.spinner) {
      this.spinner.succeed(finalMessage || `${this.message} completed`);
    } else {
      const message = finalMessage || `${this.message} completed`;
      console.log(chalk.green(`✓ ${message}`));
    }
    this.spinner = undefined;
  }

  error(errorMessage: string): void {
    if (this.spinner && this.config.ui.spinner) {
      this.spinner.fail(`${this.message} failed: ${errorMessage}`);
    } else {
      console.log(chalk.red(`✗ ${this.message} failed: ${errorMessage}`));
    }
    this.spinner = undefined;
  }

  private createProgressBar(percentage: number, width = 15): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    
    const filledBar = chalk.green('█'.repeat(filled));
    const emptyBar = chalk.gray('░'.repeat(empty));
    
    return `[${filledBar}${emptyBar}]`;
  }
}

// Predefined spinner configurations for different operations
export const SpinnerConfigs = {
  commit: {
    frames: ['🔄', '💭', '✍️', '🚀'],
    interval: 200
  },
  analyze: {
    frames: ['🔍', '🧠', '⚡', '💡'],
    interval: 250
  },
  review: {
    frames: ['👀', '🔍', '📝', '✅'],
    interval: 300
  },
  stream: {
    frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    interval: 80
  }
};

// Utility functions for common loading patterns
export function withLoadingState<T>(
  loadingManager: LoadingStateManager,
  message: string,
  operation: () => Promise<T>,
  successMessage?: string,
  errorMessage?: string
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const spinner = loadingManager.startSpinner(message);
    
    try {
      const result = await operation();
      loadingManager.stopSpinner(successMessage || `${message} completed`, true);
      resolve(result);
    } catch (error) {
      const errorMsg = errorMessage || `${message} failed`;
      loadingManager.stopSpinner(errorMsg, false);
      reject(error);
    }
  });
}

export function createStreamingLoadingHandler(
  loadingManager: LoadingStateManager,
  initialMessage: string
) {
  const indicator = loadingManager.startStreamingIndicator(initialMessage);
  let phaseTimer: NodeJS.Timeout;
  let phaseIndex = 0;
  
  // Auto-advance phases if no progress updates come in
  const advancePhase = () => {
    if (phaseIndex < 4) {
      indicator.nextPhase();
      phaseIndex++;
      phaseTimer = setTimeout(advancePhase, 2000);
    }
  };
  
  phaseTimer = setTimeout(advancePhase, 1500);
  
  return {
    updateProgress: (progress: number) => {
      clearTimeout(phaseTimer);
      indicator.updateProgress(progress);
      
      // Auto-advance phases based on progress
      const expectedPhase = Math.floor(progress / 20);
      while (phaseIndex < expectedPhase && phaseIndex < 4) {
        indicator.nextPhase();
        phaseIndex++;
      }
    },
    complete: (message?: string) => {
      clearTimeout(phaseTimer);
      indicator.complete(message);
    },
    error: (error: string) => {
      clearTimeout(phaseTimer);
      indicator.error(error);
    }
  };
}