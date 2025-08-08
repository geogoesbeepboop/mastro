import { Ora } from 'ora';
import type { LoadingState, MastroConfig } from '../types/index.js';
export declare class LoadingStateManager {
    private config;
    private currentSpinner?;
    private animationIntervals;
    constructor(config: MastroConfig);
    createLoadingState(message: string, animated?: boolean): LoadingState;
    startSpinner(message: string, customSpinner?: string[]): Ora;
    updateSpinner(message: string, progress?: number): void;
    stopSpinner(finalMessage?: string, success?: boolean): void;
    startStreamingIndicator(initialMessage: string): StreamingIndicator;
    createProgressBar(percentage: number, width?: number): string;
    createDotAnimation(message: string, interval?: number): () => void;
    cleanup(): void;
}
export declare class StreamingIndicator {
    private message;
    private config;
    private spinner?;
    private currentPhase;
    private phases;
    constructor(message: string, config: MastroConfig);
    private start;
    nextPhase(): void;
    updateProgress(progress: number): void;
    complete(finalMessage?: string): void;
    error(errorMessage: string): void;
    private createProgressBar;
}
export declare const SpinnerConfigs: {
    commit: {
        frames: string[];
        interval: number;
    };
    analyze: {
        frames: string[];
        interval: number;
    };
    review: {
        frames: string[];
        interval: number;
    };
    stream: {
        frames: string[];
        interval: number;
    };
};
export declare function withLoadingState<T>(loadingManager: LoadingStateManager, message: string, operation: () => Promise<T>, successMessage?: string, errorMessage?: string): Promise<T>;
export declare function createStreamingLoadingHandler(loadingManager: LoadingStateManager, initialMessage: string): {
    updateProgress: (progress: number) => void;
    complete: (message?: string) => void;
    error: (error: string) => void;
};
//# sourceMappingURL=loading-states.d.ts.map