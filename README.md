# Mastro - AI-Powered Git CLI Extension

Mastro is an intelligent Git CLI extension that generates commit messages, diff explanations, PR descriptions, and code reviews using AI. Built with TypeScript and designed to be fast, non-intrusive, and immediately useful.

## 🚀 Current Status: Phase 3 Complete - Session Review & PR Management

### ✅ Phase 1: Foundation (Complete)

- **Full TypeScript CLI Framework** - Built with oclif for professional CLI experience
- **AI Client Abstraction** - Supports OpenAI with extensible architecture for other providers
- **Intelligent Git Analysis** - Advanced git diff parsing and semantic code analysis
- **Context Engine** - Smart analysis of code changes, impact assessment, and team patterns
- **Caching System** - In-memory caching for improved performance
- **Rich Terminal UI** - Colored output, spinners, and interactive refinement
- **Configuration Management** - Local and global config with environment variable support
- **Basic Commands** - `commit` and `config:init` commands implemented

### ✅ Phase 2A: Advanced Analysis (Complete)

- **Multi-Commit Analysis** - `mastro explain` supports single commits, ranges, and branches
- **Audience-Adaptive Explanations** - Target junior, senior, business, or technical audiences
- **Multiple Output Formats** - Terminal, markdown, and JSON output options
- **Semantic Code Analyzer** - Advanced understanding of code structure, complexity, and patterns
- **Impact Analyzer** - Business, technical, user, performance, security, and maintenance impact assessment
- **Framework Detection** - Automatic detection of React, Vue, Express, Django, Spring, and more

### ✅ Phase 2B: Intelligent Context Management (Complete)

- **Semantic Change Ranking** - Intelligent importance scoring based on change type and content
- **Dynamic Token Budget Management** - Adaptive compression with multiple strategies
- **Real-Time Complexity Analysis** - Proactive warnings for oversized changes
- **Principal Engineer AI Persona** - Enhanced prompts with authority and expertise context
- **Smart Context Preservation** - Replaces brute-force truncation with intelligent prioritization
- **Progressive Compression** - Full → Moderate → Aggressive → Minimal compression levels
- **Developer Guidance** - Commit size recommendations and optimal splitting suggestions

### ✅ Phase 3: Session Review & PR Management (Complete)

- **Session-Based Code Review** - `mastro review` analyzes current development session
- **Real-Time Streaming Responses** - Live AI feedback with animated progress indicators
- **Actionable TODO Generation** - Specific improvement items with effort estimates and priorities
- **Multiple Review Personas** - Security, performance, maintainability, testing focus areas
- **Smart PR Creation** - `mastro pr create` with intelligent templates and migration detection
- **Workflow Pattern Analysis** - Detects TDD, refactoring, feature development patterns
- **Rich Session UI** - Comprehensive session monitoring and progress tracking
- **Anti-Pattern Detection** - Identifies and suggests fixes for common development issues

## 🎯 Key Commands

```bash
# Initialize configuration
mastro config:init

# Generate commit message from staged changes  
mastro commit

# Interactive refinement mode
mastro commit --interactive

# Preview without committing
mastro commit --dry-run

# Explain code changes (single commit)
mastro explain

# Explain commit range
mastro explain HEAD~3..HEAD

# Explain branch changes
mastro explain feature-branch

# Target specific audience
mastro explain --audience=business

# Output as markdown
mastro explain --format=markdown

# Focus on impact analysis
mastro explain --impact

# 🌟 Session-based code review (MAIN FEATURE)
mastro review

# Security-focused review with strict standards
mastro review --persona=security --strictness=strict

# Real-time streaming review with progress
mastro review --stream

# Show only high-priority actionable items
mastro review --actionable-only --priority=high

# Review output as markdown
mastro review --format=markdown

# Smart PR creation with migration detection
mastro pr create

# Create PR with custom template and draft mode
mastro pr create --template=feature --draft

# Show help
mastro --help
mastro review --help
mastro pr create --help
```

## 🏗️ Architecture

```
mastro/
├── src/
│   ├── core/                          # Core AI and Git functionality
│   │   ├── ai-client.ts               # AI provider abstraction
│   │   ├── streaming-client.ts        # Real-time streaming AI responses
│   │   ├── git-analyzer.ts            # Advanced git analysis
│   │   ├── session-tracker.ts         # Development session management
│   │   ├── review-engine.ts           # Advanced code review logic
│   │   ├── workflow-analyzer.ts       # Pattern & workflow analysis
│   │   ├── context-engine.ts          # Intelligent code understanding
│   │   ├── cache-manager.ts           # Performance optimization
│   │   ├── semantic-change-ranker.ts  # Change importance scoring
│   │   ├── token-budget-manager.ts    # Dynamic token allocation
│   │   └── change-complexity-analyzer.ts # Real-time complexity analysis
│   ├── analyzers/                     # Advanced analysis engines
│   │   ├── semantic-analyzer.ts       # Code structure and pattern analysis
│   │   └── impact-analyzer.ts         # Multi-dimensional impact assessment
│   ├── commands/                      # CLI commands
│   │   ├── commit.ts                  # Intelligent commit generation
│   │   ├── explain.ts                 # Multi-commit diff analysis
│   │   ├── review.ts                  # 🌟 Session-based code review
│   │   ├── pr/                        # PR management commands
│   │   │   └── create.ts              # Smart PR creation
│   │   └── config/                    # Configuration commands
│   ├── ui/                            # Terminal UI components
│   │   ├── renderer.ts                # Rich output rendering
│   │   ├── streaming-renderer.ts      # Real-time streaming UI
│   │   ├── review-formatter.ts        # Multi-format review output
│   │   ├── session-ui.ts              # Session-specific UI components
│   │   ├── loading-states.ts          # Animated progress indicators
│   │   └── interactive.ts             # User interaction
│   └── base/
│       └── command.ts                 # Base command class
```

## 🔧 Installation & Setup

> **⚠️ Development Only**: This package is not yet published to npm. Use the development setup below.

### Development Setup (Required)
```bash
# Clone the repository
git clone https://github.com/your-org/mastro.git
cd mastro

# Install dependencies
npm install

# Build the project
npm run build

# Run locally
./bin/run.js --help

# Link for global access (recommended)
npm link

# Verify installation
mastro --version

# Set OpenAI API key
export OPENAI_API_KEY=your_api_key_here

# Initialize configuration
mastro config:init
```

## 🚦 Usage Examples

### Basic Commit Generation
```bash
# Stage some changes
git add .

# Generate intelligent commit message
mastro commit

# Preview without committing
mastro commit --dry-run
```

### Advanced Diff Analysis
```bash
# Explain the latest commit
mastro explain

# Analyze a range of commits
mastro explain HEAD~5..HEAD

# Compare with main branch
mastro explain main..feature-branch

# Business-friendly explanation
mastro explain --audience=business --format=markdown

# Technical deep-dive with impact focus
mastro explain --audience=technical --impact
```

### 🌟 Session-Based Code Review (Main Feature)
```bash
# Review current development session
mastro review

# Security-focused review with strict standards
mastro review --persona=security --strictness=strict

# Performance-focused review
mastro review --persona=performance

# Stream responses with real-time feedback
mastro review --stream

# Show only actionable items
mastro review --actionable-only

# Focus on high-priority issues
mastro review --priority=high

# Export review as markdown
mastro review --format=markdown

# Interactive mode with follow-up actions
mastro review --interactive
```

### Smart PR Creation
```bash
# Auto-detect PR type and create with smart template
mastro pr create

# Create feature PR with draft mode
mastro pr create --template=feature --draft

# Custom title and migration check
mastro pr create --title="Add authentication" --migration-check

# Push branch and create PR
mastro pr create --push

# Skip pre-PR review
mastro pr create --skip-review

# Different base branch
mastro pr create --base-branch=develop
```

## 🎨 Special Features

### 🌟 Session-Based Intelligence
- **Development Session Tracking**: Monitors changes from last commit/branch point
- **Real-Time Risk Assessment**: Continuously evaluates change complexity and impact
- **Pattern Detection**: Identifies TDD, refactoring, feature development, hotfix patterns
- **Workflow Optimization**: Suggests commit strategies, testing approaches, documentation needs

### Advanced Review Capabilities
- **Multiple Personas**: Security, performance, maintainability, testing focus areas
- **Actionable TODO Generation**: Specific improvement items with effort estimates
- **Priority-Based Filtering**: Critical, high, medium, low priority classification
- **Anti-Pattern Detection**: Identifies large commits, missing tests, mixed concerns
- **Streaming Responses**: Real-time AI feedback with animated progress indicators

### Smart PR Management
- **Intelligent Templates**: Auto-detects PR type (feature, bugfix, hotfix, refactor, docs)
- **Migration Detection**: Identifies database, API, breaking changes with migration steps  
- **Pre-PR Review**: Catches issues before creating PR to improve quality
- **Template Customization**: Configurable sections, checklists, and reviewer assignments

### Intelligence & Context Management
- **Semantic Change Ranking**: Automatically identifies critical vs. cosmetic changes
- **Dynamic Token Budgeting**: Adaptive compression based on change importance
- **Progressive Enhancement**: Fast local heuristics + AI streaming
- **Principal Engineer Persona**: AI responds with authority and deep technical expertise

### Analysis Capabilities
- **Multi-Dimensional Impact**: Business, technical, user, performance, security analysis
- **Framework-Aware**: Understands React, Vue, Express, Django, Spring patterns
- **Complexity Warnings**: Real-time feedback on change size and risk
- **Code Structure Analysis**: Function, class, import/export detection

### User Experience
- **Team Learning**: Analyzes existing commit patterns to match team style
- **Interactive Refinement**: "Make it more technical", "Add performance implications", etc.
- **Rich Terminal UI**: Professional CLI experience with colors and spinners
- **Multiple Output Formats**: Terminal, Markdown, JSON, HTML for different use cases
- **Session Monitoring**: Live tracking of development progress and statistics

## 🧠 Intelligent Features Deep Dive

### Semantic Change Ranking
- **Critical Changes**: API changes, exports, security patterns, database schema
- **High Priority**: Core business logic, error handling, async operations
- **Smart File Scoring**: Package.json (95%), TypeScript (80%), tests (40%), docs (30%)
- **Pattern Recognition**: Breaking changes, framework usage, complexity metrics

### Token Budget Management
- **Compression Levels**: Full → Moderate → Aggressive → Minimal
- **Smart Strategies**: Test file summarization, signature-only mode, documentation compression
- **Quality Preservation**: Always prioritizes critical changes over cosmetic ones
- **Efficiency Metrics**: Shows percentage of important content preserved

### Complexity Analysis & Warnings
- **Real-Time Feedback**: File count, line count, critical change thresholds
- **Breaking Change Detection**: Function removals, export changes, API modifications
- **Commit Size Recommendations**: Suggests optimal splitting strategies
- **Risk Assessment**: Low/Medium/High/Critical with specific guidance

## 🚀 Phase 3 Highlights

### ⭐ Mastro Review - The Main Star
The centerpiece of Phase 3 is **session-based code review** that provides proactive feedback during development:

- **Smart Session Tracking**: Automatically tracks all changes since last commit/branch point
- **Real-Time Feedback**: Streaming AI responses with live progress indicators
- **Actionable Items**: Specific TODOs with priority levels and effort estimates
- **Multiple Review Personas**: Security, performance, maintainability, testing focus
- **Anti-Pattern Detection**: Catches large commits, missing tests, mixed concerns early
- **Quality Gates**: Pre-PR review to improve code quality before human review

### 🔧 Smart PR Creation
Complete PR workflow with intelligent automation:

- **Auto-Detection**: Automatically determines PR type based on changes and branch names
- **Migration Detection**: Identifies database, API, and breaking changes with migration steps
- **Smart Templates**: Context-aware PR descriptions with relevant sections and checklists
- **Pre-PR Review**: Integrated code review to catch issues before PR creation

## 🚀 Phase 4: Advanced Intelligence & Developer Experience

> **Mission: Maximize developer quality-of-life while promoting best coding practices through proactive intelligence and seamless integrations**

### 🎯 Phase 4 Vision

Phase 4 transforms mastro from a reactive tool into a **proactive development companion** that anticipates needs, prevents issues, and guides developers toward excellence. The focus is on eliminating friction, reducing cognitive load, and making best practices the path of least resistance.

### 🌟 Tier 1: Proactive Intelligence (Q1 2024)

#### **Smart Commit Splitting & Auto-Staging**
- **Intelligent Boundary Detection**: AI-powered analysis to identify logical commit boundaries
- **Auto-Staging Suggestions**: Automatically stage related changes based on semantic analysis
- **Progressive Commit Workflow**: Guide developers through optimal commit sequences
- **Conflict Prevention**: Detect and prevent merge conflicts before they occur

#### **Real-Time Development Guidance**
- **Live Code Quality Feedback**: Continuous analysis during development
- **Pattern Learning & Adaptation**: Automatically adapt to team-specific coding styles
- **Proactive Best Practice Suggestions**: Context-aware recommendations as you code
- **Smart Refactoring Opportunities**: Identify and suggest improvements in real-time

#### **Enhanced Session Intelligence**
- **Development Session Recording**: Track productivity patterns and optimization opportunities
- **Focus Mode**: Distraction-free development with smart notification batching
- **Session Analytics**: Personal productivity insights and trends
- **Automated Testing Suggestions**: Generate test cases based on code changes

### 🔧 Tier 2: Seamless Integrations (Q2 2024)

#### **IDE Deep Integration**
- **VS Code Extension**: Real-time analysis with inline suggestions and notifications
- **IntelliJ/WebStorm Plugin**: JetBrains IDE integration with full feature parity
- **Vim/Neovim Integration**: Terminal-based development workflow enhancement
- **Universal Language Server**: Protocol-based integration for any editor

#### **Git Workflow Automation**
- **Pre-commit Hook Intelligence**: Automated quality gates with AI-powered validation
- **Smart Conflict Resolution**: AI-assisted merge conflict resolution with context awareness
- **Branch Management**: Intelligent branch naming, cleanup, and lifecycle management
- **Automated Rebase Strategies**: Smart rebase recommendations and execution

#### **CI/CD Integration Excellence**
- **GitHub Actions Integration**: Automated PR quality analysis and feedback
- **GitLab CI Integration**: Comprehensive pipeline integration with quality gates
- **Jenkins Plugin**: Enterprise CI/CD integration with team analytics
- **Custom Webhook Support**: Flexible integration with any CI/CD system

### 🏢 Tier 3: Team & Enterprise Features (Q3 2024)

#### **Team Collaboration Platform**
- **Team Analytics Dashboard**: Code quality trends, velocity metrics, and team health
- **Shared Knowledge Base**: Team-specific best practices, patterns, and guidelines
- **Mentorship Mode**: AI-powered guidance system for junior developers
- **Code Review Assignment**: Intelligent reviewer matching based on expertise and availability
- **Technical Debt Tracking**: Automated identification, prioritization, and resolution tracking

#### **Enterprise Workflow Integration**
- **Issue Tracker Integration**: Automatic linking of commits/PRs to tickets (Jira, Linear, etc.)
- **Sprint Planning Assistant**: Velocity-based story point estimation and planning
- **Documentation Generation**: Auto-update technical documentation based on code changes
- **Compliance & Security**: Automated compliance checking and security scanning integration

#### **Advanced AI Capabilities**
- **Multi-Provider Support**: Anthropic Claude, Google Bard, local models, and custom endpoints
- **Fine-Tuned Models**: Team-specific model training for enhanced accuracy
- **Context-Aware Learning**: Continuous improvement based on team feedback and patterns
- **Advanced Reasoning**: Complex architectural decision support and system design guidance

### 🎮 Tier 4: Next-Generation Experience (Q4 2024)

#### **Innovative Interface Options**
- **Voice Commands**: Voice-to-commit message generation and hands-free operation
- **Mobile Companion App**: Review PRs, approve changes, and monitor team activity on mobile
- **AR/VR Code Review**: Immersive code review experiences for complex systems
- **AI Chat Interface**: Natural language interaction for all mastro functionality

#### **Intelligent Automation**
- **Predictive Development**: Anticipate needed changes based on patterns and context
- **Automated Code Maintenance**: Self-maintaining code with AI-driven updates
- **Smart Performance Monitoring**: Track code change impact on system performance
- **Intelligent Error Prevention**: Proactive identification and prevention of common errors

#### **Advanced Analytics & Insights**
- **Machine Learning Pipeline**: Advanced pattern recognition and predictive analytics
- **Team Performance Optimization**: Data-driven insights for team productivity improvement
- **Codebase Health Scoring**: Comprehensive health metrics with actionable improvement plans
- **Predictive Maintenance**: Identify components requiring attention before issues arise

### 🛣️ Implementation Roadmap

#### **Q1 2024: Foundation Enhancement**
- [ ] **Smart Commit Splitting**: AI boundary detection and staging recommendations
- [ ] **Real-Time Guidance**: Live code quality feedback during development
- [ ] **Session Recording**: Development pattern tracking and analytics
- [ ] **Pattern Learning**: Adaptive team style recognition

#### **Q2 2024: Integration Expansion**
- [ ] **VS Code Extension**: Full-featured IDE integration with real-time analysis
- [ ] **Git Hook Automation**: Intelligent pre-commit and pre-push validation
- [ ] **CI/CD Plugins**: GitHub Actions and GitLab CI integration
- [ ] **Universal LSP**: Language server protocol implementation

#### **Q3 2024: Team Features**
- [ ] **Analytics Dashboard**: Team productivity and quality metrics
- [ ] **Knowledge Base**: Shared team standards and best practices
- [ ] **Enterprise Integration**: Issue tracking and project management tools
- [ ] **Advanced AI Models**: Multi-provider support and fine-tuning

#### **Q4 2024: Innovation Layer**
- [ ] **Mobile Companion**: iOS/Android app for remote code review
- [ ] **Voice Interface**: Hands-free development workflow
- [ ] **Predictive Features**: Anticipatory development assistance
- [ ] **ML Pipeline**: Advanced pattern recognition and insights

### 🎯 Success Metrics & Goals

#### **Developer Quality of Life**
- **50% reduction** in time spent on commit message writing
- **75% reduction** in PR review iterations through proactive quality gates
- **90% adoption rate** within teams using mastro for 30+ days
- **40% improvement** in code review feedback quality and specificity

#### **Code Quality Improvements**
- **60% reduction** in post-deployment bugs through proactive analysis
- **45% increase** in test coverage through automated test generation suggestions
- **30% improvement** in code maintainability scores
- **80% reduction** in security vulnerabilities through proactive scanning

#### **Team Productivity**
- **25% increase** in development velocity through workflow optimization
- **50% reduction** in context switching through intelligent batching
- **35% improvement** in code review turnaround time
- **20% increase** in developer satisfaction scores

### 🌱 Community & Open Source Strategy

#### **Plugin Marketplace**
- **Open Plugin Architecture**: Community-driven extensions and integrations
- **Plugin Discovery**: Searchable marketplace with ratings and reviews
- **Developer Tools**: Comprehensive SDK and documentation for plugin creation
- **Revenue Sharing**: Sustainable ecosystem with plugin monetization options

#### **Community Engagement**
- **Contributor Program**: Structured onboarding and mentorship for contributors
- **Feature Voting**: Community-driven feature prioritization and roadmap input
- **User Groups**: Regional and virtual meetups for knowledge sharing
- **Documentation Contributions**: Community-driven documentation and tutorials

### 🔄 Continuous Innovation

Phase 4 establishes mastro as the definitive AI-powered development companion, but innovation doesn't stop there. Future phases will explore:

- **Autonomous Development**: AI agents that can implement features end-to-end
- **Cross-Team Collaboration**: Multi-repository, multi-team workflow optimization
- **Educational Integration**: University and bootcamp partnerships for developer education
- **Industry Standardization**: Contributing to development workflow standards and best practices

---

*Phase 4 represents our commitment to making software development more joyful, productive, and high-quality through intelligent automation and seamless user experience.*

## 🛠️ Development

```bash
# Development mode
npm run dev

# Type checking
npm run build

# Linting
npm run lint

# Test on the project itself
mastro explain --format=markdown
```

## 💡 Technical Highlights

- **TypeScript**: Strict typing with comprehensive error handling
- **Intelligent Context Management**: Replaces brute-force truncation with semantic understanding
- **Multi-Layer Analysis**: Semantic patterns + Impact assessment + Complexity scoring
- **Performance Optimized**: Smart caching and progressive enhancement
- **Production Ready**: Proper error handling, logging, and configuration
- **Extensible Architecture**: Plugin system for AI providers and custom logic

## 🏆 AI Engineering Excellence

- **Principal Software Engineer Persona**: AI responses with 15+ years of authority and expertise
- **Context-Aware Prompts**: Intelligent prompt engineering based on change complexity
- **Token Optimization**: Preserves 70-100% of important content even with large changesets
- **Quality-First Approach**: Always prioritizes code quality and maintainability insights

---

Built with ❤️ using TypeScript, oclif, and OpenAI.