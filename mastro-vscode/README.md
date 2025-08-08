# Mastro VS Code Extension

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/your-org/mastro)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

The official VS Code extension for **Mastro**, the AI-powered Git CLI companion. Bring intelligent commit generation, code review, and productivity analytics directly into your favorite editor.

## ✨ Features

### 🎯 Core Mastro Commands
- **AI Commit Generation**: Generate intelligent commit messages from staged changes
- **Session-Based Code Review**: Analyze current development session with AI-powered insights
- **Smart Commit Splitting**: Automatically detect logical commit boundaries
- **Productivity Analytics**: Track coding patterns and get personalized insights
- **Code Change Explanations**: Generate audience-specific explanations of your changes
- **Smart PR Creation**: Create pull requests with intelligent templates
- **Pre-commit Hook Integration**: Install AI-powered quality gates

### 🔔 Smart Notifications
- **Context-Aware Insights**: Proactive quality suggestions based on your coding patterns
- **Focus Mode**: Distraction-free development with intelligent notification batching
- **Quality Pattern Detection**: Identify large commits, missing tests, and refactoring opportunities
- **Configurable Levels**: Minimal, balanced, or comprehensive notification preferences
- **Learn from Behavior**: Adapts to your coding style and preferences over time

### 📊 Real-Time Session Tracking
- **Live Status Bar**: Session duration, files modified, complexity indicators
- **Session Analytics**: Productivity metrics and development pattern insights
- **Activity Bar Integration**: Dedicated Mastro panel with session overview
- **Auto-Refresh**: Automatically updates session data as you work

### 🎨 Rich UI Integration
- **Command Palette**: All Mastro commands accessible via Ctrl+Shift+P
- **SCM Integration**: Commit generation and change analysis from Source Control panel
- **Context Menus**: Quick access to relevant features based on current state
- **Progress Notifications**: Visual feedback during AI operations
- **Markdown Viewers**: Rich formatting for reviews, analytics, and explanations

## 🚀 Quick Start

### Prerequisites
- VS Code 1.80.0 or higher
- Mastro CLI installed and configured
- Git repository (for full functionality)

### Installation

> **Note**: This extension requires the Mastro CLI to be installed separately.

1. **Install Mastro CLI** (development setup):
   ```bash
   git clone https://github.com/your-org/mastro.git
   cd mastro
   npm install && npm run build
   npm link
   ```

2. **Configure OpenAI API Key**:
   ```bash
   export OPENAI_API_KEY=your_api_key_here
   mastro config:init
   ```

3. **Install Extension** (when published):
   - Search for "Mastro" in VS Code Extensions
   - Or install from `.vsix` file for development

### Basic Usage

1. **Open a Git repository** in VS Code
2. **Stage some changes** with Git
3. **Open Command Palette** (`Ctrl+Shift+P` or `Cmd+Shift+P`)
4. **Run "Mastro: Generate AI Commit Message"**
5. **View session info** in the Status Bar and Activity Panel

## 📋 Available Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| `Mastro: Generate AI Commit Message` | Create intelligent commit from staged changes | - |
| `Mastro: Review Current Session` | AI-powered analysis of your development session | - |
| `Mastro: Analyze Commit Boundaries` | Find logical boundaries for splitting changes | - |
| `Mastro: Show Productivity Analytics` | View detailed productivity metrics and insights | - |
| `Mastro: Explain Code Changes` | Generate explanations of recent changes | - |
| `Mastro: Create Smart PR` | Create pull request with intelligent template | - |
| `Mastro: Install Pre-commit Hooks` | Set up AI-powered quality gates | - |
| `Mastro: Enable Focus Mode` | Reduce notifications for distraction-free coding | - |
| `Mastro: Run Quality Check` | Manually trigger quality insights for current session | - |
| `Mastro: Refresh Session Data` | Update session tracking information | - |

## ⚙️ Configuration

The extension can be configured through VS Code settings (`Preferences: Open Settings (JSON)`):

```json
{
  "mastro.enableNotifications": true,
  "mastro.notificationLevel": "balanced",
  "mastro.autoRefreshSession": true,
  "mastro.statusBarEnabled": true,
  "mastro.focusModeNotifications": false,
  "mastro.cliPath": "mastro"
}
```

### Configuration Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `mastro.enableNotifications` | boolean | `true` | Enable smart notifications for code quality insights |
| `mastro.notificationLevel` | string | `"balanced"` | Level of detail: `"minimal"`, `"balanced"`, `"comprehensive"` |
| `mastro.autoRefreshSession` | boolean | `true` | Automatically refresh session data when files change |
| `mastro.statusBarEnabled` | boolean | `true` | Show Mastro status in the status bar |
| `mastro.focusModeNotifications` | boolean | `false` | Allow notifications during focus mode |
| `mastro.cliPath` | string | `"mastro"` | Path to the mastro CLI executable |

## 🔔 Smart Notifications

The extension provides intelligent, context-aware notifications to help improve your code quality:

### 🎯 Quality Insights
- **Long Development Session**: Suggests breaks after extended coding periods
- **High Complexity Changes**: Warns when changes are becoming too complex
- **High Risk Changes**: Alerts for potentially impactful modifications
- **Many Files Modified**: Suggests commit splitting for better organization
- **Missing Test Coverage**: Identifies code changes without corresponding tests
- **Refactoring Patterns**: Encourages documentation of refactoring efforts

### 📊 Productivity Patterns
- **Focus Opportunities**: Recognizes deep work sessions and suggests focus mode
- **Large Commit Detection**: Identifies commits that might be too large
- **Testing Patterns**: Tracks test-driven development workflows

### 🎛️ Notification Levels

**Minimal**: Only critical warnings (high-risk changes, missing tests)
```json
{ "mastro.notificationLevel": "minimal" }
```

**Balanced** (Default): Important insights without overwhelming
```json
{ "mastro.notificationLevel": "balanced" }
```

**Comprehensive**: All available insights and suggestions
```json
{ "mastro.notificationLevel": "comprehensive" }
```

## 🎨 UI Components

### Status Bar
- **Session Duration**: How long you've been coding
- **Files Modified**: Number of files changed in current session
- **Complexity Indicator**: Visual representation of change complexity
- **Click Action**: Opens productivity analytics

### Activity Bar Panel
- **Session Overview**: Current session ID and metadata
- **Duration Tracking**: Real-time session timer
- **File Statistics**: Files modified count
- **Complexity Metrics**: Current complexity and risk levels
- **Pattern Detection**: Identified development patterns

### SCM Integration
- **Commit Generation**: Generate button in Source Control panel (when changes are staged)
- **Change Analysis**: Analyze button when working changes are detected
- **Context Menus**: Quick access to Mastro features from file context menus

## 🔧 Development & Debugging

### Extension Development
```bash
cd mastro-vscode
npm install
npm run compile
# Press F5 to launch Extension Development Host
```

### Debugging
- Use VS Code's built-in debugging for the extension host
- Check the "Mastro" output channel for CLI communication logs
- Enable developer tools in the Extension Development Host

### Common Issues

**"Mastro CLI not found"**:
- Ensure Mastro CLI is installed and in PATH
- Check `mastro.cliPath` setting
- Try running `mastro --version` in terminal

**"No workspace folder detected"**:
- Open a folder/workspace in VS Code
- Mastro works best with Git repositories

**Notifications not showing**:
- Check `mastro.enableNotifications` setting
- Verify notification level settings
- Try manual quality check command

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly
5. **Submit** a pull request

### Development Guidelines
- Follow TypeScript best practices
- Add tests for new features
- Update documentation
- Follow VS Code extension guidelines
- Test with different repository types

## 📊 Analytics & Privacy

The extension tracks usage patterns locally to improve the experience:

- **No data is sent** to external servers
- **All analytics** are stored locally
- **Session data** is derived from Git history only
- **Notification preferences** are learned from user behavior

You can disable analytics by setting:
```json
{ "mastro.enableNotifications": false }
```

## 🔗 Related Links

- [Mastro CLI Documentation](../docs/USER_GUIDE.md)
- [GitHub Repository](https://github.com/your-org/mastro)
- [Issue Tracker](https://github.com/your-org/mastro/issues)
- [VS Code Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## 📄 License

MIT License. See [LICENSE](LICENSE) file for details.

---

**Made with ❤️ by the Mastro team**

Transform your Git workflow with AI-powered intelligence, right in your favorite editor.