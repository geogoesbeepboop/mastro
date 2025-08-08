# Mastro Class Interactions & Component Diagrams

> **Detailed UML-style diagrams showing class relationships, component interactions, and system architecture patterns**

## System Component Overview

```mermaid
classDiagram
    %% Base Classes
    class BaseCommand {
        #mastroConfig: MastroConfig
        #gitAnalyzer: GitAnalyzer
        #aiClient: AIClient
        #cacheManager: CacheManager
        +init() Promise~void~
        +handleError(error, operation) Promise~void~
        +startSpinner(message) void
        +stopSpinner(success, message?) void
        +ensureGitRepository() Promise~void~
    }
    
    %% Command Classes
    class CommitCommand {
        -renderer: UIRenderer
        -interactiveUI: InteractiveUI
        +run() Promise~void~
        -refineCommitMessage(original, refinement, context) Promise~CommitMessage~
        -applyCommit(message) Promise~void~
        -learnFromCommit(message, context) Promise~void~
    }
    
    class ExplainCommand {
        -renderer: UIRenderer
        +run() Promise~void~
        -parseRevision(revision) RevisionInfo
        -analyzeSingleCommit(commit) Promise~CommitContext~
        -analyzeCommitRange(from, to, maxCommits) Promise~CommitContext~
        -analyzeBranch(branchName) Promise~CommitContext~
        -enhanceExplanation(explanation, flags) Promise~DiffExplanation~
        -formatOutput(explanation, format, context) Promise~string~
    }
    
    class ReviewCommand {
        -sessionTracker: SessionTracker
        -reviewEngine: ReviewEngine
        -workflowAnalyzer: WorkflowAnalyzer
        -streamingRenderer: StreamingRenderer
        -reviewFormatter: ReviewFormatter
        +run() Promise~void~
        -setupReviewPersona(flags) ReviewPersona
        -processStreamingReview() Promise~SessionReview~
        -processStandardReview() Promise~SessionReview~
    }
    
    class PRCreateCommand {
        -sessionTracker: SessionTracker
        -reviewEngine: ReviewEngine
        -workflowAnalyzer: WorkflowAnalyzer
        -streamingRenderer: StreamingRenderer
        -reviewFormatter: ReviewFormatter
        +run() Promise~void~
        -validateBranchState(flags) Promise~void~
        -performPrePRReview(session) Promise~void~
        -detectMigrations(session) Promise~MigrationDetection~
        -generatePRContext(session, flags, migration?) Promise~SmartPRContext~
        -createActualPR(description, context, flags) Promise~void~
    }
    
    %% Core Services
    class GitAnalyzer {
        -git: SimpleGit
        -config: MastroConfig
        +getStagedChanges() Promise~GitChange[]~
        +getWorkingChanges() Promise~GitChange[]~
        +getBranchChanges(from, to) Promise~GitChange[]~
        +buildCommitContext(staged) Promise~CommitContext~
        +buildRepoContext() Promise~RepoContext~
        +getCurrentBranch() Promise~string~
        +getRecentCommits(limit) Promise~CommitHistory[]~
        +parseDiffForFile(content) GitChange
        -parseDiff(diffContent) GitChange[]
        -parseHunk(hunkContent) GitHunk
    }
    
    class AIClient {
        -provider: AIProvider
        +generateCommitMessage(context) Promise~CommitMessage~
        +explainChanges(context) Promise~DiffExplanation~
        +createPRDescription(context) Promise~PRDescription~
        +reviewCode(context, persona) Promise~CodeReview~
    }
    
    class OpenAIProvider {
        -client: OpenAI
        -config: AIConfig
        +generateCommitMessage(context) Promise~CommitMessage~
        +explainChanges(context) Promise~DiffExplanation~
        +createPRDescription(context) Promise~PRDescription~
        +reviewCode(context, persona) Promise~CodeReview~
        -buildCommitPrompt(context) string
        -buildExplanationPrompt(context) string
        -buildPRPrompt(context) string
        -buildReviewPrompt(context, persona) string
        -validateCommitMessage(message) CommitMessage
    }
    
    %% Session Management
    class SessionTracker {
        -config: MastroConfig
        -gitAnalyzer: GitAnalyzer
        -currentSession: SessionState
        +getCurrentSession() Promise~DevelopmentSession~
        +updateSessionState() Promise~void~
        +hasSessionChanges() Promise~boolean~
        -initializeNewSession() Promise~SessionState~
        -shouldResetSession() boolean
        -calculateRiskAssessment(session) SessionRisk
        -detectSessionPatterns(session) SessionPattern[]
    }
    
    class ReviewEngine {
        -config: MastroConfig
        -aiClient: AIClient
        -semanticAnalyzer: SemanticAnalyzer
        -impactAnalyzer: ImpactAnalyzer
        +reviewSession(session, persona) Promise~SessionReview~
        +generateActionableItems(review) Promise~ActionableItem[]~
        -enhanceWithPersona(review, persona) SessionReview
        -prioritizeItems(items) ActionableItem[]
    }
    
    class WorkflowAnalyzer {
        -semanticAnalyzer: SemanticAnalyzer
        -gitAnalyzer: GitAnalyzer
        -config: MastroConfig
        +analyzeWorkflowPatterns(session) Promise~SessionPattern[]~
        +detectPRType(session) Promise~PRTemplateType~
        +generateWorkflowSuggestions(session) Promise~WorkflowSuggestion[]~
        +optimizeCommitStrategy(session) Promise~string[]~
        -detectTDDPattern(changes, session) SessionPattern?
        -detectFeatureFlagPattern(changes) SessionPattern?
        -detectAntiPatterns(session) DevelopmentAntiPattern[]
    }
    
    %% Analysis Services
    class SemanticAnalyzer {
        +analyzeChanges(changes) Promise~SemanticAnalysis~
        +detectPatterns(content) CodePattern[]
        +calculateComplexity(change) ComplexityScore
        +identifyFrameworks(changes) Framework[]
        -analyzeFileStructure(change) FileStructure
        -detectImportPatterns(lines) ImportPattern[]
    }
    
    class ImpactAnalyzer {
        +assessImpact(context) Promise~ImpactAnalysis~
        +analyzeBusinessImpact(changes) BusinessImpact
        +analyzeTechnicalImpact(changes) TechnicalImpact
        +assessSecurityImpact(changes) SecurityImpact
        +evaluatePerformanceImpact(changes) PerformanceImpact
        -identifyBreakingChanges(changes) BreakingChange[]
        -assessMigrationNeeds(changes) MigrationNeeds
    }
    
    %% Cache Management
    class CacheManager {
        -commitCache: NodeCache
        -explanationCache: NodeCache
        -contextCache: NodeCache
        -config: MastroConfig
        +getCachedCommitMessage(context) Promise~CommitMessage?~
        +setCachedCommitMessage(context, message) Promise~void~
        +getCachedExplanation(context) Promise~DiffExplanation?~
        +setCachedExplanation(context, explanation) Promise~void~
        +clearCache() void
        -generateContextHash(context) string
        -findSimilarContext(context, threshold) Promise~CacheEntry?~
        -calculateSimilarity(context1, context2) Promise~number~
    }
    
    %% UI Components
    class UIRenderer {
        -config: MastroConfig
        +renderCommitMessage(message) string
        +renderDiffExplanation(explanation) string
        +renderError(error, context) string
        -formatWithColors(content, type) string
        -createProgressBar(percentage) string
    }
    
    class StreamingRenderer {
        -config: MastroConfig
        -loadingManager: LoadingStateManager
        +renderStreamingReview(reviewPromise, config) Promise~void~
        +renderProgressiveResults(review) void
        +cleanup() void
        -createStreamingIndicator(message) StreamingIndicator
    }
    
    class ReviewFormatter {
        -config: MastroConfig
        +formatSessionReview(review, format) string
        +formatActionableItems(items, format) string
        +formatWorkflowSuggestions(suggestions, format) string
        -formatTerminal(review) string
        -formatMarkdown(review) string
        -formatJSON(review) string
        -formatHTML(review) string
    }
    
    class SessionUI {
        -loadingManager: LoadingStateManager
        -config: MastroConfig
        +displaySessionOverview(session) void
        +displaySessionStats(stats, output?) void
        +displayRiskAssessment(risk, output?) void
        +displaySessionPatterns(patterns, output?) void
        +displayActionableItemsSummary(items) void
        +showInteractiveSessionMenu() void
        +createLiveSessionMonitor() SessionMonitor
    }
    
    class LoadingStateManager {
        -config: MastroConfig
        -activeSpinners: Map
        +startSpinner(message) Spinner
        +stopSpinner(success, message?) void
        +startStreamingIndicator(message) StreamingIndicator
        +updateProgress(progress) void
    }
    
    %% Inheritance Relationships
    BaseCommand <|-- CommitCommand
    BaseCommand <|-- ExplainCommand
    BaseCommand <|-- ReviewCommand
    BaseCommand <|-- PRCreateCommand
    
    AIProvider <|.. OpenAIProvider
    
    %% Composition Relationships
    BaseCommand *-- GitAnalyzer
    BaseCommand *-- AIClient
    BaseCommand *-- CacheManager
    
    CommitCommand *-- UIRenderer
    CommitCommand *-- InteractiveUI
    
    ExplainCommand *-- UIRenderer
    
    ReviewCommand *-- SessionTracker
    ReviewCommand *-- ReviewEngine
    ReviewCommand *-- WorkflowAnalyzer
    ReviewCommand *-- StreamingRenderer
    ReviewCommand *-- ReviewFormatter
    
    PRCreateCommand *-- SessionTracker
    PRCreateCommand *-- ReviewEngine
    PRCreateCommand *-- WorkflowAnalyzer
    PRCreateCommand *-- StreamingRenderer
    PRCreateCommand *-- ReviewFormatter
    
    AIClient *-- OpenAIProvider
    
    SessionTracker *-- GitAnalyzer
    
    ReviewEngine *-- AIClient
    ReviewEngine *-- SemanticAnalyzer
    ReviewEngine *-- ImpactAnalyzer
    
    WorkflowAnalyzer *-- SemanticAnalyzer
    WorkflowAnalyzer *-- GitAnalyzer
    
    StreamingRenderer *-- LoadingStateManager
    SessionUI *-- LoadingStateManager
```

## Command Execution Flow Patterns

### 1. Commit Command Execution Pattern

```mermaid
sequenceDiagram
    participant User
    participant CC as CommitCommand
    participant GA as GitAnalyzer
    participant CM as CacheManager
    participant AC as AIClient
    participant OP as OpenAIProvider
    participant UR as UIRenderer
    
    User->>CC: mastro commit --interactive
    CC->>GA: buildCommitContext(true)
    GA-->>CC: CommitContext
    CC->>CM: getCachedCommitMessage(context)
    CM-->>CC: null (cache miss)
    CC->>AC: generateCommitMessage(context)
    AC->>OP: generateCommitMessage(context)
    OP->>OP: buildCommitPrompt(context)
    OP->>OpenAI: API call
    OpenAI-->>OP: JSON response
    OP->>OP: validateCommitMessage(response)
    OP-->>AC: CommitMessage
    AC-->>CC: CommitMessage
    CC->>CM: setCachedCommitMessage(context, message)
    CC->>UR: renderCommitMessage(message)
    UR-->>CC: formatted output
    CC->>User: Display commit message
    CC->>CC: applyCommit(message) [if confirmed]
```

### 2. Review Command Execution Pattern

```mermaid
sequenceDiagram
    participant User
    participant RC as ReviewCommand
    participant ST as SessionTracker
    participant RE as ReviewEngine
    participant WA as WorkflowAnalyzer
    participant SA as SemanticAnalyzer
    participant IA as ImpactAnalyzer
    participant AC as AIClient
    participant RF as ReviewFormatter
    
    User->>RC: mastro review --persona=security
    RC->>ST: getCurrentSession()
    ST->>ST: initializeNewSession() [if needed]
    ST-->>RC: DevelopmentSession
    RC->>RE: reviewSession(session, persona)
    RE->>SA: analyzeChanges(session.changes)
    RE->>IA: assessImpact(session)
    SA-->>RE: SemanticAnalysis
    IA-->>RE: ImpactAnalysis
    RE->>AC: reviewCode(context, persona)
    AC-->>RE: CodeReview
    RE->>RE: generateActionableItems(review)
    RE-->>RC: SessionReview
    RC->>WA: generateWorkflowSuggestions(session)
    WA-->>RC: WorkflowSuggestion[]
    RC->>RF: formatSessionReview(review, format)
    RF-->>RC: formatted output
    RC->>User: Display review results
```

## Data Flow Architecture

### 1. Git Analysis Data Flow

```mermaid
flowchart TD
    GitRepo[Git Repository] --> GA[GitAnalyzer]
    GA --> SimpleGit[simple-git library]
    SimpleGit --> DiffParsing[Diff Parsing]
    DiffParsing --> GitChanges[GitChange[]]
    GitChanges --> GitHunks[GitHunk[]]
    GitHunks --> GitLines[GitLine[]]
    GitLines --> CommitContext[CommitContext]
    CommitContext --> RepoContext[RepoContext]
    RepoContext --> TeamPatterns[TeamPatterns]
    TeamPatterns --> FinalContext[Complete Context]
    
    subgraph "Context Building"
        CommitContext
        RepoContext
        TeamPatterns
    end
    
    subgraph "Git Data Structures"
        GitChanges
        GitHunks
        GitLines
    end
```

### 2. AI Processing Data Flow

```mermaid
flowchart LR
    Context[CommitContext] --> TokenBudget[Token Budget Manager]
    TokenBudget --> Optimization[Context Optimization]
    Optimization --> PromptBuilder[Prompt Builder]
    PromptBuilder --> AIProvider[AI Provider]
    AIProvider --> OpenAI[OpenAI API]
    OpenAI --> ResponseParser[Response Parser]
    ResponseParser --> Validator[Response Validator]
    Validator --> CacheStore[Cache Storage]
    CacheStore --> Output[Final Output]
    
    subgraph "Pre-Processing"
        TokenBudget
        Optimization
        PromptBuilder
    end
    
    subgraph "AI Processing"
        AIProvider
        OpenAI
        ResponseParser
    end
    
    subgraph "Post-Processing"
        Validator
        CacheStore
        Output
    end
```

### 3. Session Management Data Flow

```mermaid
flowchart TB
    GitState[Git Repository State] --> SessionTracker[SessionTracker]
    SessionTracker --> CurrentSession{Current Session Exists?}
    CurrentSession -->|No| NewSession[Initialize New Session]
    CurrentSession -->|Yes| ValidateSession[Validate Session]
    
    NewSession --> WorkingChanges[Get Working Changes]
    NewSession --> StagedChanges[Get Staged Changes]
    
    ValidateSession --> ShouldReset{Should Reset?}
    ShouldReset -->|Yes| NewSession
    ShouldReset -->|No| UpdateSession[Update Session State]
    
    WorkingChanges --> SessionStats[Calculate Session Stats]
    StagedChanges --> SessionStats
    UpdateSession --> SessionStats
    
    SessionStats --> RiskAssessment[Risk Assessment]
    RiskAssessment --> PatternDetection[Pattern Detection]
    PatternDetection --> DevelopmentSession[Complete Development Session]
    
    subgraph "Session Analysis"
        SessionStats
        RiskAssessment
        PatternDetection
    end
```

## Component Integration Patterns

### 1. Cache Integration Pattern

```mermaid
classDiagram
    class CacheManager {
        -commitCache: NodeCache
        -explanationCache: NodeCache
        -contextCache: NodeCache
        +getCachedCommitMessage(context) Promise~CommitMessage?~
        +setCachedCommitMessage(context, message) Promise~void~
        +getCachedExplanation(context) Promise~DiffExplanation?~
        +setCachedExplanation(context, explanation) Promise~void~
        -generateContextHash(context) string
        -findSimilarContext(context, threshold) Promise~CacheEntry?~
        -calculateSimilarity(context1, context2) Promise~number~
    }
    
    class CommitCommand {
        +run() Promise~void~
    }
    
    class ExplainCommand {
        +run() Promise~void~
    }
    
    class ReviewCommand {
        +run() Promise~void~
    }
    
    class AIClient {
        +generateCommitMessage(context) Promise~CommitMessage~
        +explainChanges(context) Promise~DiffExplanation~
        +reviewCode(context, persona) Promise~CodeReview~
    }
    
    %% Usage Relationships
    CommitCommand --> CacheManager : uses for commit messages
    ExplainCommand --> CacheManager : uses for explanations
    ReviewCommand --> CacheManager : uses for reviews
    AIClient --> CacheManager : integrates caching
    
    %% Data Flow
    CacheManager ..> NodeCache : delegates to
    CacheManager ..> CosineSimilarity : uses for similarity
```

### 2. UI Component Integration

```mermaid
classDiagram
    class LoadingStateManager {
        -activeSpinners: Map
        +startSpinner(message) Spinner
        +stopSpinner(success, message?) void
        +startStreamingIndicator(message) StreamingIndicator
    }
    
    class UIRenderer {
        +renderCommitMessage(message) string
        +renderDiffExplanation(explanation) string
        +renderError(error, context) string
    }
    
    class StreamingRenderer {
        -loadingManager: LoadingStateManager
        +renderStreamingReview(reviewPromise, config) Promise~void~
        +renderProgressiveResults(review) void
    }
    
    class ReviewFormatter {
        +formatSessionReview(review, format) string
        +formatActionableItems(items, format) string
        +formatWorkflowSuggestions(suggestions, format) string
    }
    
    class SessionUI {
        -loadingManager: LoadingStateManager
        +displaySessionOverview(session) void
        +displaySessionStats(stats, output?) void
        +displayActionableItemsSummary(items) void
        +showInteractiveSessionMenu() void
    }
    
    %% Composition Relationships
    StreamingRenderer *-- LoadingStateManager
    SessionUI *-- LoadingStateManager
    
    %% Usage Relationships
    UIRenderer ..> Chalk : uses for colors
    LoadingStateManager ..> Ora : uses for spinners
    StreamingRenderer --> ReviewFormatter : delegates formatting
    SessionUI --> ReviewFormatter : delegates formatting
```

### 3. Analysis Pipeline Integration

```mermaid
classDiagram
    class ReviewEngine {
        -semanticAnalyzer: SemanticAnalyzer
        -impactAnalyzer: ImpactAnalyzer
        +reviewSession(session, persona) Promise~SessionReview~
        +generateActionableItems(review) Promise~ActionableItem[]~
    }
    
    class SemanticAnalyzer {
        +analyzeChanges(changes) Promise~SemanticAnalysis~
        +detectPatterns(content) CodePattern[]
        +calculateComplexity(change) ComplexityScore
        +identifyFrameworks(changes) Framework[]
    }
    
    class ImpactAnalyzer {
        +assessImpact(context) Promise~ImpactAnalysis~
        +analyzeBusinessImpact(changes) BusinessImpact
        +analyzeTechnicalImpact(changes) TechnicalImpact
        +assessSecurityImpact(changes) SecurityImpact
    }
    
    class WorkflowAnalyzer {
        -semanticAnalyzer: SemanticAnalyzer
        +analyzeWorkflowPatterns(session) Promise~SessionPattern[]~
        +generateWorkflowSuggestions(session) Promise~WorkflowSuggestion[]~
        +optimizeCommitStrategy(session) Promise~string[]~
    }
    
    class AIClient {
        +reviewCode(context, persona) Promise~CodeReview~
    }
    
    %% Composition Relationships
    ReviewEngine *-- SemanticAnalyzer
    ReviewEngine *-- ImpactAnalyzer
    WorkflowAnalyzer *-- SemanticAnalyzer
    
    %% Usage Relationships
    ReviewEngine --> AIClient : uses for AI review
    WorkflowAnalyzer --> SemanticAnalyzer : shares analyzer
```

## Error Handling Architecture

### 1. Error Propagation Pattern

```mermaid
classDiagram
    class BaseCommand {
        +handleError(error, operation) Promise~void~
        +ensureGitRepository() Promise~void~
    }
    
    class MastroError {
        +code: string
        +context: any
        +message: string
    }
    
    class GitAnalyzer {
        +getStagedChanges() Promise~GitChange[]~
        -throwGitError(error, operation) never
    }
    
    class AIClient {
        +generateCommitMessage(context) Promise~CommitMessage~
        -throwAIError(error, operation) never
    }
    
    class OpenAIProvider {
        +generateCommitMessage(context) Promise~CommitMessage~
        -handleOpenAIError(error) never
    }
    
    class CacheManager {
        +getCachedCommitMessage(context) Promise~CommitMessage?~
        -handleCacheError(error) void
    }
    
    %% Error Relationships
    BaseCommand ..> MastroError : handles
    GitAnalyzer ..> MastroError : throws
    AIClient ..> MastroError : throws
    OpenAIProvider ..> MastroError : throws
    CacheManager ..> MastroError : throws (non-fatal)
    
    %% Error Codes
    note for MastroError "Error Codes:\n- AI_API_KEY_MISSING\n- AI_REQUEST_FAILED\n- GIT_REPO_NOT_FOUND\n- NO_STAGED_CHANGES\n- CONFIG_INVALID\n- TOKEN_LIMIT_EXCEEDED"
```

### 2. Configuration Management Pattern

```mermaid
classDiagram
    class MastroConfig {
        +ai: AIConfig
        +git: GitConfig
        +cache: CacheConfig
        +team: TeamPatterns
        +ui: UIConfig
    }
    
    class ConfigManager {
        +loadConfig() Promise~MastroConfig~
        +saveConfig(config) Promise~void~
        +validateConfig(config) ValidationResult
        -mergeConfigs(global, project) MastroConfig
    }
    
    class BaseCommand {
        #mastroConfig: MastroConfig
        #init() Promise~void~
    }
    
    class AIClient {
        -config: AIConfig
        +constructor(config) AIClient
    }
    
    class GitAnalyzer {
        -config: MastroConfig
        +constructor(config) GitAnalyzer
    }
    
    class CacheManager {
        -config: CacheConfig
        +constructor(config) CacheManager
    }
    
    %% Configuration Flow
    ConfigManager --> MastroConfig : creates
    BaseCommand --> ConfigManager : uses
    BaseCommand --> MastroConfig : receives
    
    AIClient --> MastroConfig : uses ai config
    GitAnalyzer --> MastroConfig : uses git config
    CacheManager --> MastroConfig : uses cache config
```

## Plugin Architecture Pattern

### 1. AI Provider Plugin System

```mermaid
classDiagram
    class AIProvider {
        <<interface>>
        +name: string
        +generateCommitMessage(context) Promise~CommitMessage~
        +explainChanges(context) Promise~DiffExplanation~
        +createPRDescription(context) Promise~PRDescription~
        +reviewCode(context, persona) Promise~CodeReview~
    }
    
    class OpenAIProvider {
        +name: "openai"
        -client: OpenAI
        -config: AIConfig
        +generateCommitMessage(context) Promise~CommitMessage~
        +explainChanges(context) Promise~DiffExplanation~
        +createPRDescription(context) Promise~PRDescription~
        +reviewCode(context, persona) Promise~CodeReview~
    }
    
    class AnthropicProvider {
        +name: "anthropic"
        -client: Anthropic
        -config: AIConfig
        +generateCommitMessage(context) Promise~CommitMessage~
        +explainChanges(context) Promise~DiffExplanation~
        +createPRDescription(context) Promise~PRDescription~
        +reviewCode(context, persona) Promise~CodeReview~
    }
    
    class LocalProvider {
        +name: "local"
        -endpoint: string
        -config: AIConfig
        +generateCommitMessage(context) Promise~CommitMessage~
        +explainChanges(context) Promise~DiffExplanation~
        +createPRDescription(context) Promise~PRDescription~
        +reviewCode(context, persona) Promise~CodeReview~
    }
    
    class AIClient {
        -provider: AIProvider
        +constructor(config) AIClient
        +generateCommitMessage(context) Promise~CommitMessage~
        +explainChanges(context) Promise~DiffExplanation~
        +createPRDescription(context) Promise~PRDescription~
        +reviewCode(context, persona) Promise~CodeReview~
    }
    
    class ProviderFactory {
        +createProvider(type, config) AIProvider
        +registerProvider(provider) void
        +listProviders() string[]
    }
    
    %% Interface Implementation
    AIProvider <|.. OpenAIProvider
    AIProvider <|.. AnthropicProvider
    AIProvider <|.. LocalProvider
    
    %% Factory Pattern
    ProviderFactory --> AIProvider : creates
    AIClient --> ProviderFactory : uses
    AIClient --> AIProvider : uses
```

### 2. Extension Points Architecture

```mermaid
classDiagram
    class ExtensionManager {
        -extensions: Map~string, Extension~
        +registerExtension(extension) void
        +getExtension(name) Extension?
        +loadExtensions() Promise~void~
    }
    
    class Extension {
        <<interface>>
        +name: string
        +version: string
        +activate(context) Promise~void~
        +deactivate() Promise~void~
    }
    
    class UIExtension {
        +name: "custom-ui"
        +version: "1.0.0"
        +activate(context) Promise~void~
        +deactivate() Promise~void~
        +renderCustomOutput(data) string
    }
    
    class AnalyzerExtension {
        +name: "custom-analyzer"
        +version: "1.0.0" 
        +activate(context) Promise~void~
        +deactivate() Promise~void~
        +analyzeCode(changes) Promise~Analysis~
    }
    
    class PersonaExtension {
        +name: "custom-persona"
        +version: "1.0.0"
        +activate(context) Promise~void~
        +deactivate() Promise~void~
        +createPersona(config) ReviewPersona
    }
    
    %% Extension Implementations
    Extension <|.. UIExtension
    Extension <|.. AnalyzerExtension  
    Extension <|.. PersonaExtension
    
    %% Extension Management
    ExtensionManager --> Extension : manages
    BaseCommand --> ExtensionManager : uses
```

This comprehensive class interaction model shows how mastro's modular architecture enables clean separation of concerns, extensibility, and maintainable code organization while supporting complex AI-powered workflows.