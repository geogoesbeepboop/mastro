export interface GitChange {
    file: string;
    type: 'added' | 'modified' | 'deleted' | 'renamed';
    insertions: number;
    deletions: number;
    oldFile?: string;
    hunks: GitHunk[];
}
export interface GitHunk {
    header: string;
    lines: GitLine[];
    startLine: number;
    endLine: number;
}
export interface GitLine {
    content: string;
    type: 'added' | 'removed' | 'context';
    lineNumber?: number;
}
export interface CommitContext {
    changes: GitChange[];
    branch: string;
    repository: RepoContext;
    staged: boolean;
    workingDir: string;
    metadata: {
        totalInsertions: number;
        totalDeletions: number;
        fileCount: number;
        changeComplexity: 'low' | 'medium' | 'high';
    };
}
export interface RepoContext {
    name: string;
    root: string;
    language: string;
    framework?: string;
    patterns: TeamPatterns;
    recentCommits: CommitHistory[];
}
export interface TeamPatterns {
    commitStyle: 'conventional' | 'custom';
    prefixes: string[];
    maxLength: number;
    commonPhrases: string[];
    reviewPersona: ReviewPersona;
}
export interface ReviewPersona {
    name: string;
    focus: ('security' | 'performance' | 'maintainability' | 'testing')[];
    strictness: 'lenient' | 'moderate' | 'strict';
    customRules: string[];
}
export interface CommitHistory {
    hash: string;
    message: string;
    author: string;
    date: Date;
    files: string[];
}
export interface CommitMessage {
    title: string;
    body?: string;
    type: string;
    scope?: string;
    confidence: number;
    reasoning: string;
    warnings?: string[];
    recommendations?: string[];
}
export interface DiffExplanation {
    summary: string;
    impact: ImpactAnalysis;
    technicalDetails: string[];
    businessContext?: string;
    migrationNotes?: string[];
    architecturalConsiderations?: string[];
    complexityWarnings?: any[];
    recommendations?: string[];
    compressionNote?: string;
}
export interface ImpactAnalysis {
    risk: 'low' | 'medium' | 'high' | 'critical';
    scope: 'local' | 'module' | 'system';
    affectedComponents: string[];
    potentialIssues: string[];
    testingRecommendations: string[];
}
export interface PRDescription {
    title: string;
    description: string;
    checklist: string[];
    testingInstructions: string[];
    breakingChanges?: string[];
    dependencies?: string[];
}
export interface CodeReview {
    overall: ReviewSummary;
    suggestions: ReviewSuggestion[];
    compliments: string[];
    blockers: ReviewSuggestion[];
}
export interface ReviewSummary {
    rating: 'excellent' | 'good' | 'needs-work' | 'major-issues';
    confidence: number;
    summary: string;
}
export interface ReviewSuggestion {
    file: string;
    line?: number;
    type: 'bug' | 'performance' | 'security' | 'maintainability' | 'style';
    severity: 'info' | 'warning' | 'error';
    message: string;
    suggestion?: string;
    confidence: number;
}
export interface AIProvider {
    readonly name: string;
    readonly capabilities: AICapabilities;
    generateCommitMessage(context: CommitContext): Promise<CommitMessage>;
    refineCommitMessage(originalMessage: CommitMessage, refinementInstruction: string, context: CommitContext): Promise<CommitMessage>;
    explainChanges(context: CommitContext): Promise<DiffExplanation>;
    createPRDescription(context: CommitContext): Promise<PRDescription>;
    reviewCode(context: CommitContext, persona: ReviewPersona): Promise<CodeReview>;
    generateDocumentation(type: string, context: any, config: any): Promise<string>;
    performCustomAnalysis(prompt: string, instructions: string, maxTokens?: number, temperature?: number): Promise<string | null>;
    analyzeCodeQuality?(context: CommitContext): Promise<CodeQualityAnalysis>;
    suggestRefactoring?(context: CommitContext): Promise<RefactoringSuggestion[]>;
    detectSecurityIssues?(context: CommitContext): Promise<SecurityAnalysis>;
    generateTests?(context: CommitContext): Promise<TestSuggestion[]>;
    estimateComplexity?(context: CommitContext): Promise<ComplexityAnalysis>;
}
export interface AICapabilities {
    maxTokens: number;
    supportsStreaming: boolean;
    supportsJsonMode: boolean;
    supportsToolUse: boolean;
    supportsFunctionCalling: boolean;
    supportsVision: boolean;
    supportsCaching: boolean;
    contextWindow: number;
    models: string[];
    features: AIFeature[];
}
export type AIFeature = 'code-analysis' | 'documentation-generation' | 'test-generation' | 'security-analysis' | 'performance-analysis' | 'refactoring-suggestions' | 'architectural-insights' | 'best-practices' | 'code-review' | 'commit-messages' | 'pr-descriptions';
export interface CodeQualityAnalysis {
    overallScore: number;
    metrics: {
        maintainability: number;
        readability: number;
        testability: number;
        performance: number;
        security: number;
    };
    issues: QualityIssue[];
    suggestions: string[];
    positiveAspects: string[];
}
export interface QualityIssue {
    type: 'error' | 'warning' | 'suggestion';
    category: 'maintainability' | 'performance' | 'security' | 'readability' | 'testing';
    file: string;
    line?: number;
    message: string;
    suggestion: string;
    confidence: number;
}
export interface RefactoringSuggestion {
    type: 'extract-method' | 'extract-class' | 'rename' | 'move' | 'simplify' | 'optimize';
    file: string;
    startLine: number;
    endLine: number;
    description: string;
    reasoning: string;
    estimatedEffort: 'low' | 'medium' | 'high';
    benefits: string[];
    risks: string[];
    example?: string;
}
export interface SecurityAnalysis {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    vulnerabilities: SecurityVulnerability[];
    recommendations: SecurityRecommendation[];
    compliance: ComplianceCheck[];
}
export interface SecurityVulnerability {
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    file: string;
    line?: number;
    description: string;
    impact: string;
    mitigation: string;
    cwe?: string;
    cvss?: number;
}
export interface SecurityRecommendation {
    category: 'authentication' | 'authorization' | 'encryption' | 'input-validation' | 'logging' | 'configuration';
    priority: 'low' | 'medium' | 'high';
    description: string;
    implementation: string;
    resources: string[];
}
export interface ComplianceCheck {
    standard: 'OWASP' | 'SOC2' | 'GDPR' | 'HIPAA' | 'PCI-DSS';
    status: 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown';
    details: string;
    requirements: string[];
}
export interface TestSuggestion {
    type: 'unit' | 'integration' | 'e2e' | 'performance' | 'security';
    file: string;
    testFile: string;
    description: string;
    testCode: string;
    coverage: {
        lines: number[];
        functions: string[];
        branches: string[];
    };
    priority: 'low' | 'medium' | 'high';
    reasoning: string;
}
export interface ComplexityAnalysis {
    overallComplexity: 'low' | 'medium' | 'high' | 'very-high';
    metrics: {
        cyclomaticComplexity: number;
        cognitiveComplexity: number;
        nestingDepth: number;
        linesOfCode: number;
        maintainabilityIndex: number;
    };
    hotspots: ComplexityHotspot[];
    recommendations: string[];
}
export interface ComplexityHotspot {
    file: string;
    function: string;
    line: number;
    complexity: number;
    type: 'cyclomatic' | 'cognitive' | 'nesting';
    suggestion: string;
}
export interface CacheEntry<T> {
    key: string;
    value: T;
    timestamp: number;
    ttl: number;
    similarity?: number;
}
export interface AIConfig {
    provider: 'openai' | 'anthropic' | 'local';
    apiKey?: string;
    model: string;
    maxTokens: number;
    temperature: number;
    anthropic?: {
        version?: string;
        beta?: string[];
        toolUse?: boolean;
        caching?: boolean;
    };
    openai?: {
        organization?: string;
        project?: string;
        responseFormat?: 'text' | 'json_object';
        seed?: number;
    };
    retry?: {
        maxRetries: number;
        backoffMultiplier: number;
        maxBackoffSeconds: number;
    };
    timeout?: number;
}
export interface MastroConfig {
    ai: AIConfig;
    git: {
        defaultBranch: string;
        includeUntracked: boolean;
        maxDiffSize: number;
    };
    cache: {
        enabled: boolean;
        ttl: number;
        maxSize: number;
    };
    team: TeamPatterns;
    ui: {
        spinner: boolean;
        colors: boolean;
        interactive: boolean;
    };
}
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success' | 'dim';
export type ChangeType = 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'test' | 'chore';
export interface SemanticChange {
    type: ChangeType;
    scope?: string;
    description: string;
    files: string[];
    confidence: number;
    reasoning: string;
}
export interface DevelopmentSession {
    id: string;
    startTime: Date;
    baseCommit: string;
    baseBranch: string;
    workingChanges: GitChange[];
    stagedChanges: GitChange[];
    cumulativeStats: SessionStats;
    riskAssessment: SessionRisk;
    patterns: SessionPattern[];
}
export interface SessionStats {
    totalFiles: number;
    totalInsertions: number;
    totalDeletions: number;
    changedLines: number;
    complexity: 'low' | 'medium' | 'high' | 'critical';
    duration: number;
}
export interface SessionRisk {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: RiskFactor[];
    recommendations: string[];
    splitSuggestions?: string[];
}
export interface RiskFactor {
    type: 'size' | 'complexity' | 'scope' | 'breaking' | 'security';
    description: string;
    impact: 'low' | 'medium' | 'high';
}
export interface SessionPattern {
    type: 'rapid-iteration' | 'feature-branch' | 'refactoring' | 'bug-fixing';
    confidence: number;
    evidence: string[];
}
export interface StreamingResponse<T> {
    id: string;
    type: 'chunk' | 'complete' | 'error';
    data?: Partial<T>;
    error?: string;
    progress?: number;
}
export interface LoadingState {
    status: 'idle' | 'loading' | 'streaming' | 'complete' | 'error';
    message: string;
    progress?: number;
    animated: boolean;
}
export interface StreamingOptions {
    enabled: boolean;
    chunkHandler: (chunk: StreamingResponse<any>) => void;
    progressHandler?: (progress: number) => void;
    errorHandler?: (error: string) => void;
}
export interface SessionReview extends CodeReview {
    sessionId: string;
    scope: 'working' | 'staged' | 'session';
    actionableItems: ActionableItem[];
    learningPoints: string[];
    workflowSuggestions: WorkflowSuggestion[];
}
export interface ActionableItem {
    id: string;
    type: 'todo' | 'fix' | 'improvement' | 'warning';
    priority: 'low' | 'medium' | 'high' | 'critical';
    file: string;
    line?: number;
    title: string;
    description: string;
    suggestion?: string;
    estimatedEffort: 'quick' | 'medium' | 'substantial';
}
export interface WorkflowSuggestion {
    type: 'commit-split' | 'refactoring' | 'testing' | 'documentation';
    description: string;
    benefit: string;
    effort: 'low' | 'medium' | 'high';
}
export interface PRTemplate {
    name: string;
    type: 'feature' | 'bugfix' | 'hotfix' | 'refactor' | 'docs';
    title: string;
    description: string;
    sections: PRSection[];
    checklist: ChecklistItem[];
    reviewers?: string[];
    labels?: string[];
}
export interface PRSection {
    title: string;
    content: string;
    required: boolean;
    placeholder?: string;
}
export interface ChecklistItem {
    id: string;
    text: string;
    required: boolean;
    category: 'development' | 'testing' | 'documentation' | 'review';
}
export interface MigrationDetection {
    detected: boolean;
    type?: 'breaking' | 'database' | 'api' | 'dependency';
    description: string;
    impact: ImpactAnalysis;
    migrationSteps?: string[];
}
export interface SmartPRContext extends CommitContext {
    prTemplate: PRTemplate;
    migrationInfo: MigrationDetection;
    relatedPRs: string[];
    reviewComplexity: 'simple' | 'moderate' | 'complex' | 'extensive';
}
export interface StreamingAIProvider extends AIProvider {
    reviewSession(session: DevelopmentSession, persona: ReviewPersona): Promise<SessionReview>;
    streamReviewSession(session: DevelopmentSession, persona: ReviewPersona, options: StreamingOptions): AsyncGenerator<StreamingResponse<SessionReview>>;
    generatePRFromSession(session: DevelopmentSession, template?: PRTemplate): Promise<PRDescription>;
}
export interface DocumentationContext {
    repository: RepoContext;
    projectStructure: ProjectStructure;
    codeAnalysis: CodeAnalysis;
    workingDir: string;
}
export interface ProjectStructure {
    directories: DirectoryInfo[];
    files: FileInfo[];
    entryPoints: string[];
    configFiles: string[];
    testFiles: string[];
    docFiles: string[];
}
export interface DirectoryInfo {
    path: string;
    type: 'source' | 'test' | 'config' | 'docs' | 'build' | 'assets';
    files: string[];
    description?: string;
}
export interface FunctionInfo {
    name: string;
    signature?: string;
    lineNumber?: number;
    isAsync: boolean;
    complexity: 'low' | 'medium' | 'high';
}
export interface ClassInfo {
    name: string;
    methods: string[];
    properties: string[];
    extends?: string;
    implements?: string[];
}
export interface FileInfo {
    path: string;
    type: 'source' | 'test' | 'config' | 'docs' | 'build';
    language: string;
    framework?: string;
    exports: ExportInfo[];
    imports: ImportInfo[];
    functions: FunctionInfo[];
    classes: ClassInfo[];
    apis: ApiEndpoint[];
}
export interface ExportInfo {
    name: string;
    type: 'function' | 'class' | 'variable' | 'type' | 'interface';
    isDefault: boolean;
    signature?: string;
    description?: string;
    examples?: string[];
}
export interface ImportInfo {
    module: string;
    imports: string[];
    isLocalImport: boolean;
    usage: string[];
}
export interface ApiEndpoint {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    handler: string;
    parameters?: ApiParameter[];
    responses?: ApiResponse[];
    middleware?: string[];
    description?: string;
}
export interface ApiParameter {
    name: string;
    type: 'path' | 'query' | 'body' | 'header';
    dataType: string;
    required: boolean;
    description?: string;
    example?: string;
}
export interface ApiResponse {
    status: number;
    description: string;
    schema?: string;
    example?: any;
}
export interface CodeAnalysis {
    complexity: ProjectComplexity;
    patterns: ArchitecturalPattern[];
    dependencies: DependencyInfo[];
    userFlows: UserFlow[];
    dataModels: DataModel[];
}
export interface ProjectComplexity {
    overall: 'simple' | 'moderate' | 'complex' | 'enterprise';
    metrics: {
        totalFiles: number;
        totalLines: number;
        cyclomaticComplexity: number;
        dependencyDepth: number;
        apiEndpoints: number;
    };
    recommendations: string[];
}
export interface ArchitecturalPattern {
    name: string;
    type: 'mvc' | 'mvp' | 'mvvm' | 'microservices' | 'layered' | 'event-driven' | 'component-based';
    confidence: number;
    evidence: string[];
    components: string[];
}
export interface DependencyInfo {
    name: string;
    version: string;
    type: 'production' | 'development' | 'peer';
    purpose: string;
    critical: boolean;
    alternatives?: string[];
}
export interface UserFlow {
    name: string;
    steps: UserFlowStep[];
    entryPoints: string[];
    exitPoints: string[];
    complexity: 'simple' | 'moderate' | 'complex';
}
export interface UserFlowStep {
    action: string;
    component: string;
    description: string;
    dependencies?: string[];
}
export interface DataModel {
    name: string;
    type: 'entity' | 'dto' | 'interface' | 'enum';
    fields: DataModelField[];
    relationships: string[];
    file: string;
}
export interface DataModelField {
    name: string;
    type: string;
    required: boolean;
    description?: string;
    validation?: string[];
}
export interface DocumentationOutput {
    type: DocumentationType;
    title: string;
    content: string;
    filePath: string;
    sections: DocumentationSection[];
    diagrams?: MermaidDiagram[];
    references?: string[];
}
export interface DocumentationSection {
    title: string;
    content: string;
    level: number;
    subsections?: DocumentationSection[];
}
export interface MermaidDiagram {
    type: 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'journey' | 'gitgraph' | 'mindmap' | 'timeline' | 'block' | 'gantt';
    title: string;
    content: string;
    description: string;
    metadata?: {
        direction?: 'TD' | 'TB' | 'BT' | 'RL' | 'LR';
        theme?: 'default' | 'dark' | 'forest' | 'neutral';
        config?: Record<string, any>;
    };
}
export type DocumentationType = 'api' | 'architecture' | 'user-guide' | 'readme' | 'component' | 'deployment' | 'troubleshooting' | 'changelog' | 'contributing' | 'security' | 'performance' | 'testing' | 'workflow' | 'integration' | 'all';
export interface DocumentationTemplate {
    type: DocumentationType;
    name: string;
    structure: TemplateSection[];
    requiredData: string[];
    optionalData: string[];
}
export interface TemplateSection {
    title: string;
    required: boolean;
    placeholder: string;
    type: 'text' | 'list' | 'table' | 'code' | 'mermaid';
    dataSource?: string;
}
export interface DocumentationConfig {
    outputDirectory: string;
    types: DocumentationType[];
    templates: Record<DocumentationType, string>;
    includePrivate: boolean;
    includeTodos: boolean;
    generateMermaid: boolean;
    autoUpdate: boolean;
}
export interface BoundaryMetrics {
    boundaryId: string;
    processingTime: number;
    reviewScore?: number;
    linesChanged: number;
    filesModified: number;
    complexity: 'low' | 'medium' | 'high';
    commitHash?: string;
}
export interface WorkflowContext {
    sessionId: string;
    boundaries: any[];
    currentBoundaryIndex: number;
    reviewFindings: any[];
    commitHashes: string[];
    metrics: BoundaryMetrics[];
    startTime: number;
    settings: {
        skipReview?: boolean;
        skipDocs?: boolean;
        skipPR?: boolean;
        skipAnalytics?: boolean;
        autoMode?: boolean;
    };
}
export interface WorkflowCheckpoint {
    contextId: string;
    step: 'split' | 'review' | 'commit' | 'docs' | 'pr' | 'analytics';
    timestamp: number;
    data: any;
}
export interface FocusSession {
    id: string;
    startTime: number;
    lastActivityTime: number;
    totalFocusTime: number;
    breakTime: number;
    filesModified: number;
    linesChanged: number;
    productivity: {
        score: number;
        streak: number;
        peakPeriod: string | null;
    };
    metrics: {
        keystrokes: number;
        activeMinutes: number;
        idleMinutes: number;
        flowState: boolean;
    };
    initialState: {
        changedFiles: number;
        insertions: number;
        deletions: number;
    };
}
//# sourceMappingURL=index.d.ts.map