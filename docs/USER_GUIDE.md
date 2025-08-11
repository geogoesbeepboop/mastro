# Mastro User Guide

> **AI-Powered Git CLI Extension for Developer Excellence**

Mastro is an intelligent Git CLI extension that transforms how developers interact with version control by providing AI-powered commit messages, code explanations, pull request descriptions, and comprehensive code reviews. Built with TypeScript and designed to be fast, non-intrusive, and immediately useful.

## 📚 Table of Contents

1. [Tech Stack & Architecture](#tech-stack--architecture)
2. [Installation & Setup](#installation--setup)
3. [Configuration Guide](#configuration-guide)
4. [Core Commands](#core-commands)
5. [Workflow Orchestration](#workflow-orchestration)
6. [Boundary-Based Development](#boundary-based-development)
7. [Error Recovery & Troubleshooting](#error-recovery--troubleshooting)
8. [Documentation Generation](#documentation-generation)
9. [Use Cases & Workflows](#use-cases--workflows)
10. [Team Integration](#team-integration)
11. [Best Practices](#best-practices)

## 🏗️ Tech Stack & Architecture

### Core Technologies
- **TypeScript 5.4+**: Strict typing with comprehensive error handling
- **oclif**: Professional CLI framework with plugin architecture
- **OpenAI GPT-4**: AI provider with extensible architecture for future providers
- **simple-git**: Git operations and repository analysis
- **Node.js 18+**: Modern JavaScript runtime

### Key Dependencies
```json
{
  "runtime": {
    "chalk": "Terminal styling and colors",
    "ora": "Elegant terminal spinners",
    "node-cache": "In-memory caching system",
    "cosine-similarity": "Semantic change analysis",
    "zod": "Schema validation"
  },
  "development": {
    "vitest": "Fast unit testing framework",
    "eslint": "Code linting and style enforcement",
    "tsx": "TypeScript execution for development"
  }
}
```

### Architecture Principles
- **Modular Design**: Separated concerns with clear interfaces
- **Extensible AI Providers**: Plugin architecture for multiple AI services
- **Intelligent Caching**: Context-aware caching with similarity matching
- **Type Safety**: Comprehensive TypeScript interfaces throughout
- **Principal Engineer Persona**: AI responses with authority and expertise

## 🚀 Installation & Setup

### Prerequisites
- **Node.js 18.0.0** or higher
- **Git 2.20** or higher
- **OpenAI API Key** (required for AI features)

### Installation

> **⚠️ Development Only**: This package is not yet published to npm. Use the development setup below.

#### Development Setup (Required)
```bash
# Clone the repository
git clone https://github.com/your-org/mastro.git
cd mastro

# Install dependencies
npm install

# Build the project
npm run build

# Link for global access (recommended)
npm link

# Verify installation
mastro --version
mastro --help
```

### Environment Setup

#### OpenAI API Configuration
```bash
# Method 1: Environment Variable (Recommended)
export OPENAI_API_KEY="your_openai_api_key_here"

# Method 2: Configuration File (see Configuration Guide)
mastro config:init
```

#### Verify Setup
```bash
# Test basic functionality
mastro --help

# Test AI integration
git add . && mastro commit --dry-run
```

## ⚙️ Configuration Guide

### Initial Configuration
```bash
# Interactive configuration setup
mastro config:init

# This creates ~/.mastro/config.json with default settings
```

### Configuration Schema

#### Global Configuration (`~/.mastro/config.json`)
```json
{
  "ai": {
    "provider": "openai",
    "apiKey": "your_api_key_here",
    "model": "gpt-4",
    "maxTokens": 4096,
    "temperature": 0.3
  },
  "git": {
    "defaultBranch": "main",
    "includeUntracked": false,
    "maxDiffSize": 50000
  },
  "cache": {
    "enabled": true,
    "ttl": 3600,
    "maxSize": 100
  },
  "team": {
    "commitStyle": "conventional",
    "prefixes": ["feat", "fix", "docs", "style", "refactor", "test", "chore"],
    "maxLength": 72,
    "commonPhrases": ["update", "add", "remove", "fix", "improve"],
    "reviewPersona": {
      "name": "Senior Engineer",
      "focus": ["maintainability", "performance"],
      "strictness": "moderate",
      "customRules": []
    }
  },
  "ui": {
    "spinner": true,
    "colors": true,
    "interactive": true
  }
}
```

#### Project Configuration (`./mastro.config.json`)
```json
{
  "extends": "~/.mastro/config.json",
  "team": {
    "commitStyle": "conventional",
    "prefixes": ["feat", "fix", "docs", "refactor"],
    "reviewPersona": {
      "name": "Security Engineer",
      "focus": ["security", "maintainability"],
      "strictness": "strict",
      "customRules": [
        "Check for sensitive data exposure",
        "Validate input sanitization"
      ]
    }
  }
}
```

### Environment Variables
```bash
# AI Configuration
OPENAI_API_KEY="your_api_key"
MASTRO_MODEL="gpt-4"
MASTRO_TEMPERATURE="0.3"

# Feature Flags
MASTRO_CACHE_ENABLED="true"
MASTRO_UI_COLORS="true"
MASTRO_DEBUG="false"
```

## 🎯 Core Commands

### `mastro commit` - AI-Powered Commit Messages

Generate intelligent commit messages from staged changes with team pattern matching.

#### Basic Usage
```bash
# Stage changes and generate commit message
git add .
mastro commit

# Preview without committing
mastro commit --dry-run

# Interactive refinement mode
mastro commit --interactive
```

#### Advanced Options
```bash
# Use specific commit template
mastro commit --template=feat

# Learn from this commit for future improvements
mastro commit --learn

# Disable caching for this commit
mastro commit --no-cache
```

#### Example Output
```
🎯 Generated Commit Message
─────────────────────────────────

Title: feat(auth): implement OAuth2 JWT token validation with role-based access

Type: feat
Scope: auth
Confidence: 95%

Body:
- Add JWT token validation middleware with RS256 signature verification
- Implement role-based access control with user permissions matrix
- Update authentication flow to support refresh token rotation
- Add comprehensive error handling for token expiration scenarios

Reasoning: Changes introduce a new authentication feature with proper security patterns,
following conventional commit style with clear scope and detailed body.

Apply this commit message? (y/n)
```

### `mastro explain` - Multi-Commit Analysis

Explain code changes with comprehensive technical and business impact analysis.

#### Basic Usage
```bash
# Explain latest commit
mastro explain

# Explain specific commit
mastro explain HEAD~3

# Explain commit range
mastro explain HEAD~5..HEAD

# Explain branch changes
mastro explain feature-branch
```

#### Advanced Options
```bash
# Focus on business impact
mastro explain --impact

# Target specific audience
mastro explain --audience=business
mastro explain --audience=junior
mastro explain --audience=technical

# Output as markdown
mastro explain --format=markdown

# Limit commits in range analysis
mastro explain HEAD~10..HEAD --max-commits=5
```

#### Example Output
```
📊 Code Change Analysis
─────────────────────────────────

Summary: Implementation of OAuth2 authentication system with JWT token validation

Impact Analysis:
• Risk Level: MEDIUM
• Scope: MODULE  
• Affected Components: Authentication, Authorization, User Management
• Testing Recommendations: Unit tests for JWT validation, integration tests for auth flow

Technical Details:
• Added RS256 signature verification for enhanced security
• Implemented role-based access control with permission matrix
• Updated middleware chain to support token refresh rotation
• Enhanced error handling for various token scenarios

Business Context:
This change enables secure user authentication for the application, supporting 
role-based access and improving overall security posture. The implementation 
follows industry best practices for OAuth2 and JWT handling.

Migration Notes:
• No database migrations required
• Environment variables needed: JWT_SECRET, JWT_EXPIRY
• Update API documentation for new authentication endpoints
```

### `mastro review` - Session-Based Code Review

🌟 **Main Feature**: Comprehensive code review of your current development session with actionable feedback.

#### Basic Usage
```bash
# Review current development session
mastro review

# Stream responses with real-time progress
mastro review --stream

# Show only actionable items
mastro review --actionable-only
```

#### Review Personas
```bash
# Security-focused review
mastro review --persona=security --strictness=strict

# Performance optimization review
mastro review --persona=performance

# Maintainability and code quality review
mastro review --persona=maintainability

# Testing and coverage review
mastro review --persona=testing
```

#### Output Formats & Filtering
```bash
# Export as markdown
mastro review --format=markdown

# Focus on high-priority issues
mastro review --priority=high

# Interactive mode with follow-up actions
mastro review --interactive
```

#### Example Output
```
🔍 Session Code Review
─────────────────────────────────

📊 Overall Assessment
🌟 GOOD (85% confidence)
Code quality is solid with room for improvement in error handling and test coverage.

🎯 Actionable Items
─────────────────────
📝 Add error handling for JWT validation failures Quick
   src/middleware/auth.ts:42
   Missing try-catch blocks could cause unhandled promise rejections
   💡 Wrap jwt.verify() in try-catch and return proper error responses

🔧 Extract token validation logic into separate service Medium  
   src/middleware/auth.ts:25-60
   Current implementation mixes concerns within middleware
   💡 Create AuthService class to handle token validation logic

🧪 Add unit tests for new authentication methods Medium
   Missing test coverage for critical authentication paths
   💡 Create auth.test.ts with comprehensive JWT validation test cases

💡 Code Suggestions
─────────────────────
⚡ Consider implementing token caching for performance
   Repeated JWT validation could be optimized with short-term caching

🔒 Add rate limiting for authentication endpoints  
   Protect against brute force attacks with request rate limiting

👏 Great Work
─────────────────────
✓ Excellent use of TypeScript interfaces for type safety
✓ Proper separation of concerns in middleware design
✓ Clear and descriptive variable naming throughout
```

### `mastro pr create` - Smart PR Creation

Create intelligent pull requests with AI-generated descriptions and migration detection.

#### Basic Usage
```bash
# Auto-detect PR type and create with smart template
mastro pr create

# Create as draft PR
mastro pr create --draft

# Push branch before creating PR
mastro pr create --push
```

#### Advanced Options
```bash
# Use specific template
mastro pr create --template=feature
mastro pr create --template=bugfix
mastro pr create --template=hotfix

# Custom title and migration check
mastro pr create --title="Add OAuth2 authentication"

# Skip pre-PR code review
mastro pr create --skip-review

# Different base branch
mastro pr create --base-branch=develop
```

#### Example Output
```
📝 Generated PR
─────────────────────────────────

Title: feat(auth): implement OAuth2 JWT authentication system
Complexity: moderate

Description:
This PR introduces a comprehensive OAuth2 authentication system with JWT token 
validation, addressing security requirements for user access control.

## Changes Made
- Implemented JWT token validation middleware with RS256 signatures
- Added role-based access control with permissions matrix
- Created token refresh rotation mechanism
- Enhanced error handling for authentication failures

## Testing
- [ ] Unit tests for JWT validation logic
- [ ] Integration tests for authentication flow  
- [ ] Manual testing of token refresh scenarios
- [ ] Security testing for edge cases

⚠️ Migration Required
Type: api
Description: API changes detected - may require client updates

🚀 Creating PR...
✅ PR created successfully!
🔗 https://github.com/your-org/your-repo/pull/123
```

### `mastro split` - Smart Commit Splitting & Auto-Staging

Analyze working directory changes to detect logical commit boundaries and suggest optimal staging strategies for better commit hygiene.

#### Basic Usage
```bash
# Analyze current working changes
mastro split

# Auto-stage files according to detected boundaries
mastro split --auto-stage

# Preview analysis without making changes
mastro split --dry-run

# Output analysis as JSON
mastro split --format=json
```

#### Advanced Options
```bash
# Interactive boundary customization
mastro split --interactive

# Ignore specific file patterns
mastro split --ignore="*.test.js,docs/*"

# Set complexity threshold for boundary detection
mastro split --complexity-threshold=7

# Force boundary detection even for small changes
mastro split --force
```

#### Example Output
```
🧩 Commit Boundary Analysis
─────────────────────────────────

Found 3 logical commit boundaries:

🔥 HIGH PRIORITY: Authentication System Updates
   Files: src/auth/jwt-validator.ts, src/middleware/auth.ts, src/types/user.ts
   Theme: Core authentication functionality changes
   Complexity: 8.5/10 | Risk: MEDIUM
   Dependencies: None
   
   Suggested Message: feat(auth): implement JWT validation with role-based access
   
   Rationale: These files form a cohesive authentication module with shared
   interfaces and dependencies. Changes implement a complete feature that should
   be committed together.

⚡ MEDIUM PRIORITY: UI Component Styling  
   Files: src/components/LoginForm.scss, src/components/UserProfile.scss
   Theme: User interface styling updates
   Complexity: 3.2/10 | Risk: LOW
   Dependencies: None
   
   Suggested Message: style(ui): update authentication form styles
   
   Rationale: Styling changes are isolated and don't affect functionality.
   Can be committed separately without breaking changes.

📝 LOW PRIORITY: Documentation Updates
   Files: README.md, docs/auth-setup.md, CHANGELOG.md
   Theme: Documentation and configuration updates
   Complexity: 1.8/10 | Risk: LOW
   Dependencies: Authentication System Updates
   
   Suggested Message: docs: update authentication setup guide
   
   Rationale: Documentation changes support the authentication feature but
   should be committed after the main functionality.

🎯 Recommended Staging Strategy: PROGRESSIVE
   1. Stage and commit authentication system (high impact)
   2. Stage and commit UI styling (visual improvements)  
   3. Stage and commit documentation (supporting materials)

⚠️  Potential Issues:
   • Large commit detected - consider splitting further
   • Mixed concerns in auth files - review for single responsibility

Apply suggested staging strategy? (y/n/customize)
```

### `mastro analytics` - Enhanced Session Intelligence

Display comprehensive productivity analytics and insights from development sessions with focus mode and personalized recommendations.

#### Basic Usage
```bash
# Show current session analytics
mastro analytics

# Display detailed insights and recommendations
mastro analytics --insights

# Output analytics as JSON
mastro analytics --format=json

# Generate markdown report
mastro analytics --format=markdown
```

#### Advanced Options
```bash
# Enable focus mode for distraction-free development
mastro analytics --focus-mode

# Analyze specific time period
mastro analytics --period=week
mastro analytics --period=month  
mastro analytics --period=quarter

# Show productivity trends
mastro analytics --trends

# Export analytics to file
mastro analytics --export=analytics-report.json

# Update current session data
mastro analytics --update-current
```

#### Example Output
```
📊 Mastro Productivity Analytics
─────────────────────────────────

Current Session: feat-authentication-system
Started: 2 hours 34 minutes ago
Status: Active | Focus Mode: OFF

📈 Productivity Metrics
   Velocity Score: 87/100 (Excellent)
   Lines per Minute: 4.2 (Above Average) 
   Files Modified/Hour: 8.5 (High)
   Commit Frequency: 2.1/hour (Optimal)
   Refactoring Ratio: 23% (Healthy)

🎯 Focus Metrics  
   Focus Score: 92/100 (Excellent)
   Distraction Events: 2 (Low)
   Deep Work Sessions: 3 (25+ min periods)
   Context Switch Frequency: 0.8/hour (Excellent)
   Average Focus Session: 42 minutes

🔍 Detected Patterns
   ✅ Test-Driven Development (95% confidence)
      Evidence: Test files created before implementation
      Impact: Positive - improving code quality
      
   ✅ Refactor-First Approach (87% confidence)  
      Evidence: Code cleanup before new features
      Impact: Positive - maintaining technical debt
      
   📊 Feature Branch Workflow (78% confidence)
      Evidence: Focused changes in feature branch
      Impact: Neutral - standard development practice

🎯 Quality Metrics
   Test Coverage Increase: +12% (Excellent)
   Code Complexity Trend: Improving (↗️)
   Documentation Updates: 3 files (Good)
   Security Considerations: 2 improvements (Good)

💡 Personalized Insights
   • Your peak productivity hours: 9-11 AM, 2-4 PM
   • Optimal session length: 35-45 minutes  
   • Consider breaking after 90 minutes for best focus
   • TDD pattern working well - maintain this approach
   • Authentication work aligns with security best practices

🚀 Recommendations
   • Enable focus mode for the next 30 minutes
   • Schedule a break - you've been coding for 2.5 hours
   • Consider committing current auth changes (good boundary)
   • Document authentication decisions while context is fresh

Weekly Trend: +15% productivity vs last week
Monthly Trend: +8% velocity improvement
```

### `mastro hooks` - Pre-commit Hook Intelligence

Manage intelligent pre-commit hooks with AI-powered code validation and customizable quality gates.

#### Basic Usage
```bash
# Install AI-powered pre-commit hooks
mastro hooks install

# Check current hook status
mastro hooks status

# Validate current changes (without committing)
mastro hooks validate

# Uninstall hooks
mastro hooks uninstall
```

#### Advanced Options
```bash
# Install with specific strictness level
mastro hooks install --strictness=strict
mastro hooks install --strictness=moderate  
mastro hooks install --strictness=lenient

# Use specific review persona
mastro hooks install --persona=security
mastro hooks install --persona=performance
mastro hooks install --persona=maintainability

# Configure hook settings
mastro hooks configure

# Force reinstall (overwrite existing)
mastro hooks install --force

# Set custom thresholds
mastro hooks install --critical=3 --high=8

# Skip specific file patterns
mastro hooks install --skip="*.test.js,vendor/*"
```

#### Hook Strictness Levels

**Lenient Mode** - Basic quality checks
- Blocks only critical security issues
- Warns on high-priority problems  
- Fast execution (< 5 seconds)

**Moderate Mode** (Default) - Balanced quality gates
- Blocks critical and high-priority issues
- Comprehensive code analysis
- Reasonable execution time (5-15 seconds)

**Strict Mode** - Comprehensive validation
- Blocks critical, high, and selected medium issues
- Detailed security, performance, and maintainability checks
- Longer execution time (15-30 seconds)

#### Example Output
```
🛡️ Mastro Pre-commit Hook Status
─────────────────────────────────

Hook Status: ✅ ACTIVE
Strictness Level: moderate
Review Persona: Senior Engineer (maintainability focus)
Last Updated: 2 hours ago

📊 Hook Configuration
   Critical Issue Threshold: 0 (blocks commit)
   High Priority Threshold: 5 (blocks commit)  
   Medium Priority Threshold: 15 (warning only)
   Timeout: 15 seconds
   Skip Patterns: *.test.js, docs/*, vendor/*

🔍 Recent Validations (Last 24h)
   ✅ feat: add user authentication - PASSED (8 seconds)
      Issues Found: 0 critical, 2 high, 5 medium
      Action: Commit allowed with warnings
      
   ❌ fix: update password validation - BLOCKED (12 seconds)  
      Issues Found: 1 critical, 4 high, 8 medium
      Action: Commit blocked - fix critical security issue
      
   ✅ docs: update API documentation - PASSED (3 seconds)
      Issues Found: 0 critical, 0 high, 1 medium  
      Action: Commit allowed - documentation changes

⚡ Performance Metrics
   Average Execution Time: 9.2 seconds
   Success Rate: 78% (7/9 attempts)
   False Positive Rate: < 5%

🎯 Quality Improvements Since Installation
   • 23% reduction in post-deployment bugs
   • 34% improvement in code review feedback
   • 45% increase in test coverage consistency
   • 67% reduction in security vulnerabilities

Next Validation: On commit attempt
Hook Update Available: v1.2.1 (security improvements)
```

## 📚 Documentation Generation

Mastro includes a powerful AI-powered documentation generation system that automatically creates comprehensive project documentation. The documentation engine analyzes your codebase, detects architectural patterns, and generates professional documentation in multiple formats.

### Overview

The Documentation Engine provides:
- **Intelligent Analysis**: Deep project structure and code analysis
- **AI-Powered Content**: Contextual documentation generated by AI
- **Multiple Formats**: Markdown, JSON, HTML, OpenAPI specifications
- **Mermaid Diagrams**: Automatic generation of system and workflow diagrams
- **Template System**: Extensible templates for custom documentation styles

### `mastro docs` - Generate All Documentation

Generate comprehensive documentation for your entire project.

#### Basic Usage
```bash
# Generate all documentation types
mastro docs

# Generate specific documentation type
mastro docs api
mastro docs architecture
mastro docs user-guide

# Specify output directory
mastro docs --output-dir ./documentation
```

#### Advanced Options
```bash
# Include private functions and classes
mastro docs --include-private

# Include TODO comments in documentation
mastro docs --include-todos

# Generate with Mermaid diagrams
mastro docs --generate-mermaid

# Use custom templates
mastro docs --template ./custom-templates

# Output in different formats
mastro docs --format json
mastro docs --format html
```

### `mastro docs api` - API Documentation

Generate comprehensive API documentation with OpenAPI support.

#### Usage Examples
```bash
# Generate API documentation
mastro docs api

# Include private APIs
mastro docs api --include-private

# Generate OpenAPI specification
mastro docs api --format openapi

# Group endpoints by method
mastro docs api --group-by method

# Specify base URL for examples
mastro docs api --base-url https://api.yourapp.com
```

#### Example Output
```
📡 API Analysis Results
──────────────────────
API Files: 12
Total Endpoints: 34
HTTP Methods: GET(18), POST(8), PUT(5), DELETE(3)
Framework: express

📂 API Files:
   src/routes/users.ts (8 endpoints)
   src/routes/auth.ts (6 endpoints)
   src/routes/projects.ts (12 endpoints)
   ... and 9 more files

✅ API Documentation Generated
════════════════════════════════════════
📄 Generated: api.md (127KB)
🎯 Documented 34 API endpoints
📂 Analyzed 12 API files
📑 Created 8 documentation sections
🔧 Format: markdown
📁 Output: ./docs/
```

### `mastro docs architecture` - System Architecture

Generate system architecture documentation with diagrams.

#### Usage Examples
```bash
# Generate architecture documentation
mastro docs architecture

# Include dependency analysis
mastro docs architecture --dependency-analysis

# Generate with system diagrams
mastro docs architecture --generate-diagrams

# Include detected patterns
mastro docs architecture --include-patterns
```

#### Generated Content
- **System Overview**: Project complexity, metrics, and technologies
- **Directory Structure**: Organized project layout with descriptions
- **Architectural Patterns**: Detected patterns (MVC, Component-based, Layered)
- **Dependencies**: Production and development dependency analysis
- **System Diagrams**: Mermaid diagrams showing system architecture
- **Integration Points**: How components interact and integrate

### Documentation Types

#### 1. API Documentation
- REST endpoint documentation
- Function signatures and parameters
- Request/response examples
- OpenAPI/Swagger specification generation
- Authentication and error handling patterns

#### 2. Architecture Documentation
- System overview and complexity metrics
- Directory structure and organization
- Detected architectural patterns
- Dependency analysis and relationships
- Generated system diagrams

#### 3. User Guide Documentation
- Getting started and installation
- Feature explanations and usage examples
- Workflow documentation
- Troubleshooting guides
- Configuration options

#### 4. README Generation
- Project overview and description
- Quick start instructions
- Key metrics and statistics
- Documentation links and references

### Team Integration

#### Automated Documentation Updates
```bash
# Set up automated documentation generation
mastro docs --auto-update

# Integrate with git hooks
echo "mastro docs" >> .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

#### CI/CD Integration
```yaml
# GitHub Actions example
- name: Generate Documentation
  run: |
    mastro docs --format markdown
    mastro docs api --format openapi
    
# Commit generated documentation
- name: Commit Documentation
  run: |
    git config --local user.email "action@github.com"
    git config --local user.name "GitHub Action"
    git add docs/
    git diff --staged --quiet || git commit -m "docs: update generated documentation"
```

#### Documentation Workflow
1. **Development**: Write code with good function/class names
2. **Generation**: Run `mastro docs` to generate documentation
3. **Review**: Review generated content for accuracy
4. **Customize**: Add custom content between preservation markers
5. **Maintenance**: Use `--auto-update` for automatic updates

### Best Practices

#### For Better Documentation Generation
```typescript
// Good: Descriptive function names and exports
export async function createUserAccount(userData: UserData): Promise<User> {
  // Implementation
}

// Good: Clear API endpoint patterns
app.post('/api/users', createUserHandler);
app.get('/api/users/:id', getUserHandler);

// Good: Architectural organization
src/
  controllers/     // Clear separation of concerns
  services/       // Business logic
  models/         // Data models
  routes/         // API routes
```

#### Documentation Customization
```markdown
<!-- In generated files, use preservation markers -->
<!-- CUSTOM_START -->
Your custom content here will be preserved during regeneration
<!-- CUSTOM_END -->
```

#### Template Customization
```typescript
// Create custom templates
interface CustomTemplate {
  name: string;
  type: 'api' | 'architecture' | 'user-guide';
  render(context: DocumentationContext): Promise<string>;
}
```

### Configuration Options

Add documentation configuration to your `mastro.config.json`:

```json
{
  "documentation": {
    "outputDir": "./docs",
    "formats": ["markdown", "json"],
    "includePrivate": false,
    "includeTodos": false,
    "generateMermaid": true,
    "autoUpdate": false,
    "templates": {
      "api": "custom-api-template",
      "architecture": "custom-arch-template"
    }
  }
}
```

## 🌊 Workflow Orchestration

Mastro provides intelligent workflow orchestration that automates your entire development process from code splitting through PR creation and analytics, with robust error recovery and checkpoint management.

### Overview

The `mastro flow` command orchestrates a complete development workflow:
1. **Smart Code Splitting**: Analyze and split changes into logical commits
2. **Interactive Review**: Review and customize commit boundaries
3. **Intelligent Commits**: Generate AI-powered commit messages
4. **Documentation**: Auto-generate comprehensive docs
5. **PR Creation**: Create smart pull requests with migration detection
6. **Analytics**: Track productivity and development patterns

### `mastro flow` - Complete Workflow Orchestration

Execute an end-to-end development workflow with intelligent automation and error recovery.

#### Basic Usage
```bash
# Run complete workflow with defaults
mastro flow

# Execute workflow with validation at each step
mastro flow --validate

# Start workflow from a specific checkpoint
mastro flow --recover

# Force workflow execution despite errors
mastro flow --force
```

#### Workflow Steps

**Step 1: Code Analysis & Splitting**
```bash
# Automatically analyze working directory changes
# Detect logical commit boundaries
# Suggest optimal staging strategies
[Flow] 🧩 Analyzing code changes...
Found 3 logical boundaries:
  • Authentication system updates (high priority)
  • UI styling improvements (medium priority)
  • Documentation updates (low priority)
```

**Step 2: Interactive Boundary Review**
```bash
# Review detected boundaries
# Customize staging strategy
# Validate file groupings
[Flow] 🔍 Reviewing commit boundaries...
✓ Authentication boundary validated
⚠ Consider splitting large UI changes
✓ Documentation dependencies confirmed
```

**Step 3: Progressive Commits**
```bash
# Execute commits in dependency order
# Generate AI-powered commit messages
# Handle staging area management
[Flow] 📝 Creating commits...
✓ feat(auth): implement JWT validation system
✓ style(ui): update authentication form styles
✓ docs: update authentication setup guide
```

**Step 4: Documentation Generation**
```bash
# Update API documentation
# Generate architecture docs
# Create workflow diagrams
[Flow] 📚 Generating documentation...
✓ API reference updated
✓ Architecture docs refreshed
✓ Workflow diagrams created
```

**Step 5: Smart PR Creation**
```bash
# Analyze changes for PR complexity
# Detect migration requirements
# Generate comprehensive descriptions
[Flow] 🚀 Creating pull request...
✓ Migration detected: API changes require client updates
✓ PR created: feat(auth): comprehensive authentication system
```

**Step 6: Analytics & Insights**
```bash
# Update session analytics
# Generate productivity insights
# Provide workflow recommendations
[Flow] 📊 Updating analytics...
✓ Session updated: 87% productivity score
✓ Pattern detected: Test-driven development
✓ Recommendation: Continue TDD approach
```

#### Advanced Workflow Options

**Validation Mode**
```bash
# Validate each step before execution
mastro flow --validate

# Example validation output
[Flow] ✓ Git repository clean
[Flow] ✓ Working directory has changes
[Flow] ✓ No merge conflicts detected
[Flow] ✓ Branch is up to date
[Flow] ✓ All validations passed
```

**Recovery Mode**
```bash
# Resume from last checkpoint
mastro flow --recover

# Example recovery output
[Flow] 📂 Loading checkpoint...
Last checkpoint: step-3-commits (2 minutes ago)
Completed: code-analysis, boundary-review
Remaining: commits, documentation, pr-creation, analytics
Resume from commits step? (y/n)
```

**Force Mode**
```bash
# Continue workflow despite errors
mastro flow --force

# Example force execution
[Flow] ⚠ Error in documentation step: API files not found
[Flow] 🔄 Force mode enabled - continuing workflow
[Flow] ⏭ Skipping documentation step
[Flow] ✓ Proceeding to PR creation
```

#### Workflow Configuration

Add workflow preferences to `mastro.config.json`:
```json
{
  "workflow": {
    "autoStage": true,
    "validateSteps": false,
    "skipDocumentation": false,
    "skipPR": false,
    "skipAnalytics": false,
    "errorRecovery": "interactive",
    "checkpointInterval": 300,
    "maxRetries": 3
  }
}
```

#### Example Complete Workflow

```bash
$ mastro flow

🌊 Mastro Workflow Orchestration
───────────────────────────────

[1/6] 🧩 Analyzing code changes...
✓ Found 3 logical commit boundaries
✓ Dependency analysis complete
✓ Staging strategy optimized

[2/6] 🔍 Reviewing boundaries...
✓ High priority: Authentication system (8 files)
✓ Medium priority: UI improvements (3 files)  
✓ Low priority: Documentation (2 files)
✓ All boundaries validated

[3/6] 📝 Creating commits...
✓ feat(auth): implement JWT validation with RBAC
  Files: 8 | +247 -156 | Complexity: High
✓ style(ui): modernize authentication forms
  Files: 3 | +89 -45 | Complexity: Low
✓ docs: update authentication setup guide
  Files: 2 | +134 -12 | Complexity: Low

[4/6] 📚 Generating documentation...
✓ API reference updated (auth endpoints documented)
✓ Architecture docs updated (auth flow diagrams)
✓ User guide sections added

[5/6] 🚀 Creating pull request...
✓ Migration analysis: API changes detected
✓ PR template: feature (auto-detected)
✓ PR created: https://github.com/org/repo/pull/142
  Title: feat(auth): comprehensive JWT authentication system
  Complexity: moderate | Migration: required

[6/6] 📊 Updating analytics...
✓ Session productivity: 91% (excellent)
✓ Pattern detection: TDD workflow confirmed
✓ Focus score: 88% (3 deep work sessions)
✓ Recommendations: Continue current approach

🎉 Workflow completed successfully!
📋 Summary:
  • 3 commits created with optimal boundaries
  • Documentation fully updated
  • PR ready for review with migration notes
  • Productivity metrics excellent

⏱ Total time: 4 minutes 23 seconds
🎯 Next recommendation: Take a break - you've been coding for 2.5 hours
```

### Workflow Error Recovery

The workflow orchestration includes comprehensive error recovery with multiple strategies:

#### Automatic Recovery Strategies
- **Retry Logic**: Automatic retries for transient failures
- **Checkpoint Restoration**: Resume from last successful step
- **Graceful Degradation**: Skip optional steps when errors occur
- **Context Preservation**: Maintain workflow state across failures

#### Manual Intervention Options
- **Step-by-Step Execution**: Manual control over each workflow step
- **Custom Recovery**: Define recovery actions for specific error types
- **Rollback Capabilities**: Undo partial workflow executions
- **Debug Mode**: Detailed error analysis and troubleshooting guidance

## 🎯 Boundary-Based Development

Mastro revolutionizes commit hygiene through intelligent boundary detection and interactive commit management, helping you create logical, reviewable commits that tell the story of your development process.

### Philosophy

**Boundary-Based Development** focuses on creating commits that represent complete, logical units of work rather than arbitrary code snapshots. Each commit should:
- Implement a single, cohesive change
- Include all related modifications
- Pass all tests when applied
- Tell a clear story in the development narrative

### `mastro split` - Enhanced Smart Commit Splitting

Analyze working directory changes with advanced boundary detection and interactive customization capabilities.

#### Enhanced Usage Options

**Interactive Review Mode**
```bash
# Enable comprehensive interactive boundary management
mastro split --interactive-review

# Guided boundary customization with validation
mastro split --interactive --validate

# Interactive mode with retry mechanisms
mastro split --interactive --auto-retry
```

#### Interactive Review Features

**Boundary Validation & Customization**
```bash
[Split] 🔍 Interactive Boundary Review Mode
───────────────────────────────────────

Current boundaries detected:
1. Authentication System (8 files, high priority)
2. UI Styling Updates (3 files, medium priority)
3. Documentation (2 files, low priority)

Select boundary to customize:
  1. Review files in boundary
  2. Split boundary further
  3. Merge with another boundary
  4. Remove files from boundary
  5. Edit commit message
  6. View detailed diff
  7. Continue with current boundaries
  0. Cancel and exit

Choice:
```

**File Management Options**
- **Add Files**: Include additional files in boundary
- **Remove Files**: Exclude files from boundary
- **Split Boundary**: Break large boundary into smaller commits
- **Merge Boundaries**: Combine related boundaries
- **Reorder Boundaries**: Change commit sequence

**Validation & Retry System**
```bash
[Split] ⚠ Boundary validation failed
Issue: Authentication boundary includes unrelated styling changes
Files in question: src/components/LoginForm.css

Options:
  1. Move styling files to UI boundary
  2. Create new boundary for styling
  3. Keep files in authentication boundary
  4. Remove styling files entirely
  5. Get detailed explanation

Auto-fix recommendation: Move to UI boundary
Apply auto-fix? (y/n/customize)
```

**Commit Message Customization**
```bash
[Split] 📝 Commit Message Editor
───────────────────────────────

Boundary: Authentication System
Current message: feat(auth): implement JWT validation with role-based access

Options:
  1. Accept current message
  2. Edit message manually
  3. Regenerate with different style
  4. Add detailed body
  5. Preview final commit

Edit message? (y/n)
```

#### Advanced Boundary Detection

**Dependency-Aware Analysis**
```bash
# Enhanced dependency analysis with import tracking
mastro split --dependency-analysis

[Split] 🔗 Dependency Analysis Results
──────────────────────────────────────

Detected dependencies:
• auth-middleware.ts depends on user-types.ts
• login-form.tsx imports auth-middleware.ts
• user-service.ts uses user-types.ts interfaces

Recommended boundary order:
1. Core types and interfaces (foundation)
2. Authentication logic (depends on types)
3. UI components (depends on auth logic)
4. Documentation (depends on all features)
```

**Semantic Change Detection**
```bash
# Advanced semantic analysis of changes
mastro split --semantic-analysis

[Split] 🧠 Semantic Change Analysis
─────────────────────────────────────

Change categories detected:
• New Feature Implementation (67% of changes)
  - JWT token validation system
  - Role-based access control
• Code Style Improvements (23% of changes)
  - Component styling updates
  - CSS organization
• Documentation Updates (10% of changes)
  - API documentation
  - Setup instructions

Semantic boundaries align with file boundaries: ✓ High confidence
```

#### Boundary Quality Metrics

**Commit Quality Scoring**
```bash
[Split] 📊 Boundary Quality Assessment
───────────────────────────────────────

Boundary 1: Authentication System
├─ Cohesion Score: 94/100 (Excellent)
├─ Complexity Score: 76/100 (Good)
├─ Risk Assessment: Medium
├─ Reviewability: High
└─ Test Coverage: 89% (Good)

Boundary 2: UI Styling Updates  
├─ Cohesion Score: 87/100 (Good)
├─ Complexity Score: 34/100 (Low)
├─ Risk Assessment: Low
├─ Reviewability: High
└─ Test Coverage: 45% (Needs improvement)

Overall Quality: 85/100 (Good)
Recommendation: Consider adding tests for UI changes
```

#### Example Interactive Session

```bash
$ mastro split --interactive-review

🎯 Interactive Boundary Review
─────────────────────────────

[1/3] Analyzing working directory...
✓ 13 files changed (+456 -234 lines)
✓ 3 logical boundaries detected
✓ Dependency analysis complete

[2/3] Boundary validation...
✓ Authentication boundary: 8 files, high cohesion
⚠ UI boundary: Mixed styling and logic files
✓ Documentation boundary: Clear documentation updates

[3/3] Interactive customization...

Boundary 2 needs attention:
Files: LoginForm.tsx, UserProfile.tsx, auth-styles.css
Issue: Mixed concerns detected

Options:
  1. Split into logic (tsx) and styles (css) boundaries
  2. Keep together as UI feature boundary
  3. Move styles to authentication boundary
  4. Create separate styling boundary

Recommendation: Split into separate boundaries for better reviewability

Your choice (1-4): 1

✓ Creating new boundaries...
  • UI Logic: LoginForm.tsx, UserProfile.tsx
  • UI Styling: auth-styles.css

Updated boundaries:
1. Authentication System (8 files) - High priority
2. UI Component Logic (2 files) - Medium priority  
3. UI Styling (1 file) - Low priority
4. Documentation (2 files) - Low priority

Proceed with these boundaries? (y/n/customize): y

🎯 Applying staging strategy...
✓ All boundaries staged successfully
✓ Ready for commit workflow

Next steps:
  1. Review staged changes: git diff --staged
  2. Create commits: mastro flow --from-staged
  3. Continue with full workflow: mastro flow
```

### Best Practices for Boundary-Based Development

#### Optimal Boundary Characteristics
```typescript
// Good: Single responsibility boundary
// Files: user-auth.ts, user-types.ts, auth-middleware.ts
feat(auth): implement JWT user authentication

// Good: Related UI changes
// Files: LoginForm.tsx, UserProfile.tsx, auth.css
style(ui): modernize authentication components

// Avoid: Mixed concerns
// Files: user-auth.ts, LoginForm.tsx, README.md, package.json
feat: add authentication and update styles and docs
```

#### Boundary Size Guidelines
- **Micro Boundaries**: 1-3 files, single function/component
- **Small Boundaries**: 4-8 files, single feature module
- **Medium Boundaries**: 9-15 files, complex feature with tests
- **Large Boundaries**: 16+ files (consider splitting further)

#### Commit Narrative Flow
```bash
# Good commit sequence tells a development story
1. feat(types): add user authentication interfaces
2. feat(auth): implement JWT validation service
3. feat(middleware): add authentication middleware
4. feat(ui): create authentication components
5. test(auth): add comprehensive authentication tests
6. docs(auth): document authentication system
```

## 🛡️ Error Recovery & Troubleshooting

Mastro provides comprehensive error recovery systems with intelligent diagnostics, automated recovery strategies, and detailed troubleshooting guidance to keep your development workflow running smoothly.

### Workflow Error Recovery System

#### Multi-Level Recovery Architecture

**Level 1: Automatic Recovery**
- Retry transient failures (network, file system)
- Auto-correct common configuration issues
- Graceful fallbacks for optional operations
- Smart error categorization and routing

**Level 2: Interactive Recovery**
- Guided troubleshooting with step-by-step solutions
- Multiple recovery strategy options
- User-guided decision making for complex errors
- Context-preserved recovery state

**Level 3: Manual Recovery**
- Detailed error analysis and root cause identification
- Custom recovery script generation
- Expert-level troubleshooting guidance
- Rollback and cleanup procedures

#### Checkpoint System

**Automatic Checkpoints**
```bash
# Workflow automatically creates checkpoints
[Flow] 💾 Creating checkpoint: step-2-boundary-review
[Flow] ✓ Checkpoint saved to .git/mastro/checkpoints/

# Checkpoint structure
.git/mastro/checkpoints/
├── step-1-code-analysis.json
├── step-2-boundary-review.json
├── step-3-commits.json (active)
└── recovery-context.json
```

**Manual Checkpoint Management**
```bash
# Create manual checkpoint
mastro flow --checkpoint "before-complex-refactor"

# List available checkpoints
mastro flow --list-checkpoints

# Restore specific checkpoint
mastro flow --restore-checkpoint step-2-boundary-review
```

#### Error Categories & Recovery Strategies

**Git Repository Errors**
```bash
# Error: Merge conflicts detected
[Recovery] 🔀 Merge conflicts found in 3 files
Strategy Options:
  1. Auto-resolve simple conflicts (safe patterns only)
  2. Interactive conflict resolution with guidance
  3. Abort and manual resolution required
  4. Create conflict resolution checkpoint

Recommendation: Interactive resolution (2)
This error is recoverable with guided assistance.
```

**Staging Area Issues**
```bash
# Error: Inconsistent staging state
[Recovery] 📁 Staging area inconsistency detected
Issue: Files modified after staging, staged content outdated

Recovery Options:
  1. Re-stage all modified files
  2. Reset staging area and re-analyze boundaries
  3. Commit current staged content only
  4. Interactive file-by-file staging review

Auto-fix available: Re-stage modified files
Apply auto-fix? (y/n/manual)
```

**AI Service Failures**
```bash
# Error: API rate limit exceeded
[Recovery] 🤖 AI service temporarily unavailable
Cause: OpenAI API rate limit exceeded (retry after 45 seconds)

Recovery Strategies:
  1. Wait and auto-retry (recommended)
  2. Use cached responses for similar changes
  3. Continue with manual commit messages
  4. Switch to offline mode temporarily

Countdown: 43 seconds remaining...
Use cached responses while waiting? (y/n)
```

**File System Issues**
```bash
# Error: Permission denied
[Recovery] 📂 File system permission error
Files: docs/api.md, docs/architecture.md

Diagnosis:
  • Files are read-only
  • Documentation directory may be protected
  • Git working directory permissions inconsistent

Auto-fix options:
  1. Update file permissions (chmod 644)
  2. Skip documentation updates
  3. Use temporary directory for docs
  4. Request elevated permissions

Apply permission fix? (y/n/manual)
```

#### Comprehensive Error Diagnostics

**Error Analysis Engine**
```bash
[Diagnostics] 🔍 Analyzing error context...
───────────────────────────────────────────────

Error: Command failed: git commit -m "feat(auth): implement JWT system"
Exit code: 128
stderr: fatal: cannot lock ref 'refs/heads/feature-auth'

Root Cause Analysis:
├─ Git Lock File Issue: Another git process may be running
├─ System Context: VSCode git integration active
├─ Process Check: Found git process (PID 12345)
├─ Lock Files: .git/refs/heads/feature-auth.lock exists
└─ Solution Confidence: 95% (high)

Automated Recovery Plan:
1. Wait for git process to complete (30 seconds max)
2. Remove stale lock files if process ended
3. Retry commit operation
4. Verify repository integrity

Execute automated recovery? (y/n/details)
```

**Context-Aware Troubleshooting**
```bash
[Troubleshooting] 💡 Intelligent Error Resolution
──────────────────────────────────────────────────

Based on your development patterns and current context:

Recent Context:
• Working on authentication feature for 2.5 hours
• 89% completion rate in similar workflows
• TDD pattern detected in current session

Error Pattern Match:
This error commonly occurs during complex feature development
when multiple git operations happen simultaneously.

Personalized Solutions:
1. Your typical approach: Wait and retry (success rate: 94%)
2. Alternative: Use staging area reset (your fallback method)
3. Advanced: Split commits further (you used this pattern before)

Recommended solution based on your preferences: Wait and retry
This matches your successful pattern from 3 similar situations.
```

#### Recovery Validation & Testing

**Recovery Success Verification**
```bash
[Recovery] ✅ Validating recovery success...
──────────────────────────────────────────────

Validation Checks:
├─ Git repository integrity: ✓ Passed
├─ Working directory consistency: ✓ Passed
├─ Staging area verification: ✓ Passed
├─ Workflow context preservation: ✓ Passed
├─ Checkpoint data integrity: ✓ Passed
└─ Error condition resolved: ✓ Passed

Recovery successful! Workflow can continue safely.
Next step: boundary-review (resumed from checkpoint)
```

**Post-Recovery Recommendations**
```bash
[Recovery] 💫 Post-Recovery Optimization
─────────────────────────────────────────

Success! Error resolved and workflow resumed.

Preventive Measures:
• Consider: git config core.precomposeunicode true (prevents similar issues)
• Optimization: Increase git lock timeout for complex repositories
• Monitoring: Enable git operation logging for better diagnostics

Learning Opportunity:
This error type can be prevented by:
1. Closing VSCode git integration during mastro workflows
2. Using mastro's built-in git operations exclusively
3. Setting git.autoFetch=false in repository configuration

Apply preventive measures? (y/n/explain)
```

#### Manual Recovery Procedures

**Emergency Recovery Mode**
```bash
# Enter emergency recovery when automated recovery fails
mastro flow --emergency-recovery

[Emergency] 🚨 Emergency Recovery Mode
───────────────────────────────────────

This mode provides maximum control for complex recovery scenarios.

Available Actions:
  1. Analyze current state in detail
  2. Generate custom recovery script
  3. Reset to known good state
  4. Export workflow context for manual resolution
  5. Contact support with diagnostic bundle

Current State Analysis:
├─ Git Status: Modified files in working directory
├─ Staging Area: 8 files staged, 3 conflicts
├─ Workflow Context: Step 3 of 6 (commits phase)
├─ Last Checkpoint: 5 minutes ago (recovery available)
└─ Error History: 3 related errors in last 10 minutes

Recommendation: Generate custom recovery script (2)
```

**Recovery Script Generation**
```bash
[Emergency] 📝 Generating Custom Recovery Script...

#!/bin/bash
# Custom Recovery Script - Generated by Mastro
# Error: Git commit failures with staging conflicts
# Context: Authentication feature development workflow

echo "Starting manual recovery process..."

# Step 1: Preserve current work
git stash push -m "mastro-recovery-$(date +%s)"

# Step 2: Clean git state
git reset --hard HEAD
git clean -fd

# Step 3: Restore checkpoint
cp .git/mastro/checkpoints/step-2-boundary-review.json .git/mastro/active-context.json

# Step 4: Re-apply stashed changes
git stash pop

# Step 5: Validate recovery
echo "Recovery complete. Run 'mastro flow --validate' to continue."

Save recovery script as: recovery-$(date +%s).sh? (y/n)
```

### Common Error Scenarios & Solutions

#### Workflow Interruption Recovery
```bash
# Scenario: Process killed mid-workflow
$ mastro flow --recover

[Recovery] 🔄 Detecting interrupted workflow...
Found: Incomplete workflow from 10 minutes ago
Context: Authentication feature, step 4/6 (documentation)

Safe Recovery Options:
  1. Resume from last checkpoint (recommended)
  2. Restart from beginning
  3. Skip to next step manually
  4. Analyze what's been completed

Choose recovery approach (1-4): 1
```

#### Configuration & Environment Issues
```bash
# Scenario: Missing dependencies or configuration
[Recovery] ⚙️ Configuration Issue Detected
Problem: OpenAI API key not configured

Quick Fix Available:
  1. Set environment variable: export OPENAI_API_KEY="your-key"
  2. Update config file: mastro config:init
  3. Skip AI features temporarily
  4. Use offline mode with cached responses

Apply quick fix (1-4): 2
```

#### Performance & Resource Issues
```bash
# Scenario: System resource constraints
[Recovery] 📊 Performance Issue Detected
Cause: Repository analysis exceeding memory limits (2.1GB used)

Optimization Options:
  1. Enable streaming analysis mode
  2. Increase analysis chunk size
  3. Skip large file analysis temporarily
  4. Use performance mode (reduced features)

Recommended: Streaming analysis mode (maintains full functionality)
Apply optimization? (y/n/details)
```

## 🔄 Use Cases & Workflows

### Daily Developer Workflow

#### Morning Development Session
```bash
# Start new feature branch
git checkout -b feat/user-authentication

# Make changes throughout the day...
# Use mastro review for continuous feedback
mastro review --stream

# Generate intelligent commits  
git add . && mastro commit

# Continue development with periodic reviews
mastro review --actionable-only --priority=high
```

#### End-of-Day PR Creation
```bash
# Comprehensive session review before PR
mastro review --format=markdown > review-notes.md

# Create smart PR with migration detection  
mastro pr create --push

# Explain changes for team documentation
mastro explain --format=markdown --impact > CHANGELOG_ENTRY.md
```

### Team Collaboration Workflows

#### Code Review Process
```bash
# Before creating PR (self-review)
mastro review --persona=security --strictness=strict

# Generate comprehensive explanation for reviewers
mastro explain --audience=technical --format=markdown

# Create detailed PR with context
mastro pr create --migration-check
```

#### Onboarding New Team Members
```bash
# Understand recent changes
mastro explain main..develop --audience=junior

# Learn from existing commits
mastro explain HEAD~20..HEAD --format=markdown
```

### Advanced Use Cases

#### Debugging & Analysis
```bash
# Analyze suspicious changes
mastro explain suspicious-commit --impact

# Review potential security issues
mastro review --persona=security --actionable-only

# Understand complex merge conflicts
mastro explain main..feature-branch --max-commits=50
```

#### Release Preparation
```bash
# Review entire release branch
mastro review --format=markdown > release-review.md

# Generate release notes
mastro explain v1.0.0..v1.1.0 --format=markdown --impact

# Validate migration requirements
mastro pr create --migration-check --template=release
```

## 👥 Team Integration

### Setting Up Team Standards

#### 1. Create Shared Configuration
```bash
# In your project repository
cat > mastro.config.json << EOF
{
  "team": {
    "commitStyle": "conventional",
    "prefixes": ["feat", "fix", "docs", "refactor", "test"],
    "maxLength": 72,
    "commonPhrases": ["implement", "update", "fix", "enhance"],
    "reviewPersona": {
      "name": "Senior Full-Stack Engineer", 
      "focus": ["security", "performance", "maintainability"],
      "strictness": "strict",
      "customRules": [
        "Ensure all API endpoints have proper error handling",
        "Validate input sanitization for user data",
        "Check for proper logging and monitoring"
      ]
    }
  }
}
EOF

# Commit the configuration
git add mastro.config.json
mastro commit --template=chore
```

#### 2. Git Hooks Integration
```bash
# Pre-commit hook for quality gates
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "Running Mastro pre-commit review..."
mastro review --actionable-only --priority=critical

if [ $? -ne 0 ]; then
  echo "Critical issues found. Please address before committing."
  exit 1
fi
EOF

chmod +x .git/hooks/pre-commit
```

#### 3. CI/CD Integration
```yaml
# .github/workflows/mastro-review.yml
name: Mastro Code Review
on: [pull_request]

jobs:
  mastro-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install -g mastro
      - run: mastro review --format=json > review.json
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      - uses: actions/github-script@v6
        with:
          script: |
            const review = require('./review.json')
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 🔍 Mastro Code Review\n\n${review.overall.summary}`
            })
```

### Best Practices for Teams

#### Commit Message Standards
```bash
# Good examples generated by Mastro
feat(auth): implement JWT token validation with role-based access
fix(api): resolve race condition in user registration flow  
docs(readme): update installation guide with Docker setup
refactor(db): optimize query performance for user lookups

# Team patterns learned over time
mastro commit --learn  # Learns from approved commits
```

#### Review Workflows
```bash
# Pre-PR review checklist
mastro review --actionable-only --priority=high
mastro review --persona=security  
mastro pr create --migration-check

# Team review standards
mastro review --persona=senior --strictness=strict
```

## 🐛 Troubleshooting

### Common Issues

#### API Key Problems
```bash
# Error: OpenAI API key not configured
export OPENAI_API_KEY="your_key_here"
# or
mastro config:init  # Interactive setup

# Verify configuration
mastro config --show
```

#### Git Repository Issues
```bash
# Error: Not in a git repository
git init
git add .
git commit -m "Initial commit"

# Error: No staged changes
git add .  # Stage files first
mastro commit
```

#### Performance Issues
```bash
# Large repository analysis is slow
mastro commit --no-cache  # Skip caching for large changes
mastro explain --max-commits=5  # Limit analysis scope

# Enable debug logging
MASTRO_DEBUG=true mastro commit
```

#### Token Limit Errors
```bash
# Error: Token limit exceeded
# Solution: Mastro automatically handles this with intelligent compression
mastro explain --format=json  # Check compression details

# For very large changes, consider splitting commits
git add file1.js && mastro commit
git add file2.js && mastro commit
```

### Debug Mode
```bash
# Enable verbose logging
export MASTRO_DEBUG=true
mastro commit

# Check cache status
mastro cache --status

# Validate configuration
mastro config --validate
```

### Getting Help
```bash
# Command-specific help
mastro commit --help
mastro review --help
mastro pr create --help

# General help
mastro --help

# Version information
mastro --version
```

## ✨ Best Practices

### Commit Workflow
```bash
# 1. Make focused changes
# Work on single feature/fix at a time

# 2. Stage intentionally  
git add specific-file.js  # Not git add .

# 3. Review before committing
mastro review --actionable-only

# 4. Generate intelligent commits
mastro commit

# 5. Learn from good commits
mastro commit --learn  # On approved commits
```

### Code Review Integration
```bash
# Before creating PRs
mastro review --persona=security --strictness=strict
mastro review --format=markdown > self-review.md

# For complex changes
mastro explain --impact --audience=technical
```

### Performance Optimization
```bash
# Enable caching for repetitive operations
# (enabled by default)

# For large repositories
mastro commit --no-cache  # When needed
mastro explain --max-commits=10  # Limit scope

# Use appropriate output formats
mastro review --format=json  # For automation
mastro explain --format=markdown  # For documentation
```

### Security Considerations
```bash
# Never commit sensitive data
mastro review --persona=security  # Always check

# Use project-specific configuration  
# Keep API keys in environment variables
export OPENAI_API_KEY="..."  # Not in config files

# Regular security reviews
mastro review --persona=security --actionable-only
```

---

## 🔍 Real-Time Development Guidance (VS Code Extension)

Mastro's VS Code extension provides intelligent, real-time development assistance with live code analysis, proactive suggestions, and quality insights as you code.

### Installation

```bash
# Install from source (development)
cd mastro/mastro-vscode
npm install
npm run compile
code --install-extension mastro-vscode-0.1.0.vsix
```

### Features Overview

#### 🔴 **Live Quality Metrics**
Real-time code quality analysis with A-F grading across 6 dimensions:
- **Complexity**: Cyclomatic complexity analysis with refactoring suggestions
- **Maintainability**: Code smell detection and improvement recommendations  
- **Performance**: Anti-pattern detection and optimization suggestions
- **Security**: Vulnerability scanning and secure coding practices
- **Test Coverage**: Coverage estimation and testing recommendations
- **Documentation**: JSDoc completeness and quality assessment

#### 🔄 **Real-Time File Monitoring**
Intelligent file system watching with development pattern detection:
- **TDD Pattern**: Detects test-driven development practices
- **Refactor-First Pattern**: Identifies systematic refactoring workflows  
- **Spike Pattern**: Recognizes exploration and experimentation phases
- **Smart Debouncing**: Configurable analysis delays to avoid overwhelming

#### 💡 **Proactive Suggestions Engine**  
Context-aware suggestions based on code analysis and development patterns:
- **Quality Alerts**: High complexity, security issues, missing documentation
- **Refactoring Opportunities**: Extract functions, simplify conditionals, reduce complexity
- **Test Suggestions**: Missing test files, low coverage warnings
- **Security Warnings**: Potential vulnerabilities and secure coding practices
- **Pattern Guidance**: Development workflow recommendations

#### 🛠 **Code Actions & Quick Fixes**
Integrated VS Code refactoring with intelligent suggestions:
- **Automated Fixes**: Magic numbers, security issues, line length
- **Refactoring Helpers**: Extract function, simplify conditionals, reduce complexity
- **Documentation Tools**: Add JSDoc comments, create test files
- **Performance Analysis**: Impact assessment and optimization guidance

### Getting Started

#### 1. Extension Activation
The extension activates automatically when you open a Git repository. Look for the Mastro status bar item and the "Mastro Session" panel in the Explorer.

#### 2. Configure Real-Time Analysis
```json
{
  "mastro.realTimeAnalysis.enabled": true,
  "mastro.realTimeAnalysis.debounceInterval": 3000,
  "mastro.realTimeAnalysis.complexityThreshold": 8,
  "mastro.realTimeAnalysis.testCoverageThreshold": 70,
  "mastro.realTimeAnalysis.securityAnalysis": true,
  "mastro.realTimeAnalysis.patternDetection": true
}
```

#### 3. Configure Proactive Suggestions
```json
{
  "mastro.proactiveSuggestions.enableQuality": true,
  "mastro.proactiveSuggestions.enableRefactoring": true,
  "mastro.proactiveSuggestions.enableTesting": true,
  "mastro.proactiveSuggestions.enableSecurity": true,
  "mastro.proactiveSuggestions.maxActive": 3,
  "mastro.proactiveSuggestions.minPriority": "medium",
  "mastro.proactiveSuggestions.cooldownMs": 10000
}
```

### Command Palette Functions

#### Quality Analysis Commands
```
Mastro: Analyze File Quality          # Detailed quality report for current file
Mastro: Analyze Project Quality       # Project-wide quality overview  
Mastro: Show File Quality Metrics     # Real-time metrics for current file
Mastro: Run Quality Check             # Manual quality validation
```

#### Real-Time Analysis Commands
```
Mastro: Start Real-Time Analysis      # Enable live file monitoring
Mastro: Stop Real-Time Analysis       # Disable live file monitoring
Mastro: Analyze Current File          # Manual analysis trigger
Mastro: Show Development Patterns     # View detected workflow patterns
Mastro: Trigger Proactive Suggestions # Manual suggestion generation
```

#### Refactoring & Improvement Commands
```
Mastro: Add Function Documentation    # Generate JSDoc for current function
Mastro: Create Test File              # Generate test file for current source
Mastro: Extract Function Help         # Guided function extraction assistance
Mastro: Simplify Conditional Help     # Conditional refactoring guidance
Mastro: Complexity Help               # Complexity reduction strategies
Mastro: Analyze Performance           # Performance impact analysis
```

#### Session Management Commands  
```
Mastro: Generate AI Commit Message    # AI-powered commit message generation
Mastro: Review Current Session        # Comprehensive session analysis
Mastro: Analyze Commit Boundaries     # Smart commit splitting suggestions
Mastro: Show Productivity Analytics   # Development productivity insights
Mastro: Create Smart PR               # Intelligent pull request creation
Mastro: Install Pre-commit Hooks      # Quality gate automation
```

### Quality Grading System

Mastro uses an **A-F grading system** across all quality dimensions:

| Grade | Score Range | Description |
|-------|-------------|-------------|  
| **A**     | 90-100      | Excellent quality, minimal improvements needed |
| **B**     | 80-89       | Good quality, minor optimizations suggested |
| **C**     | 70-79       | Acceptable quality, moderate improvements recommended |
| **D**     | 60-69       | Below standard, significant improvements needed |
| **F**     | 0-59        | Poor quality, major refactoring required |

### Code Actions & Quick Fixes

#### Automated Quick Fixes
- **Line Length**: Automatically break long lines at logical points
- **Magic Numbers**: Extract constants and replace usage
- **Security Issues**: Replace unsafe patterns (eval, innerHTML, secrets logging)
- **Documentation**: Generate JSDoc templates for functions

#### Refactoring Assistance  
- **Extract Function**: Guided assistance for function extraction
- **Simplify Conditionals**: Strategies for complex conditional logic
- **Reduce Complexity**: Practical approaches to complexity reduction  
- **Performance Optimization**: Analysis and improvement recommendations

### Development Pattern Detection

#### Test-Driven Development (TDD)
**Detection Criteria**: Test files modified before corresponding source files
```
Confidence: 85%
Evidence: 
- 4 test files modified before corresponding source files
Recommendations:
- Excellent TDD practice! Keep writing tests first
Next Best Action: Continue with red-green-refactor cycle
```

#### Refactor-First Pattern
**Detection Criteria**: Many small changes with similar add/delete ratios  
```
Confidence: 72%
Evidence:
- 8 changes show refactoring patterns (code reorganization)
Recommendations: 
- Good refactoring practice - clean code before adding features
- Consider documenting refactoring decisions
```

#### Spike/Exploration Pattern
**Detection Criteria**: Many changes across multiple files in short timeframe
```
Confidence: 65% 
Evidence:
- 15 changes across 8 files in 30 minutes
Recommendations:
- Exploration phase detected - consider documenting findings
- Create a summary of what you've learned
Next Best Action: Document key insights before continuing
```

### Proactive Suggestion Examples

#### Critical Security Alert
```
🚨 Critical Security Alert
Potential security vulnerabilities detected. Please review immediately.

Actions:
[Review Issues] [Security Guidelines] 
```

#### High Complexity Warning
```
⚠️ High Complexity Detected  
File has complexity score of 45/100. Consider refactoring to improve maintainability.

Actions:  
[Show File Metrics] [View Opportunities] [Learn About Complexity]
```

#### Test Coverage Suggestion
```
💡 No Test File Found
Consider creating tests for better code reliability and easier refactoring.

Actions:
[Create Test] [Learn TDD] [Dismiss]
```

#### Quick Refactoring Opportunity
```
💭 Quick Refactoring Opportunities
Found 3 low-effort improvement(s) in this file.

Actions:
[Show Opportunities] [Apply Quick Fix] [Dismiss]
```

### Best Practices

#### Optimal Configuration
```json
{
  // Enable all features for comprehensive guidance
  "mastro.realTimeAnalysis.enabled": true,
  "mastro.proactiveSuggestions.enableQuality": true,
  "mastro.proactiveSuggestions.enableSecurity": true,
  
  // Adjust thresholds based on team standards
  "mastro.realTimeAnalysis.complexityThreshold": 8,
  "mastro.realTimeAnalysis.testCoverageThreshold": 80,
  
  // Balance suggestion frequency with productivity
  "mastro.proactiveSuggestions.minPriority": "medium",
  "mastro.proactiveSuggestions.cooldownMs": 15000
}
```

#### Workflow Integration
1. **Morning Setup**: Start real-time analysis when beginning work
2. **Active Development**: Leverage code actions and quick fixes as you code  
3. **Before Commits**: Review quality metrics and apply suggested improvements
4. **Code Reviews**: Use project quality analysis for comprehensive oversight
5. **Refactoring Sessions**: Follow pattern-based recommendations for systematic improvements

#### Team Adoption
1. **Shared Standards**: Configure consistent quality thresholds across team
2. **Quality Gates**: Use quality grades as merge criteria
3. **Learning Tool**: Review suggestions to improve coding practices
4. **Productivity Tracking**: Monitor development patterns and quality trends

### Troubleshooting

#### Extension Not Activating
```bash
# Check extension is installed
code --list-extensions | grep mastro

# Verify workspace has Git repository
git status

# Check VS Code output panel for errors
# View → Output → Mastro (dropdown)
```

#### Real-Time Analysis Not Working
```bash
# Check configuration
# File → Preferences → Settings → Search "mastro"

# Verify file types are supported  
# Currently supports: .ts, .js, .tsx, .jsx, .py, .java, .go, .rs, .cpp, .c, .h

# Check VS Code developer tools
# Help → Toggle Developer Tools → Console
```

#### Quality Analysis Issues
```bash
# Ensure Mastro CLI is available
mastro --version

# Check file permissions
# Ensure VS Code can read/write workspace files

# Review analysis thresholds
# Adjust settings if getting too many/few suggestions
```

---

## 🚀 Next Steps

1. **Explore Advanced Features**: Try different review personas and output formats
2. **Integrate with Team Workflow**: Set up shared configuration and git hooks
3. **Provide Feedback**: Help improve Mastro by sharing your experience
4. **Stay Updated**: Follow releases for new features and improvements

For detailed API documentation, see [API Reference](./API_REFERENCE.md).
For system architecture details, see [Architecture Guide](./ARCHITECTURE.md).

---

**Need Help?** 
- 📖 Check the [troubleshooting section](#troubleshooting)
- 🐛 Report issues on GitHub
- 💬 Join our community discussions