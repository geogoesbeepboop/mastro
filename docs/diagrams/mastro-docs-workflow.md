# Mastro Documentation Generation Workflow

> **Complete documentation generation process flow with AI integration and multi-format output**

This diagram illustrates the comprehensive documentation generation workflow in Mastro, showing how the system analyzes project structure, leverages AI for content generation, and produces multi-format documentation output.

## High-Level Documentation Workflow

```mermaid
flowchart TD
    A[mastro docs command] --> B{Documentation Type?}
    
    B -->|All| C[Generate All Types]
    B -->|API| D[API Documentation]
    B -->|Architecture| E[Architecture Docs]
    B -->|User Guide| F[User Guide]
    B -->|README| G[README Generation]
    
    C --> H[DocumentationAnalyzer]
    D --> H
    E --> H
    F --> H
    G --> H
    
    H --> I[Project Structure Analysis]
    I --> J[Code Analysis Engine]
    J --> K[DocumentationEngine]
    
    K --> L{AI Content Generation}
    L --> M[Static Templates]
    L --> N[AI-Enhanced Content]
    
    M --> O[Content Merge]
    N --> O
    
    O --> P[Mermaid Diagram Generation]
    P --> Q[Multi-format Output]
    
    Q --> R[Markdown Files]
    Q --> S[JSON/OpenAPI]
    Q --> T[HTML Output]
    
    R --> U[FileSystemManager]
    S --> U
    T --> U
    
    U --> V[Generated Documentation]
    
    style A fill:#e1f5fe
    style K fill:#f3e5f5
    style L fill:#fff3e0
    style V fill:#e8f5e8
```

## Detailed Analysis Pipeline

```mermaid
flowchart TB
    subgraph "Input Analysis"
        A1[Project Root] --> A2[Directory Scanner]
        A2 --> A3[File Type Classifier]
        A3 --> A4[Language Detection]
        A4 --> A5[Framework Detection]
    end
    
    subgraph "Code Analysis Engine"
        A5 --> B1[Function Extractor]
        A5 --> B2[Class Analyzer] 
        A5 --> B3[API Endpoint Detector]
        A5 --> B4[Import/Export Tracker]
        A5 --> B5[Pattern Recognition]
        
        B1 --> C1[Function Signatures]
        B2 --> C2[Class Structures]
        B3 --> C3[REST Endpoints]
        B4 --> C4[Dependencies]
        B5 --> C5[Architectural Patterns]
    end
    
    subgraph "Context Building"
        C1 --> D1[Project Context]
        C2 --> D1
        C3 --> D1
        C4 --> D1
        C5 --> D1
        
        D1 --> D2[Repository Metadata]
        D1 --> D3[Complexity Metrics]
        D1 --> D4[User Flows]
    end
    
    D2 --> E[Documentation Engine]
    D3 --> E
    D4 --> E
    
    style B1 fill:#e3f2fd
    style B2 fill:#e3f2fd
    style B3 fill:#e3f2fd
    style B4 fill:#e3f2fd
    style B5 fill:#e3f2fd
    style E fill:#f3e5f5
```

## AI-Powered Content Generation

```mermaid
sequenceDiagram
    participant U as User
    participant DE as DocumentationEngine
    participant AI as AI Client
    participant TG as Template Generator
    participant FM as FileSystemManager
    
    U->>DE: mastro docs api
    DE->>DE: Analyze project structure
    DE->>DE: Extract API endpoints
    DE->>AI: Generate API descriptions
    AI-->>DE: Enhanced content
    DE->>TG: Merge with templates
    TG-->>DE: Formatted content
    DE->>DE: Generate Mermaid diagrams
    DE->>FM: Write multi-format files
    FM-->>U: Documentation generated
    
    Note over AI: Uses existing AI client<br/>Same as commit/review
    Note over TG: Extensible template system<br/>Custom templates supported
    Note over FM: Outputs: MD, JSON, HTML,<br/>OpenAPI specs
```

## Multi-Format Output Generation

```mermaid
flowchart LR
    subgraph "Content Generation"
        A[Documentation Context] --> B[Content Templates]
        B --> C[AI Enhancement]
        C --> D[Merged Content]
    end
    
    subgraph "Format Processing"
        D --> E{Output Format}
        
        E -->|Markdown| F[Markdown Processor]
        E -->|JSON| G[JSON Serializer]
        E -->|HTML| H[HTML Generator]
        E -->|OpenAPI| I[OpenAPI Builder]
    end
    
    subgraph "File Output"
        F --> J[.md files]
        G --> K[.json files]
        H --> L[.html files]
        I --> M[.yaml/.json specs]
    end
    
    subgraph "Asset Generation"
        D --> N[Mermaid Diagram Generator]
        N --> O[System Diagrams]
        N --> P[User Flow Diagrams]
        N --> Q[Architecture Diagrams]
    end
    
    J --> R[Output Directory]
    K --> R
    L --> R
    M --> R
    O --> R
    P --> R
    Q --> R
    
    style A fill:#e1f5fe
    style D fill:#fff3e0
    style R fill:#e8f5e8
```

## Integration with Existing Mastro Components

```mermaid
flowchart TB
    subgraph "Existing Mastro Infrastructure"
        A1[AI Client] --> B1[Documentation Engine]
        A2[Git Analyzer] --> B1
        A3[Cache Manager] --> B1
        A4[Mastro Config] --> B1
        A5[File Manager] --> B1
    end
    
    subgraph "New Documentation Components"
        B1 --> C1[DocumentationAnalyzer]
        B1 --> C2[FileSystemManager]
        C1 --> C3[Project Structure Analysis]
        C1 --> C4[Code Pattern Detection]
        C2 --> C5[Multi-format Writers]
    end
    
    subgraph "Output Integration"
        C5 --> D1[Markdown Documentation]
        C5 --> D2[API Specifications]
        C5 --> D3[System Diagrams]
        C5 --> D4[Generated Assets]
        
        D1 --> E[Team Documentation]
        D2 --> E
        D3 --> E
        D4 --> E
    end
    
    subgraph "Workflow Integration"
        E --> F1[Git Hooks Integration]
        E --> F2[CI/CD Pipelines]
        E --> F3[Team Workflows]
    end
    
    style B1 fill:#f3e5f5
    style C1 fill:#e3f2fd
    style C2 fill:#e3f2fd
    style E fill:#e8f5e8
```

## File Structure and Templates

```mermaid
flowchart LR
    subgraph "Input Project"
        A1[src/] --> A2[TypeScript Files]
        A1 --> A3[API Routes]
        A1 --> A4[Components]
        A1 --> A5[Configuration]
    end
    
    subgraph "Analysis Results"
        A2 --> B1[Functions/Classes]
        A3 --> B2[REST Endpoints]
        A4 --> B3[Component Structure]
        A5 --> B4[Project Metadata]
    end
    
    subgraph "Template System"
        B1 --> C1[API Template]
        B2 --> C1
        B1 --> C2[Architecture Template]
        B3 --> C2
        B4 --> C3[User Guide Template]
        B4 --> C4[README Template]
    end
    
    subgraph "Generated Documentation"
        C1 --> D1[api.md / openapi.yaml]
        C2 --> D2[architecture.md + diagrams]
        C3 --> D3[user-guide.md]
        C4 --> D4[README.md]
    end
    
    subgraph "Output Structure"
        D1 --> E[docs/]
        D2 --> E
        D3 --> E
        D4 --> F[Project Root]
        E --> G[diagrams/]
    end
    
    style C1 fill:#fff3e0
    style C2 fill:#fff3e0
    style C3 fill:#fff3e0
    style C4 fill:#fff3e0
    style E fill:#e8f5e8
    style F fill:#e8f5e8
    style G fill:#e8f5e8
```

## Command Flow and User Experience

```mermaid
journey
    title Documentation Generation User Journey
    section Discovery
      Run mastro docs --help: 5: User
      Review available options: 4: User
      Choose documentation type: 5: User
    
    section Generation
      Execute mastro docs api: 5: User
      Watch analysis progress: 4: User
      Review generated content: 5: User
    
    section Customization
      Add custom content blocks: 4: User
      Configure templates: 3: User
      Set up automation: 5: User
    
    section Integration
      Commit documentation: 5: User
      Set up CI/CD integration: 4: User
      Share with team: 5: User
```

## Performance and Caching Strategy

```mermaid
flowchart TD
    A[Documentation Request] --> B{Cache Check}
    
    B -->|Hit| C[Return Cached Content]
    B -->|Miss| D[Analyze Project]
    
    D --> E[Generate Content]
    E --> F[Cache Results]
    F --> G[Return Fresh Content]
    
    C --> H[Update Check]
    G --> H
    
    H --> I{Files Changed?}
    I -->|Yes| J[Invalidate Cache]
    I -->|No| K[Use Cached Version]
    
    J --> D
    K --> L[Serve Documentation]
    
    subgraph "Cache Strategy"
        M[File Timestamps] --> N[Content Hash]
        N --> O[Similarity Matching]
        O --> P[Intelligent Invalidation]
    end
    
    style B fill:#e1f5fe
    style F fill:#fff3e0
    style L fill:#e8f5e8
```

---

## Implementation Notes

### Key Design Decisions
1. **Reuse Existing Infrastructure**: Leverages AI Client, Git Analyzer, and Config system
2. **Extensible Template System**: Allows custom documentation templates
3. **Multi-format Support**: Single analysis, multiple output formats
4. **Intelligent Caching**: Performance optimization with smart invalidation
5. **Integration-First**: Designed to work with existing Mastro workflows

### Performance Considerations
- **Incremental Analysis**: Only re-analyze changed files
- **Parallel Processing**: Concurrent analysis of multiple file types
- **Smart Caching**: Content-aware cache invalidation
- **Template Optimization**: Pre-compiled templates for faster generation

### Future Enhancements
- **Custom AI Providers**: Support for different AI models
- **Live Updates**: Watch mode for real-time documentation updates
- **Plugin System**: Third-party documentation generators
- **Advanced Analytics**: Documentation quality metrics and insights

*This diagram represents the complete documentation generation system implemented in Mastro v1.0*