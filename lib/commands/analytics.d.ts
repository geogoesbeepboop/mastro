import { BaseCommand } from '../base/command.js';
export default class Analytics extends BaseCommand {
    static description: string;
    static examples: string[];
    static flags: {
        format: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        insights: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'focus-mode': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        period: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        'update-current': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        config: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        verbose: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'no-cache': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'dry-run': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
    };
    private renderer;
    private sessionTracker;
    private analyticsEngine;
    run(): Promise<void>;
    private updateCurrentSessionAnalytics;
    private outputTerminal;
    private outputJSON;
    private outputMarkdown;
    private displayInsights;
    private enableFocusMode;
    private filterSessionsByPeriod;
    private calculateAverageQuality;
    private findCommonPatterns;
    private formatDuration;
    private formatPeakHours;
    private getPatternIcon;
    private getPatternDescription;
    private createSimpleChart;
}
//# sourceMappingURL=analytics.d.ts.map