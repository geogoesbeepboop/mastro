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
  name: string;
  generateCommitMessage(context: CommitContext): Promise<CommitMessage>;
  refineCommitMessage(originalMessage: CommitMessage, refinementInstruction: string, context: CommitContext): Promise<CommitMessage>;
  explainChanges(context: CommitContext): Promise<DiffExplanation>;
  createPRDescription(context: CommitContext): Promise<PRDescription>;
  reviewCode(context: CommitContext, persona: ReviewPersona): Promise<CodeReview>;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  similarity?: number;
}

export interface MastroConfig {
  ai: {
    provider: 'openai' | 'anthropic' | 'local';
    apiKey?: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
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

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type ChangeType = 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'test' | 'chore';

export interface SemanticChange {
  type: ChangeType;
  scope?: string;
  description: string;
  files: string[];
  confidence: number;
  reasoning: string;
}

// Phase 3: Session Tracking Interfaces
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
  duration: number; // minutes
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

// Phase 3: Streaming Interfaces
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

// Phase 3: Enhanced Review Interfaces
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

// Phase 3: PR Management Interfaces
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

// Phase 3: Enhanced AI Provider Interface
export interface StreamingAIProvider extends AIProvider {
  reviewSession(session: DevelopmentSession, persona: ReviewPersona): Promise<SessionReview>;
  streamReviewSession(session: DevelopmentSession, persona: ReviewPersona, options: StreamingOptions): AsyncGenerator<StreamingResponse<SessionReview>>;
  generatePRFromSession(session: DevelopmentSession, template?: PRTemplate): Promise<PRDescription>;
}

// Documentation Generation Interfaces
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
  type: 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'journey';
  title: string;
  content: string;
  description: string;
}

export type DocumentationType = 'api' | 'architecture' | 'user-guide' | 'readme' | 'component' | 'deployment';

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