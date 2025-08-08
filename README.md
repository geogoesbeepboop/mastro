# Mastro - AI-Powered Git CLI Extension

Mastro is an intelligent Git CLI extension that generates commit messages, diff explanations, PR descriptions, and code reviews using AI. Built with TypeScript and designed to be fast, non-intrusive, and immediately useful.

## 🚀 Current Status: Phase 1 Complete

Phase 1 has been successfully implemented with the following core features:

### ✅ Completed Features

- **Full TypeScript CLI Framework** - Built with oclif for professional CLI experience
- **AI Client Abstraction** - Supports OpenAI with extensible architecture for other providers
- **Intelligent Git Analysis** - Advanced git diff parsing and semantic code analysis
- **Context Engine** - Smart analysis of code changes, impact assessment, and team patterns
- **Caching System** - In-memory caching for improved performance
- **Rich Terminal UI** - Colored output, spinners, and interactive refinement
- **Configuration Management** - Local and global config with environment variable support
- **Basic Commands** - `commit` and `config:init` commands implemented

### 🎯 Key Commands

```bash
# Initialize configuration
mastro config:init

# Generate commit message from staged changes  
mastro commit

# Interactive refinement mode
mastro commit --interactive

# Preview without committing
mastro commit --dry-run

# Show help
mastro --help
mastro commit --help
```

## 🏗️ Architecture

```
mastro/
├── src/
│   ├── core/                # Core AI and Git functionality
│   │   ├── ai-client.ts     # AI provider abstraction
│   │   ├── git-analyzer.ts  # Advanced git analysis
│   │   ├── context-engine.ts# Intelligent code understanding
│   │   └── cache-manager.ts # Performance optimization
│   ├── commands/           # CLI commands
│   │   ├── commit.ts       # Main commit command
│   │   └── config/         # Configuration commands
│   ├── ui/                 # Terminal UI components
│   │   ├── renderer.ts     # Rich output rendering
│   │   └── interactive.ts  # User interaction
│   └── base/
│       └── command.ts      # Base command class
```

## 🔧 Installation & Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run locally
./bin/run.js --help

# Set OpenAI API key
export OPENAI_API_KEY=your_api_key_here

# Initialize configuration
./bin/run.js config:init
```

## 🚦 Usage

1. **Stage some changes** in your git repository
2. **Set your OpenAI API key** as an environment variable
3. **Run `mastro commit`** to generate an intelligent commit message
4. **Use `--interactive`** for refinement options

## 🎨 Special Features

- **Progressive Enhancement**: Fast local heuristics + AI streaming
- **Team Learning**: Analyzes existing commit patterns to match team style
- **Interactive Refinement**: "Make it more technical", "Add performance implications", etc.
- **Context Intelligence**: Understands semantic code changes, not just text diffs
- **Multi-layer Caching**: Smart caching for improved performance
- **Rich Terminal UI**: Professional CLI experience with colors and spinners

## 🔮 Coming Next (Phase 2+)

- **Diff Explanation**: `mastro explain HEAD~3..HEAD`
- **PR Management**: `mastro pr create` with smart templates
- **Code Review**: `mastro review` with configurable personas
- **Advanced Caching**: SQLite persistence for team environments
- **Plugin System**: Custom AI providers and integrations

## 🛠️ Development

```bash
# Development mode
npm run dev

# Type checking
npm run build

# Linting
npm run lint
```

## 💡 Technical Highlights

- **TypeScript**: Strict typing with comprehensive error handling
- **Extensible Architecture**: Plugin system for AI providers and custom logic
- **Performance Optimized**: Smart caching and progressive enhancement
- **User Experience**: Rich terminal UI with interactive features
- **Production Ready**: Proper error handling, logging, and configuration

---

Built with ❤️ using TypeScript, oclif, and OpenAI.