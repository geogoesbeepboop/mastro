# Mastro API Reference

> **Complete interface documentation and developer reference for Mastro AI-powered Git CLI**

This document provides comprehensive API documentation for all interfaces, classes, and methods in the Mastro system.

## 📚 Table of Contents

1. [Core Interfaces](#core-interfaces)
2. [Configuration Schema](#configuration-schema)
3. [AI Provider Interface](#ai-provider-interface)
4. [Git Analysis Types](#git-analysis-types)
5. [Review System Types](#review-system-types)
6. [Session Management Types](#session-management-types)
7. [CLI Command Options](#cli-command-options)
8. [Plugin Development](#plugin-development)
9. [Integration Patterns](#integration-patterns)

## 🔧 Core Interfaces

### `MastroConfig`
Main configuration interface for the entire system.

```typescript
interface MastroConfig {
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
```

**Usage:**
```typescript
const config = await loadConfig();
const aiClient = new AIClient(config.ai);
```

### `CommitContext`
Primary context object for commit operations containing all necessary information for AI analysis.

```typescript
interface CommitContext {
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
```

**Properties:**
- `changes`: Array of file changes with detailed diff information
- `branch`: Current Git branch name
- `repository`: Repository context including patterns and history
- `staged`: Whether changes are staged (true) or working directory (false)
- `workingDir`: Absolute path to Git repository root
- `metadata`: Aggregated statistics about the changes

### `GitChange`
Detailed representation of a single file change.

```typescript
interface GitChange {
  file: string;
  type: 'added' | 'modified' | 'deleted' | 'renamed';
  insertions: number;
  deletions: number;
  oldFile?: string;        // For renamed files
  hunks: GitHunk[];
}
```

### `GitHunk`
Individual diff hunk within a file change.

```typescript
interface GitHunk {
  header: string;          // e.g., "@@ -1,4 +1,6 @@"
  lines: GitLine[];
  startLine: number;
  endLine: number;
}
```

### `GitLine`
Individual line within a diff hunk.

```typescript
interface GitLine {
  content: string;
  type: 'added' | 'removed' | 'context';
  lineNumber?: number;
}
```

## ⚙️ Configuration Schema

### `TeamPatterns`
Team-specific patterns and preferences.

```typescript
interface TeamPatterns {
  commitStyle: 'conventional' | 'custom';
  prefixes: string[];
  maxLength: number;
  commonPhrases: string[];
  reviewPersona: ReviewPersona;
}
```

**Example:**
```json
{
  "commitStyle": "conventional",
  "prefixes": ["feat", "fix", "docs", "refactor", "test", "chore"],
  "maxLength": 72,
  "commonPhrases": ["implement", "update", "fix", "enhance"],
  "reviewPersona": {
    "name": "Senior Engineer",
    "focus": ["maintainability", "performance"],
    "strictness": "moderate",
    "customRules": []
  }
}
```

### `ReviewPersona`
Configuration for code review focus and strictness.

```typescript
interface ReviewPersona {
  name: string;
  focus: ('security' | 'performance' | 'maintainability' | 'testing')[];
  strictness: 'lenient' | 'moderate' | 'strict';
  customRules: string[];
}
```

**Predefined Personas:**
- **Security Engineer**: Focus on security, strict standards
- **Performance Engineer**: Focus on performance, moderate standards  
- **Senior Engineer**: Focus on maintainability, moderate standards
- **Testing Engineer**: Focus on testing, strict standards

## 🤖 AI Provider Interface

### `AIProvider`
Core interface that all AI providers must implement.

```typescript
interface AIProvider {
  name: string;
  generateCommitMessage(context: CommitContext): Promise<CommitMessage>;
  explainChanges(context: CommitContext): Promise<DiffExplanation>;
  createPRDescription(context: CommitContext): Promise<PRDescription>;
  reviewCode(context: CommitContext, persona: ReviewPersona): Promise<CodeReview>;
}
```

### `AIClient`
Main client class for interacting with AI providers.

```typescript
class AIClient {
  constructor(config: AIConfig);
  
  async generateCommitMessage(context: CommitContext): Promise<CommitMessage>;
  async explainChanges(context: CommitContext): Promise<DiffExplanation>;
  async createPRDescription(context: CommitContext): Promise<PRDescription>;
  async reviewCode(context: CommitContext, persona: ReviewPersona): Promise<CodeReview>;
}
```

**Usage:**
```typescript
const aiClient = new AIClient({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4',
  maxTokens: 4096,
  temperature: 0.3
});

const commitMessage = await aiClient.generateCommitMessage(context);
```

## 📊 Git Analysis Types

### `CommitMessage`
Generated commit message with metadata.

```typescript
interface CommitMessage {
  title: string;
  body?: string;
  type: string;           // Conventional commit type
  scope?: string;         // Optional scope
  confidence: number;     // 0-1 confidence score
  reasoning: string;      // Why this message was chosen
  warnings?: string[];    // Potential issues
  recommendations?: string[]; // Suggestions for improvement
}
```

### `DiffExplanation`
Comprehensive explanation of code changes.

```typescript
interface DiffExplanation {
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
```

### `ImpactAnalysis`
Analysis of change impact on the system.

```typescript
interface ImpactAnalysis {
  risk: 'low' | 'medium' | 'high' | 'critical';
  scope: 'local' | 'module' | 'system';
  affectedComponents: string[];
  potentialIssues: string[];
  testingRecommendations: string[];
}
```

### `PRDescription`
Generated pull request description.

```typescript
interface PRDescription {
  title: string;
  description: string;
  checklist: string[];
  testingInstructions: string[];
  breakingChanges?: string[];
  dependencies?: string[];
}
```

## 🔍 Review System Types

### `SessionReview`
Comprehensive review of a development session.

```typescript
interface SessionReview {
  sessionId: string;
  timestamp: Date;
  scope: 'working' | 'staged' | 'both';
  overall: ReviewSummary;
  suggestions: ReviewSuggestion[];
  actionableItems: ActionableItem[];
  blockers: ReviewSuggestion[];
  workflowSuggestions: WorkflowSuggestion[];
  learningPoints: string[];
  compliments: string[];
  persona: ReviewPersona;
  stats: {
    filesAnalyzed: number;
    linesAnalyzed: number;
    issuesFound: number;
    criticalIssues: number;
  };
}
```

### `ReviewSummary`
Overall assessment of code quality.

```typescript
interface ReviewSummary {
  rating: 'excellent' | 'good' | 'needs-work' | 'major-issues';
  confidence: number;
  summary: string;
}
```

### `ReviewSuggestion`
Individual code review suggestion.

```typescript
interface ReviewSuggestion {
  file: string;
  line?: number;
  type: 'bug' | 'performance' | 'security' | 'maintainability' | 'style';
  severity: 'info' | 'warning' | 'error';
  message: string;
  suggestion?: string;
  confidence: number;
}
```

### `ActionableItem`
Specific actionable improvement item.

```typescript
interface ActionableItem {
  id: string;
  type: 'todo' | 'fix' | 'improvement' | 'warning';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  file?: string;
  line?: number;
  suggestion?: string;
  estimatedEffort: 'quick' | 'medium' | 'substantial';
  tags: string[];
}
```

### `WorkflowSuggestion`
Development workflow improvement suggestion.

```typescript
interface WorkflowSuggestion {
  type: 'commit-split' | 'refactoring' | 'testing' | 'documentation';
  description: string;
  benefit: string;
  effort: 'low' | 'medium' | 'high';
}
```

## 📊 Session Management Types

### `DevelopmentSession`
Current development session state.

```typescript
interface DevelopmentSession {
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
```

### `SessionStats`
Statistics for the current development session.

```typescript
interface SessionStats {
  totalFiles: number;
  totalInsertions: number;
  totalDeletions: number;
  changedLines: number;
  complexity: 'low' | 'medium' | 'high' | 'critical';
  duration: number;        // Minutes since session start
}
```

### `SessionRisk`
Risk assessment for the current session.

```typescript
interface SessionRisk {
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{
    type: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
  }>;
  recommendations: string[];
  score: number;           // 0-100 risk score
}
```

### `SessionPattern`
Detected development patterns.

```typescript
interface SessionPattern {
  type: 'rapid-iteration' | 'feature-branch' | 'refactoring' | 'bug-fixing';
  confidence: number;      // 0-1 confidence score
  evidence: string[];      // Supporting evidence
}
```

## 📚 Documentation Engine Types

### `DocumentationType`
Types of documentation that can be generated.

```typescript
type DocumentationType = 'api' | 'architecture' | 'user-guide' | 'readme' | 'component' | 'deployment';
```

### `DocumentationConfig`
Configuration object for documentation generation.

```typescript
interface DocumentationConfig {
  outputDirectory: string;
  types: DocumentationType[];
  templates: Record<DocumentationType, string>;
  includePrivate: boolean;
  includeTodos: boolean;
  generateMermaid: boolean;
  autoUpdate: boolean;
}
```

**Usage:**
```typescript
const config: DocumentationConfig = {
  outputDirectory: './docs',
  types: ['api', 'architecture', 'user-guide'],
  templates: {
    'api': 'default-api-template',
    'architecture': 'default-arch-template',
    'user-guide': 'default-guide-template'
  },
  includePrivate: false,
  includeTodos: false,
  generateMermaid: true,
  autoUpdate: false
};
```

### `DocumentationOutput`
Generated documentation with metadata.

```typescript
interface DocumentationOutput {
  type: DocumentationType;
  title: string;
  content: string;
  filePath: string;
  sections?: DocumentationSection[];
  diagrams?: MermaidDiagram[];
  references?: string[];
}
```

### `DocumentationSection`
Individual section within generated documentation.

```typescript
interface DocumentationSection {
  title: string;
  content: string;
  level: number;  // Header level (1-6)
}
```

### `MermaidDiagram`
Mermaid diagram embedded in documentation.

```typescript
interface MermaidDiagram {
  type: 'flowchart' | 'sequence' | 'class' | 'state' | 'gantt';
  title: string;
  description: string;
  content: string;
}
```

### `DocumentationContext`
Complete context for documentation generation.

```typescript
interface DocumentationContext {
  repository: RepoContext;
  projectStructure: ProjectStructure;
  codeAnalysis: CodeAnalysis;
  workingDir: string;
}
```

### `ProjectStructure`
Analyzed project structure for documentation.

```typescript
interface ProjectStructure {
  directories: DirectoryInfo[];
  files: FileInfo[];
  entryPoints: string[];
  configFiles: string[];
  testFiles: string[];
  docFiles: string[];
}
```

### `DirectoryInfo`
Information about project directories.

```typescript
interface DirectoryInfo {
  path: string;
  type: 'source' | 'test' | 'config' | 'docs' | 'build' | 'assets';
  files: string[];
  description?: string;
}
```

### `FileInfo`
Detailed file analysis for documentation generation.

```typescript
interface FileInfo {
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
```

### `ExportInfo`
Information about exported functions, classes, or variables.

```typescript
interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'variable' | 'interface' | 'type';
  isDefault: boolean;
  signature?: string;
}
```

### `ImportInfo`
Information about file imports and dependencies.

```typescript
interface ImportInfo {
  module: string;
  imports: string[];
  isLocalImport: boolean;
  usage: string[];
}
```

### `FunctionInfo`
Detailed function analysis for API documentation.

```typescript
interface FunctionInfo {
  name: string;
  signature: string;
  isAsync: boolean;
  complexity: 'low' | 'medium' | 'high';
}
```

### `ClassInfo`
Class structure for component documentation.

```typescript
interface ClassInfo {
  name: string;
  methods: string[];
  properties: string[];
  extends?: string;
  implements?: string[];
}
```

### `ApiEndpoint`
REST API endpoint information.

```typescript
interface ApiEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  handler: string;
  description?: string;
  parameters?: Array<{
    name: string;
    dataType: string;
    required: boolean;
    description?: string;
  }>;
  responses?: Array<{
    status: number;
    description: string;
  }>;
}
```

### `CodeAnalysis`
Comprehensive code analysis results.

```typescript
interface CodeAnalysis {
  complexity: ProjectComplexity;
  patterns: ArchitecturalPattern[];
  dependencies: DependencyInfo[];
  userFlows: UserFlow[];
  dataModels: DataModel[];
}
```

### `ProjectComplexity`
Project complexity assessment for documentation planning.

```typescript
interface ProjectComplexity {
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
```

### `ArchitecturalPattern`
Detected architectural patterns for documentation.

```typescript
interface ArchitecturalPattern {
  name: string;
  type: string;
  confidence: number;  // 0-1
  evidence: string[];
  components: string[];
}
```

### `DataModel`
Database/data model information.

```typescript
interface DataModel {
  name: string;
  type: 'entity' | 'dto' | 'schema' | 'interface';
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
  }>;
  relationships: string[];
  file: string;
}
```

### `UserFlow`
User workflow analysis for documentation.

```typescript
interface UserFlow {
  name: string;
  steps: Array<{
    action: string;
    component: string;
    description: string;
  }>;
  entryPoints: string[];
  exitPoints: string[];
  complexity: 'simple' | 'moderate' | 'complex';
}
```

## 🧩 Phase 4A: Smart Commit Splitting Types

### `CommitBoundary`
Logical commit boundary detected by AI analysis.

```typescript
interface CommitBoundary {
  id: string;
  files: GitChange[];
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  estimatedComplexity: number;         // 0-10 complexity score
  dependencies: string[];              // IDs of other boundaries this depends on
  theme: string;                       // What this commit is about
}
```

### `StagingStrategy`
Recommended strategy for staging and committing changes.

```typescript
interface StagingStrategy {
  strategy: 'progressive' | 'parallel' | 'sequential';
  commits: Array<{
    boundary: CommitBoundary;
    suggestedMessage: {
      title: string;
      type: string;
      body?: string;
    };
    rationale: string;
    risk: 'low' | 'medium' | 'high';
    estimatedTime: string;             // e.g., "5 minutes"
  }>;
  warnings: string[];
  overallRisk: 'low' | 'medium' | 'high';
}
```

### `FileRelationship`
Relationships between files for boundary detection.

```typescript
interface FileRelationship {
  file1: string;
  file2: string;
  relationshipType: 'import' | 'similar_changes' | 'shared_function' | 'test_pair' | 'config_related';
  strength: number;                    // 0-1, how strongly related
}
```

## 📊 Phase 4A: Session Analytics Types

### `SessionAnalytics`
Comprehensive session analytics and insights.

```typescript
interface SessionAnalytics {
  sessionId: string;
  timestamp: Date;
  duration: number;                    // minutes
  productivity: ProductivityMetrics;
  focus: FocusMetrics;
  patterns: DetectedPattern[];
  quality: QualityMetrics;
  testingSuggestions: TestingSuggestion[];
}
```

### `ProductivityMetrics`
Detailed productivity measurements.

```typescript
interface ProductivityMetrics {
  linesPerMinute: number;
  filesModifiedPerHour: number;
  commitFrequency: number;             // commits per hour
  refactoringRatio: number;            // % of changes that are refactoring
  velocityScore: number;               // 0-100 overall productivity score
  peakHours: number[];                 // hours of day when most productive
  optimalSessionLength: number;        // minutes
}
```

### `FocusMetrics`
Focus and concentration measurements.

```typescript
interface FocusMetrics {
  focusScore: number;                  // 0-100 based on consistency of changes
  distractionEvents: number;           // context switches detected
  deepWorkSessions: number;            // uninterrupted work periods > 25 minutes
  contextSwitchFrequency: number;      // switches per hour
  focusSessionLength: number;          // average deep work session length
}
```

### `DetectedPattern`
Development patterns identified by AI analysis.

```typescript
interface DetectedPattern {
  type: 'tdd' | 'refactor_first' | 'feature_branch' | 'hotfix' | 'spike' | 'cleanup';
  confidence: number;                  // 0-1
  evidence: string[];
  recommendations: string[];
  impact: 'positive' | 'neutral' | 'negative';
}
```

### `QualityMetrics`
Code quality trend analysis.

```typescript
interface QualityMetrics {
  testCoverageIncrease: number;        // % increase in tests
  codeComplexityTrend: 'improving' | 'stable' | 'degrading';
  documentationScore: number;          // 0-100 documentation quality
  securityImprovements: number;        // security-related changes
  performanceConsiderations: number;   // performance-related changes
  maintainabilityScore: number;        // 0-100 maintainability assessment
}
```

### `TestingSuggestion`
AI-generated testing recommendations.

```typescript
interface TestingSuggestion {
  type: 'unit_test' | 'integration_test' | 'e2e_test' | 'performance_test';
  targetFile: string;
  suggestedTestFile: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  estimatedEffort: string;
  testTemplate?: string;
}
```

## 🛡️ Phase 4A: Pre-commit Hook Types

### `HookConfig`
Configuration for intelligent pre-commit hooks.

```typescript
interface HookConfig {
  type: 'pre-commit' | 'pre-push' | 'commit-msg';
  enabled: boolean;
  strictness: 'lenient' | 'moderate' | 'strict';
  criticalThreshold: number;           // 0-10, number of critical issues to block
  highThreshold: number;               // number of high priority issues to warn
  persona: ReviewPersona;
  customRules: string[];
  skipPatterns: string[];              // files/patterns to skip
  timeoutSeconds: number;
}
```

### `HookValidationResult`
Results from pre-commit hook validation.

```typescript
interface HookValidationResult {
  passed: boolean;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  blockers: string[];                  // Critical issues that block commit
  warnings: string[];                  // High/medium issues
  executionTime: number;               // milliseconds
  suggestions: string[];               // Improvement recommendations
}
```

### `ValidationIssue`
Individual validation issue detected by hooks.

```typescript
interface ValidationIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'security' | 'performance' | 'maintainability' | 'testing' | 'style';
  file: string;
  line?: number;
  column?: number;
  message: string;
  rule: string;
  suggestion?: string;
  autoFixable: boolean;
}
```

## 🚀 CLI Command Options

### `mastro commit`

```typescript
interface CommitFlags {
  'dry-run': boolean;      // Preview without committing
  interactive: boolean;    // Enable interactive refinement
  template: string;        // Use specific commit template
  learn: boolean;          // Learn from this commit
  'no-cache': boolean;     // Skip cache lookup
}
```

### `mastro explain`

```typescript
interface ExplainFlags {
  impact: boolean;         // Focus on business/technical impact
  audience: 'junior' | 'senior' | 'business' | 'technical';
  format: 'terminal' | 'markdown' | 'json';
  'max-commits': number;   // Limit commits in range analysis
  'no-cache': boolean;     // Skip cache lookup
}
```

### `mastro review`

```typescript
interface ReviewFlags {
  stream: boolean;         // Enable streaming responses
  persona: string;         // Review persona name
  strictness: 'lenient' | 'moderate' | 'strict';
  'actionable-only': boolean; // Show only actionable items
  priority: 'critical' | 'high' | 'medium' | 'low';
  format: 'terminal' | 'json' | 'markdown' | 'html';
  interactive: boolean;    // Enable interactive mode
  'no-cache': boolean;     // Skip cache lookup
}
```

### `mastro pr create`

```typescript
interface PRCreateFlags {
  template: 'feature' | 'bugfix' | 'hotfix' | 'refactor' | 'docs' | 'auto';
  title: string;           // Custom PR title
  draft: boolean;          // Create as draft PR
  'migration-check': boolean; // Perform migration detection
  'base-branch': string;   // Base branch for PR
  'head-branch': string;   // Head branch for PR
  format: 'terminal' | 'json' | 'markdown';
  'skip-review': boolean;  // Skip pre-PR code review
  push: boolean;           // Push branch before creating PR
  'dry-run': boolean;      // Preview without creating
}
```

### `mastro split` - Phase 4A
Smart commit splitting and auto-staging.

```typescript
interface SplitFlags {
  'auto-stage': boolean;               // Automatically stage files according to boundaries
  'dry-run': boolean;                  // Show analysis without making changes
  interactive: boolean;                // Enable boundary customization
  format: 'terminal' | 'json' | 'markdown';
  'complexity-threshold': number;      // Minimum complexity for boundary detection
  ignore: string;                      // File patterns to ignore (glob)
  force: boolean;                      // Force boundary detection for small changes
}
```

### `mastro analytics` - Phase 4A
Enhanced session intelligence and productivity analytics.

```typescript
interface AnalyticsFlags {
  insights: boolean;                   // Show personalized insights and recommendations
  'focus-mode': boolean;               // Enable focus mode for distraction-free development
  trends: boolean;                     // Show productivity trends over time
  period: 'day' | 'week' | 'month' | 'quarter';
  export: string;                      // Export analytics to file
  'update-current': boolean;           // Update current session data
  format: 'terminal' | 'json' | 'markdown';
}
```

### `mastro hooks` - Phase 4A
Pre-commit hook intelligence and management.

```typescript
interface HooksFlags {
  strictness: 'lenient' | 'moderate' | 'strict';
  persona: 'security' | 'performance' | 'maintainability' | 'testing';
  force: boolean;                      // Force reinstall (overwrite existing)
  critical: number;                    // Custom critical issue threshold
  high: number;                        // Custom high priority threshold
  skip: string;                        // File patterns to skip (glob)
  timeout: number;                     // Validation timeout in seconds
}

// Hook Actions
type HookAction = 'install' | 'uninstall' | 'validate' | 'status' | 'configure';
```

### `mastro docs` - Documentation Generation
AI-powered comprehensive documentation generation.

```typescript
interface DocsFlags {
  'output-dir': string;                // Output directory for documentation files
  'include-private': boolean;          // Include private functions and classes
  'include-todos': boolean;            // Include TODO comments in documentation
  'generate-mermaid': boolean;         // Generate mermaid diagrams for architecture
  'auto-update': boolean;              // Enable automatic documentation updates
  template: string;                    // Custom template directory to use
  format: 'markdown' | 'json' | 'html'; // Output format
}

// Documentation Actions
type DocsAction = 'generate' | 'api' | 'architecture' | 'user-guide';
```

### `mastro docs api`
Generate comprehensive API documentation with OpenAPI support.

```typescript
interface DocsApiFlags {
  'output-dir': string;                // Output directory for API documentation
  'include-private': boolean;          // Include private functions and methods
  'include-internal': boolean;         // Include internal APIs in documentation
  'group-by': 'file' | 'method' | 'tag' | 'none'; // Group API endpoints by criteria
  'include-examples': boolean;         // Generate usage examples for API endpoints
  format: 'markdown' | 'json' | 'openapi'; // Output format for API documentation
  'base-url': string;                  // Base URL for API endpoints (for examples)
}
```

### `mastro docs architecture`
Generate system architecture documentation with diagrams.

```typescript
interface DocsArchitectureFlags {
  'output-dir': string;                // Output directory for architecture docs
  'include-patterns': boolean;         // Include detected architectural patterns
  'generate-diagrams': boolean;        // Generate mermaid architecture diagrams
  'dependency-analysis': boolean;      // Include dependency analysis
  format: 'markdown' | 'json' | 'html'; // Output format
}
```

## 🔧 Plugin Development

### `DocumentationEngine` Class
Core engine for generating documentation.

```typescript
class DocumentationEngine {
  constructor(config: MastroConfig, aiClient: AIClient);
  
  async generateDocumentation(
    type: DocumentationType,
    context: DocumentationContext,
    config: DocumentationConfig
  ): Promise<DocumentationOutput>;
}
```

**Usage:**
```typescript
const docEngine = new DocumentationEngine(mastroConfig, aiClient);
const apiDoc = await docEngine.generateDocumentation('api', context, config);
```

### `DocumentationAnalyzer` Class
Project structure and code analysis for documentation.

```typescript
class DocumentationAnalyzer {
  async analyzeProjectStructure(workingDir: string): Promise<ProjectStructure>;
  async analyzeCodebase(projectStructure: ProjectStructure): Promise<CodeAnalysis>;
}
```

**Usage:**
```typescript
const analyzer = new DocumentationAnalyzer();
const structure = await analyzer.analyzeProjectStructure('/path/to/project');
const analysis = await analyzer.analyzeCodebase(structure);
```

### `FileSystemManager` Class
Manages writing documentation files to disk.

```typescript
class FileSystemManager {
  constructor(outputDirectory: string);
  async writeDocumentation(output: DocumentationOutput): Promise<void>;
}
```

### Creating Custom Documentation Templates

```typescript
interface DocumentationTemplate {
  name: string;
  type: DocumentationType;
  render(context: DocumentationContext): Promise<string>;
}

class CustomApiTemplate implements DocumentationTemplate {
  name = 'custom-api-template';
  type = 'api' as const;
  
  async render(context: DocumentationContext): Promise<string> {
    // Custom template implementation
    return `# Custom API Documentation\n${content}`;
  }
}
```

### Creating Custom AI Providers

```typescript
class CustomAIProvider implements AIProvider {
  readonly name = 'custom-ai';
  
  async generateCommitMessage(context: CommitContext): Promise<CommitMessage> {
    // Implementation
  }
  
  async explainChanges(context: CommitContext): Promise<DiffExplanation> {
    // Implementation
  }
  
  async createPRDescription(context: CommitContext): Promise<PRDescription> {
    // Implementation
  }
  
  async reviewCode(context: CommitContext, persona: ReviewPersona): Promise<CodeReview> {
    // Implementation
  }
}
```

### Registering Custom Providers

```typescript
// In your plugin module
export function registerProvider(aiClient: AIClient) {
  aiClient.registerProvider('custom', new CustomAIProvider());
}
```

### Custom Review Personas

```typescript
const customPersona: ReviewPersona = {
  name: 'DevOps Engineer',
  focus: ['security', 'performance'],
  strictness: 'strict',
  customRules: [
    'Check for secrets in configuration files',
    'Validate container security practices',
    'Ensure proper logging and monitoring'
  ]
};
```

## 🔗 Integration Patterns

### Git Hooks Integration

#### Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running Mastro pre-commit review..."
mastro review --actionable-only --priority=critical --format=json > /tmp/mastro-review.json

if [ -s /tmp/mastro-review.json ]; then
  echo "Critical issues found:"
  cat /tmp/mastro-review.json | jq '.actionableItems[] | select(.priority == "critical") | .title'
  exit 1
fi

echo "Pre-commit review passed."
```

#### Pre-push Hook
```bash
#!/bin/bash
# .git/hooks/pre-push

echo "Generating commit explanations..."
mastro explain HEAD~5..HEAD --format=markdown > RECENT_CHANGES.md
git add RECENT_CHANGES.md
git commit -m "docs: update recent changes documentation"
```

### CI/CD Integration

#### GitHub Actions
```yaml
name: Mastro Review
on: 
  pull_request:
    types: [opened, synchronize]

jobs:
  mastro-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
          
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install Mastro
        run: npm install -g mastro
        
      - name: Run Mastro Review
        run: |
          mastro review --format=json > review.json
          mastro explain ${{ github.event.pull_request.base.sha }}..${{ github.event.pull_request.head.sha }} --format=markdown > explanation.md
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          
      - name: Comment PR
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const review = JSON.parse(fs.readFileSync('review.json', 'utf8'));
            const explanation = fs.readFileSync('explanation.md', 'utf8');
            
            const body = `## 🔍 Mastro Analysis
            
            ### Overall Assessment
            **Rating:** ${review.overall.rating} (${Math.round(review.overall.confidence * 100)}% confidence)
            
            ${review.overall.summary}
            
            ### Critical Items
            ${review.actionableItems
              .filter(item => item.priority === 'critical')
              .map(item => `- **${item.title}** (${item.file}:${item.line})`)
              .join('\n')}
            
            ### Code Explanation
            ${explanation}
            `;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });
```

#### GitLab CI
```yaml
mastro_review:
  stage: review
  image: node:18
  before_script:
    - npm install -g mastro
  script:
    - mastro review --format=json > review.json
    - mastro explain $CI_COMMIT_BEFORE_SHA..$CI_COMMIT_SHA --format=markdown > explanation.md
  artifacts:
    reports:
      junit: review.json
    paths:
      - explanation.md
  only:
    - merge_requests
```

### IDE Integration Example

#### VS Code Extension Interface
```typescript
interface MastroVSCodeAPI {
  // Real-time analysis
  analyzeCurrentFile(): Promise<ReviewSuggestion[]>;
  
  // Commit assistance
  generateCommitMessage(): Promise<CommitMessage>;
  
  // PR creation
  createPRFromBranch(): Promise<PRDescription>;
  
  // Session monitoring
  getCurrentSession(): Promise<DevelopmentSession>;
}
```

## 📝 Error Handling

### Common Error Types

```typescript
interface MastroError extends Error {
  code: string;
  context?: any;
}

// Error codes
const ERROR_CODES = {
  AI_API_KEY_MISSING: 'AI_API_KEY_MISSING',
  AI_REQUEST_FAILED: 'AI_REQUEST_FAILED',
  GIT_REPO_NOT_FOUND: 'GIT_REPO_NOT_FOUND',
  NO_STAGED_CHANGES: 'NO_STAGED_CHANGES',
  CONFIG_INVALID: 'CONFIG_INVALID',
  TOKEN_LIMIT_EXCEEDED: 'TOKEN_LIMIT_EXCEEDED'
};
```

### Error Handling Examples

```typescript
try {
  const commitMessage = await aiClient.generateCommitMessage(context);
} catch (error) {
  if (error.code === 'AI_API_KEY_MISSING') {
    console.log('Please set OPENAI_API_KEY environment variable');
    console.log('Or run: mastro config:init');
  } else if (error.code === 'TOKEN_LIMIT_EXCEEDED') {
    console.log('Changes too large. Consider splitting commits.');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

## 🧪 Testing Interfaces

### Mock Providers for Testing

```typescript
class MockAIProvider implements AIProvider {
  readonly name = 'mock';
  
  async generateCommitMessage(context: CommitContext): Promise<CommitMessage> {
    return {
      title: 'test: mock commit message',
      type: 'test',
      confidence: 0.9,
      reasoning: 'Mock implementation for testing'
    };
  }
  
  // ... other methods
}
```

### Test Utilities

```typescript
export class TestContext {
  static createMockContext(changes: Partial<GitChange>[] = []): CommitContext {
    return {
      changes: changes as GitChange[],
      branch: 'test-branch',
      repository: TestContext.createMockRepo(),
      staged: true,
      workingDir: '/tmp/test-repo',
      metadata: {
        totalInsertions: 10,
        totalDeletions: 5,
        fileCount: 2,
        changeComplexity: 'low'
      }
    };
  }
  
  static createMockRepo(): RepoContext {
    return {
      name: 'test-repo',
      root: '/tmp/test-repo',
      language: 'typescript',
      patterns: {
        commitStyle: 'conventional',
        prefixes: ['feat', 'fix'],
        maxLength: 72,
        commonPhrases: ['test'],
        reviewPersona: {
          name: 'Test Engineer',
          focus: ['testing'],
          strictness: 'moderate',
          customRules: []
        }
      },
      recentCommits: []
    };
  }
}
```

---

## 📚 Additional Resources

- [User Guide](./USER_GUIDE.md) - Complete usage documentation
- [Architecture Guide](./ARCHITECTURE.md) - System design and components  
- [Mermaid Diagrams](./diagrams/) - Technical flow visualizations
- [Examples Repository](https://github.com/your-org/mastro-examples) - Implementation examples

For questions or contributions, please see our [GitHub repository](https://github.com/your-org/mastro).