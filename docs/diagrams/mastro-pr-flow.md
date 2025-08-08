# Mastro PR Create Command - Technical Flow

> **Detailed technical flow for smart PR creation with AI-generated descriptions, migration detection, and intelligent template selection**

## Complete Smart PR Creation Flow

```mermaid
graph TB
    %% User Input Layer
    User[👤 User] --> CLI["`**mastro pr create --template=feature**
    oclif Command Parser
    Rich flag processing`"]
    
    %% Command Processing & Initialization
    CLI --> PRCmd["`**PRCreate.ts**
    BaseCommand Extension
    
    **Key Flags:**
    - template: PR type selection
    - title: custom PR title
    - draft: create as draft
    - migration-check: detect migrations
    - base-branch: target branch
    - head-branch: source branch
    - push: push before creating
    - skip-review: bypass pre-PR review`"]
    
    PRCmd --> ComponentInit["`**Component Initialization**
    Initialize all required services:
    - SessionTracker (development state)
    - ReviewEngine (pre-PR review)
    - WorkflowAnalyzer (PR type detection)
    - StreamingRenderer (real-time UI)
    - ReviewFormatter (output formatting)`"]
    
    %% Git Repository Validation
    ComponentInit --> GitCheck{"`**Git Repository Check**
    ensureGitRepository()
    Validate git repository exists`"}
    
    GitCheck -->|No| Error1["`❌ **Error**
    'Not in a git repository'`"]
    GitCheck -->|Yes| SessionGet["`**Get Development Session**
    sessionTracker.getCurrentSession()
    
    **Session Analysis:**
    - Working changes detection
    - Staged changes analysis
    - Session risk assessment
    - Development patterns`"]
    
    %% Branch State Validation
    SessionGet --> BranchValidation["`**Branch State Validation**
    validateBranchState(flags)
    
    **Validations:**
    1. Not on base branch check
    2. Head branch determination
    3. Branch relationship validation
    4. Git status verification`"]
    
    BranchValidation --> BranchCheck{"`**Branch Validation Result**
    Can create PR from current state?`"}
    
    BranchCheck -->|Invalid| BranchError["`❌ **Branch Error**
    'Cannot create PR from base branch'
    'Please switch to feature branch'`"]
    BranchCheck -->|Valid| ChangesCheck["`**Changes Detection**
    sessionTracker.hasSessionChanges()
    
    **Checks:**
    - Working directory changes
    - Staged changes  
    - Committed changes since base
    - Session activity indicators`"]
    
    ChangesCheck --> HasChanges{"`**Has Changes?**
    Changes detected in session`"}
    
    HasChanges -->|No| NoChangesError["`❌ **No Changes**
    '⚠️ No changes detected'
    'Make changes or switch branches'`"]
    HasChanges -->|Yes| PushCheck{"`**Push Branch?**
    flags.push === true`"}
    
    %% Optional Branch Push
    PushCheck -->|Yes| PushBranch["`**Push Branch Operation**
    pushBranch(head-branch)
    
    **Process:**
    1. Start spinner 'Pushing branch...'
    2. Execute git push -u origin branch
    3. Handle push errors/conflicts
    4. Update spinner on completion`"]
    PushCheck -->|No| PreReviewCheck
    
    PushBranch --> PreReviewCheck{"`**Pre-PR Review?**
    !flags['skip-review']`"}
    
    %% Pre-PR Code Review
    PreReviewCheck -->|Yes| PreReview["`**Pre-PR Review Execution**
    performPrePRReview(session)
    
    **Review Configuration:**
    - Persona: 'PR Reviewer'
    - Focus: ['maintainability', 'security', 'performance']
    - Strictness: 'moderate'
    - Custom rules: PR-specific checks`"]
    
    PreReviewCheck -->|No| MigrationCheck
    
    PreReview --> ReviewEngine["`**Review Engine Processing**
    reviewEngine.reviewSession(session, persona)
    
    **AI Analysis:**
    - Code quality assessment
    - Security vulnerability scan
    - Performance impact analysis
    - Breaking change detection`"]
    
    ReviewEngine --> CriticalIssues{"`**Critical Issues Found?**
    Filter review for critical/high priority`"}
    
    CriticalIssues -->|Yes| CriticalDisplay["`**Display Critical Issues**
    Show critical problems to user
    
    **Output Format:**
    - Priority-based highlighting
    - File and line references
    - Specific improvement suggestions
    - Risk assessment details`"]
    
    CriticalDisplay --> ProceedChoice["`**User Choice**
    'Continue with PR creation despite issues?'
    Interactive confirmation prompt`"]
    
    ProceedChoice -->|No| CancelledExit["`🚫 **Cancelled**
    'PR creation cancelled'
    'Please address issues and try again'`"]
    ProceedChoice -->|Yes| MigrationCheck
    
    CriticalIssues -->|No| PassedReview["`✅ **Pre-PR Review Passed**
    'No critical issues found'
    Continue with PR creation`"]
    PassedReview --> MigrationCheck
    
    %% Migration Detection System
    MigrationCheck --> MigrationDetection["`**Migration Detection Analysis**
    detectMigrations(session)
    
    **Detection Categories:**
    1. **Database Migrations**
       - Schema changes (CREATE/ALTER TABLE)
       - Migration files
       - Database configuration
    
    2. **API Changes**  
       - Endpoint modifications
       - Breaking API changes
       - Router configuration
    
    3. **Breaking Changes**
       - Function/class removals
       - Interface modifications
       - Public API changes`"]
    
    MigrationDetection --> DatabaseCheck["`**Database Migration Check**
    Scan for database-related changes:
    
    **File Patterns:**
    - */migration/* directories
    - *schema* files  
    - *database* files
    
    **Content Patterns:**
    - CREATE TABLE statements
    - ALTER TABLE statements
    - DROP TABLE statements`"]
    
    DatabaseCheck --> APICheck["`**API Change Detection**
    Analyze API-related modifications:
    
    **Patterns:**
    - Removed export statements
    - Endpoint definition changes
    - Router configuration updates
    - API version modifications`"]
    
    APICheck --> BreakingCheck["`**Breaking Change Analysis**
    Detect potentially breaking changes:
    
    **Indicators:**
    - Function/class removals
    - Interface modifications
    - Public method signature changes
    - Major version implications`"]
    
    BreakingCheck --> MigrationResult["`**Migration Detection Result**
    Compile MigrationDetection object:
    
    - detected: boolean
    - type: 'database' | 'api' | 'breaking'
    - description: impact summary
    - migrationSteps: action items
    - impact: risk assessment`"]
    
    %% PR Context Generation
    MigrationResult --> PRContextGen["`**Smart PR Context Generation**
    generatePRContext(session, flags, migrationInfo)
    
    **Context Building:**
    1. Template type determination
    2. Review complexity assessment
    3. Repository metadata
    4. Change analysis integration`"]
    
    PRContextGen --> TemplateDetection["`**PR Template Detection**
    workflowAnalyzer.detectPRType(session)
    
    **Auto-Detection Logic:**
    1. **Branch Name Analysis:**
       - hotfix/* → 'hotfix'
       - bug/* → 'bugfix'  
       - docs/* → 'docs'
       - refactor/* → 'refactor'
    
    2. **Content Analysis:**
       - New functions/classes → 'feature'
       - Only test files → 'refactor'
       - Only documentation → 'docs'
       - Bug fix patterns → 'bugfix'`"]
    
    TemplateDetection --> TemplateCreation["`**PR Template Creation**
    createPRTemplate(type, session)
    
    **Template Components:**
    - Sections (summary, changes, testing)
    - Checklist items (type-specific)
    - Review requirements
    - Labels and metadata`"]
    
    TemplateCreation --> ComplexityAssess["`**Review Complexity Assessment**
    Determine PR complexity level:
    
    **Thresholds:**
    - Extensive: >20 files OR >1000 lines
    - Complex: >10 files OR >500 lines  
    - Moderate: >5 files OR >100 lines
    - Simple: ≤5 files AND ≤100 lines`"]
    
    ComplexityAssess --> SmartPRContext["`**SmartPRContext Object Creation**
    Complete context with:
    - Repository information
    - Change metadata
    - Template configuration
    - Migration information
    - Complexity assessment`"]
    
    %% AI PR Description Generation
    SmartPRContext --> AIGeneration["`**AI PR Description Generation**
    generatePRDescription(prContext, flags)
    
    **AI Processing:**
    - Principal Engineer persona
    - Context-aware analysis
    - Template-based structure
    - Migration consideration`"]
    
    AIGeneration --> AIPrompt["`**AI Prompt Construction**
    Build comprehensive PR prompt:
    
    **Includes:**
    - Repository context
    - Change summary
    - File modifications
    - Template structure requirements
    - Migration detection results`"]
    
    AIPrompt --> OpenAICall["`**OpenAI API Call**
    aiClient.createPRDescription(context)
    
    **Configuration:**
    - Model: gpt-4
    - Principal Engineer system prompt
    - JSON response format
    - Context-optimized content`"]
    
    OpenAICall --> PRResponse{"`**AI Response Processing**
    Parse PR description response`"}
    
    PRResponse -->|Success| PRParsing["`**PR Description Parsing**
    Extract PRDescription object:
    - title: generated PR title
    - description: detailed description
    - checklist: testing items
    - testingInstructions: how to test
    - breakingChanges: if applicable
    - dependencies: if applicable`"]
    
    PRResponse -->|Error| AIGenError["`❌ **AI Generation Error**
    Handle PR generation failures`"]
    
    %% Title Customization
    PRParsing --> TitleCheck{"`**Custom Title?**
    flags.title provided`"}
    
    TitleCheck -->|Yes| TitleOverride["`**Title Override**
    description.title = flags.title
    Use user-provided title`"]
    TitleCheck -->|No| OutputProcessing
    TitleOverride --> OutputProcessing
    
    %% Output Processing & Display
    OutputProcessing --> OutputFormat{"`**Output Format Selection**
    flags.format: terminal|json|markdown`"}
    
    OutputFormat -->|terminal| TerminalOutput["`**Terminal Display**
    outputTerminalPR(prDescription, context)
    
    **Display Components:**
    - 📝 Generated PR header
    - Title and complexity
    - Description content
    - Checklist items
    - Migration warnings (if any)`"]
    
    OutputFormat -->|markdown| MarkdownOutput["`**Markdown Display**
    outputMarkdownPR(prDescription, context)
    
    **Structure:**
    - # Title
    - Description content  
    - ## Checklist section
    - ## Migration Required section`"]
    
    OutputFormat -->|json| JSONOutput["`**JSON Display**
    Complete structured output:
    - PR description object
    - Context metadata
    - Migration information
    - Complexity assessment`"]
    
    TerminalOutput --> DryRunCheck{"`**Dry Run Mode?**
    flags['dry-run']`"}
    MarkdownOutput --> DryRunCheck
    JSONOutput --> DryRunCheck
    
    %% PR Creation or Dry Run
    DryRunCheck -->|Yes| DryRunExit["`ℹ️ **Dry Run Complete**
    'PR description generated but not created'
    Display what would be created`"]
    
    DryRunCheck -->|No| PRCreation["`**Actual PR Creation**
    createActualPR(prDescription, context, flags)
    
    **Integration Points:**
    - GitHub API (gh CLI)
    - GitLab API (glab CLI)  
    - Custom integrations
    - Local git configuration`"]
    
    PRCreation --> PRSimulation["`**PR Creation Simulation**
    Current implementation shows:
    
    **Display:**
    - 🚀 Creating PR...
    - Source → Target branch
    - Title and draft status
    - Simulated API call
    - Success confirmation
    - Mock PR URL`"]
    
    PRSimulation --> Success["`✅ **PR Created Successfully**
    Show completion status:
    - Success confirmation
    - PR URL (when integrated)
    - Next steps guidance`"]
    
    %% Error Handling
    Error1 --> ErrorHandler["`**Comprehensive Error Handler**
    Handle all error scenarios:
    
    **Error Types:**
    - Git repository errors
    - Branch validation failures  
    - API integration errors
    - Network connectivity issues
    - Permission problems`"]
    
    BranchError --> ErrorHandler
    NoChangesError --> ErrorHandler
    AIGenError --> ErrorHandler
    ErrorHandler --> ErrorExit["`🔚 **Error Exit**
    Graceful error termination`"]
    
    %% Success Completion
    Success --> Cleanup["`**Cleanup & Resource Management**
    - streamingRenderer.cleanup()
    - Clear temporary data
    - Reset component states
    - Log operation completion`"]
    
    DryRunExit --> Cleanup
    CancelledExit --> Cleanup
    
    Cleanup --> SuccessExit["`🔚 **Success Exit**
    Process completed successfully`"]
    
    %% Styling
    classDef userClass fill:#e1f5fe
    classDef commandClass fill:#fff3e0
    classDef validationClass fill:#f3e5f5
    classDef detectionClass fill:#e8f5e8
    classDef aiClass fill:#fff9c4
    classDef outputClass fill:#f1f8e9
    classDef errorClass fill:#ffebee
    classDef successClass fill:#e8f5e8
    
    class User,CLI userClass
    class PRCmd,ComponentInit commandClass
    class BranchValidation,ChangesCheck,PreReview validationClass
    class MigrationDetection,DatabaseCheck,APICheck,BreakingCheck,TemplateDetection detectionClass
    class AIGeneration,AIPrompt,OpenAICall,PRParsing aiClass
    class OutputFormat,TerminalOutput,MarkdownOutput,JSONOutput outputClass
    class Error1,BranchError,NoChangesError,AIGenError,ErrorHandler errorClass
    class Success,Cleanup successClass
```

## PR Template System Architecture

### 1. Template Type Detection Logic

```mermaid
graph TB
    Session[DevelopmentSession] --> BranchAnalysis["`**Branch Name Analysis**
    Extract patterns from branch name`"]
    Session --> ContentAnalysis["`**Content Analysis**
    Analyze change patterns in files`"]
    
    BranchAnalysis --> BranchPatterns{Branch Patterns}
    BranchPatterns -->|hotfix/*| Hotfix["`**Hotfix Template**
    - Critical Issue section
    - Immediate Fix section
    - Impact Assessment
    - Rollback plan checklist`"]
    
    BranchPatterns -->|bug/*| Bugfix["`**Bugfix Template**
    - Bug Description
    - Root Cause analysis
    - Solution explanation
    - Regression test checklist`"]
    
    BranchPatterns -->|docs/*| Docs["`**Documentation Template**
    - Documentation changes
    - Content improvements
    - Accessibility updates
    - Review checklist`"]
    
    BranchPatterns -->|refactor/*| Refactor["`**Refactor Template**
    - Refactoring goals
    - Changes made
    - Benefits explanation
    - No functional changes verification`"]
    
    ContentAnalysis --> ContentPatterns{Content Patterns}
    ContentPatterns -->|New functions/classes| Feature["`**Feature Template**
    - Summary section
    - Changes Made section  
    - Testing section
    - Documentation section`"]
    
    ContentPatterns -->|Only tests| TestRefactor[Use Refactor Template]
    ContentPatterns -->|Only docs| DocsRefactor[Use Docs Template]
    ContentPatterns -->|Bug patterns| BugfixContent[Use Bugfix Template]
    
    Hotfix --> TemplateSelection
    Bugfix --> TemplateSelection
    Docs --> TemplateSelection
    Refactor --> TemplateSelection
    Feature --> TemplateSelection
    TestRefactor --> TemplateSelection
    DocsRefactor --> TemplateSelection
    BugfixContent --> TemplateSelection
    
    TemplateSelection[Selected Template] --> PRTemplate[PRTemplate Object]
```

### 2. Migration Detection Pipeline

```mermaid
sequenceDiagram
    participant PC as PRCreate Command
    participant MD as MigrationDetector
    participant GA as GitAnalyzer
    participant FS as FileSystem
    
    PC->>MD: detectMigrations(session)
    MD->>GA: Get all changed files
    GA-->>MD: List of GitChange objects
    
    loop For each changed file
        MD->>FS: Analyze file path
        FS-->>MD: Path classification
        MD->>MD: Check content patterns
        
        alt Database-related file
            MD->>MD: Check for SQL DDL statements
            MD->>MD: Look for migration patterns
        else API-related file
            MD->>MD: Check for endpoint changes
            MD->>MD: Look for breaking changes
        else Configuration file
            MD->>MD: Check for breaking config changes
        end
    end
    
    MD->>MD: Compile migration analysis
    MD-->>PC: MigrationDetection result
```

### 3. Pre-PR Review Integration

```mermaid
graph LR
    Session[DevelopmentSession] --> PRPersona["`**PR Review Persona**
    - Name: 'PR Reviewer'
    - Focus: ['maintainability', 'security', 'performance']
    - Strictness: 'moderate'
    - Custom rules: PR-specific`"]
    
    PRPersona --> ReviewEngine[Review Engine]
    ReviewEngine --> AIAnalysis[AI Code Analysis]
    AIAnalysis --> FilterCritical["`**Filter Critical Issues**
    Priority: 'critical' | 'high'`"]
    
    FilterCritical --> HasCritical{Has Critical Issues?}
    HasCritical -->|Yes| DisplayIssues["`**Display Issues**
    - Issue description
    - File/line references  
    - Suggested fixes
    - Risk assessment`"]
    
    HasCritical -->|No| PassReview["`**Pass Review**
    ✅ No critical issues found`"]
    
    DisplayIssues --> UserChoice["`**User Decision**
    'Continue despite issues?'`"]
    UserChoice -->|No| CancelPR[Cancel PR Creation]
    UserChoice -->|Yes| ContinuePR[Continue PR Creation]
    PassReview --> ContinuePR
```

## Smart Context Generation

### 1. Repository Context Building

```mermaid
graph TB
    Session[DevelopmentSession] --> RepoInfo["`**Repository Information**
    - name: repository name
    - root: repository path
    - language: detected language
    - patterns: team patterns`"]
    
    Session --> ChangeMetadata["`**Change Metadata**
    - totalInsertions: line additions
    - totalDeletions: line removals
    - fileCount: changed files
    - changeComplexity: complexity level`"]
    
    Session --> BranchInfo["`**Branch Information**
    - head-branch: source branch
    - base-branch: target branch
    - staged: has staged changes
    - workingDir: working directory`"]
    
    RepoInfo --> Context[SmartPRContext]
    ChangeMetadata --> Context
    BranchInfo --> Context
    
    Context --> Template[PR Template]
    Context --> Migration[Migration Info]
    Context --> Complexity[Review Complexity]
```

### 2. AI Prompt Construction

```mermaid
graph LR
    Context[SmartPRContext] --> Builder[Prompt Builder]
    
    Builder --> Metadata["`**Repository Metadata**
    - Repository name and language
    - Branch information
    - File change statistics`"]
    
    Builder --> Changes["`**Change Analysis**
    - File list with change types
    - Key modifications summary
    - Complexity indicators`"]
    
    Builder --> Template["`**Template Requirements**
    - Expected sections
    - Checklist items
    - Format specifications`"]
    
    Builder --> Migration["`**Migration Context**
    - Migration detection results
    - Breaking change warnings
    - Required migration steps`"]
    
    Metadata --> Combine[Combine Components]
    Changes --> Combine
    Template --> Combine
    Migration --> Combine
    
    Combine --> AIPrompt[Complete AI Prompt]
```

## Output Format Variations

### 1. Terminal Output Structure

```mermaid
graph TB
    PRDescription[PR Description Object] --> Terminal[Terminal Formatter]
    
    Terminal --> Header["`**Header Section**
    📝 Generated PR
    ─────────────────
    Title: [PR Title]
    Complexity: [Level]`"]
    
    Terminal --> Description["`**Description Section**
    [Generated description content]`"]
    
    Terminal --> Checklist["`**Checklist Section**
    ☐ Item 1
    ☐ Item 2
    ☐ Item 3`"]
    
    Terminal --> Migration["`**Migration Warning**
    ⚠️ Migration Required
    Type: [migration type]
    Description: [details]`"]
```

### 2. Markdown Output Structure

```markdown
# [PR Title]

[PR Description content]

## Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Breaking changes documented

## ⚠️ Migration Required

**Type:** database
**Description:** Database schema changes detected
```

### 3. JSON Output Structure

```json
{
  "title": "feat(auth): implement OAuth2 JWT authentication",
  "description": "Comprehensive OAuth2 implementation...",
  "checklist": [
    "Tests added/updated",
    "Documentation updated"
  ],
  "migrationInfo": {
    "detected": true,
    "type": "api",
    "description": "API changes detected"
  },
  "reviewComplexity": "moderate"
}
```

## Integration Capabilities

### 1. GitHub Integration (Future)

```mermaid
sequenceDiagram
    participant PC as PRCreate
    participant GH as GitHub CLI
    participant API as GitHub API
    
    PC->>GH: gh pr create
    GH->>API: Create PR request
    API-->>GH: PR created response
    GH-->>PC: PR URL and details
    PC->>PC: Display success message
```

### 2. GitLab Integration (Future)

```mermaid
sequenceDiagram
    participant PC as PRCreate
    participant GL as GitLab CLI
    participant API as GitLab API
    
    PC->>GL: glab mr create
    GL->>API: Create MR request
    API-->>GL: MR created response
    GL-->>PC: MR URL and details
    PC->>PC: Display success message
```

## Error Handling Scenarios

### 1. Branch State Errors

| Error Scenario | Detection | Response | Recovery |
|---------------|-----------|----------|----------|
| **On base branch** | `currentBranch === baseBranch` | Clear error message | Switch to feature branch |
| **No remote branch** | Git push failure | Push guidance | `git push -u origin branch` |
| **Branch conflicts** | Git status check | Conflict resolution | Merge/rebase guidance |
| **Uncommitted changes** | Git status dirty | Stage/commit guidance | Stage changes first |

### 2. Migration Detection Errors

| Migration Type | Detection Pattern | Warning Level | Required Actions |
|---------------|------------------|---------------|------------------|
| **Database Schema** | CREATE/ALTER TABLE | High | Backup, migration window |
| **API Breaking** | Removed exports | Critical | Version bump, migration guide |
| **Config Changes** | Environment vars | Medium | Update deployment configs |
| **Dependency Updates** | package.json changes | Low | Update documentation |

### 3. AI Generation Failures

```mermaid
graph LR
    AIError[AI Generation Error] --> Classify{Error Classification}
    
    Classify -->|API Key Missing| KeyError["`**API Key Error**
    - Show configuration guidance
    - Point to mastro config:init
    - Provide manual alternative`"]
    
    Classify -->|Rate Limited| RateError["`**Rate Limit Error**
    - Show retry guidance
    - Suggest waiting period
    - Offer manual PR creation`"]
    
    Classify -->|Network Error| NetworkError["`**Network Error**
    - Check connectivity
    - Suggest retry
    - Provide offline workflow`"]
    
    Classify -->|Invalid Response| FormatError["`**Format Error**
    - Log error details
    - Retry with different prompt
    - Fallback to template`"]
```

## Performance Optimizations

### 1. Concurrent Operations

```mermaid
graph TB
    Start[PR Creation Start] --> Parallel{Parallel Processing}
    
    Parallel -->|Task 1| SessionAnalysis[Session Analysis]
    Parallel -->|Task 2| MigrationDetection[Migration Detection]
    Parallel -->|Task 3| TemplateGeneration[Template Generation]
    
    SessionAnalysis --> Merge[Merge Results]
    MigrationDetection --> Merge
    TemplateGeneration --> Merge
    
    Merge --> AIGeneration[AI PR Generation]
```

### 2. Caching Strategy

```mermaid
graph LR
    PRContext[PR Context] --> Cache{Check Cache}
    Cache -->|Hit| Adapt["`**Adapt Cached**
    - Similar context found
    - Adapt to current changes
    - Update metadata`"]
    
    Cache -->|Miss| Generate["`**Generate New**
    - Call AI service
    - Create PR description
    - Store in cache`"]
    
    Adapt --> Return1[Return Adapted]
    Generate --> Return2[Return New]
```

This comprehensive PR creation system provides intelligent, context-aware pull request generation with migration detection, pre-PR review integration, and smart template selection - streamlining the developer workflow from code changes to PR submission.