import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base/command.js';
import { DocumentationEngine } from '../../core/doc-engine.js';
import { DocumentationAnalyzer } from '../../analyzers/doc-analyzer.js';
import { FileSystemManager } from '../../core/file-manager.js';
export default class DocsApi extends BaseCommand {
    static description = 'Generate comprehensive API documentation';
    static examples = [
        '<%= config.bin %> <%= command.id %>',
        '<%= config.bin %> <%= command.id %> --include-private',
        '<%= config.bin %> <%= command.id %> --output-dir ./api-docs',
        '<%= config.bin %> <%= command.id %> --format json'
    ];
    static flags = {
        ...BaseCommand.baseFlags,
        'output-dir': Flags.string({
            char: 'o',
            description: 'output directory for API documentation',
            default: './docs'
        }),
        'include-private': Flags.boolean({
            description: 'include private functions and methods in documentation',
            default: false
        }),
        'include-internal': Flags.boolean({
            description: 'include internal APIs in documentation',
            default: false
        }),
        'group-by': Flags.string({
            description: 'group API endpoints by criteria',
            options: ['file', 'method', 'tag', 'none'],
            default: 'file'
        }),
        'include-examples': Flags.boolean({
            description: 'generate usage examples for API endpoints',
            default: true
        }),
        format: Flags.string({
            char: 'f',
            description: 'output format for API documentation',
            options: ['markdown', 'json', 'openapi'],
            default: 'markdown'
        }),
        'base-url': Flags.string({
            description: 'base URL for API endpoints (for examples)',
            default: 'http://localhost:3000'
        })
    };
    docEngine;
    docAnalyzer;
    fileManager;
    async run() {
        const { flags } = await this.parse(DocsApi);
        try {
            // Initialize components
            this.docEngine = new DocumentationEngine(this.mastroConfig, this.aiClient);
            this.docAnalyzer = new DocumentationAnalyzer();
            this.fileManager = new FileSystemManager(flags['output-dir']);
            // Ensure we're in a git repository
            await this.ensureGitRepository();
            this.startSpinner('Scanning project for API endpoints...');
            // Build documentation context with focus on APIs
            const context = await this.buildDocumentationContext();
            // Count API endpoints found
            const totalEndpoints = context.projectStructure.files.reduce((sum, file) => sum + file.apis.length, 0);
            this.updateSpinner(`Found ${totalEndpoints} API endpoints across ${context.projectStructure.files.length} files`);
            if (totalEndpoints === 0) {
                this.stopSpinner(false, 'No API endpoints found');
                this.log('💡 Tip: Make sure your project contains REST API endpoints or exported functions', 'info');
                this.log('   Supported patterns: Express.js routes, exported functions, class methods', 'info');
                return;
            }
            // Create API-specific documentation configuration
            const config = {
                outputDirectory: flags['output-dir'],
                types: ['api'],
                templates: {
                    'api': 'default-api-template',
                    'architecture': 'default-arch-template',
                    'user-guide': 'default-guide-template',
                    'readme': 'default-readme-template',
                    'component': 'default-component-template',
                    'deployment': 'default-deployment-template',
                    'troubleshooting': 'default-troubleshooting-template',
                    'changelog': 'default-changelog-template',
                    'contributing': 'default-contributing-template',
                    'security': 'default-security-template',
                    'performance': 'default-performance-template',
                    'testing': 'default-testing-template',
                    'workflow': 'default-workflow-template',
                    'integration': 'default-integration-template',
                    'all': 'default-all-template'
                },
                includePrivate: flags['include-private'],
                includeTodos: false,
                generateMermaid: false,
                autoUpdate: false
            };
            // Display API analysis
            this.displayApiAnalysis(context, flags);
            this.updateSpinner('Generating comprehensive API documentation...');
            // Generate API documentation
            const apiDoc = await this.docEngine.generateDocumentation('api', context, config);
            // Enhance API documentation with additional details
            const enhancedDoc = await this.enhanceApiDocumentation(apiDoc, context, flags);
            this.updateSpinner('Writing API documentation files...');
            // Write the documentation
            await this.fileManager.writeDocumentation(enhancedDoc);
            // Generate additional API assets if needed
            if (flags.format === 'json' || flags.format === 'openapi') {
                await this.generateApiSpecification(context, flags);
            }
            this.stopSpinner(true, `API documentation generated successfully`);
            // Display comprehensive summary
            this.displayApiDocumentationSummary(enhancedDoc, context, flags);
        }
        catch (error) {
            await this.handleError(error, 'generate API documentation');
        }
    }
    async buildDocumentationContext() {
        const repository = await this.buildRepoContext();
        const workingDir = await this.gitAnalyzer.getRepoRoot();
        // Focus on API-related analysis
        const projectStructure = await this.docAnalyzer.analyzeProjectStructure(workingDir);
        const codeAnalysis = await this.docAnalyzer.analyzeCodebase(projectStructure);
        return {
            repository,
            projectStructure,
            codeAnalysis,
            workingDir
        };
    }
    async buildRepoContext() {
        const repoRoot = await this.gitAnalyzer.getRepoRoot();
        const repoName = repoRoot.split('/').pop() || 'unknown';
        return {
            name: repoName,
            root: repoRoot,
            language: 'typescript',
            framework: 'nodejs',
            patterns: {
                commitStyle: 'conventional',
                prefixes: ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'],
                maxLength: 72,
                commonPhrases: ['update', 'add', 'remove', 'fix', 'improve'],
                reviewPersona: {
                    name: 'Senior Engineer',
                    focus: ['maintainability', 'performance'],
                    strictness: 'moderate',
                    customRules: []
                }
            },
            recentCommits: await this.gitAnalyzer.getRecentCommits(10)
        };
    }
    displayApiAnalysis(context, flags) {
        this.log('\n📡 API Analysis Results', 'info');
        this.log('─'.repeat(30));
        const apiFiles = context.projectStructure.files.filter((f) => f.apis.length > 0);
        const totalEndpoints = apiFiles.reduce((sum, file) => sum + file.apis.length, 0);
        const methodCounts = this.getMethodCounts(apiFiles);
        this.log(`API Files: ${apiFiles.length}`);
        this.log(`Total Endpoints: ${totalEndpoints}`);
        this.log(`HTTP Methods: ${Object.entries(methodCounts).map(([method, count]) => `${method}(${count})`).join(', ')}`);
        if (context.repository.framework) {
            this.log(`Framework: ${context.repository.framework}`);
        }
        this.log(`Include Private: ${flags['include-private'] ? 'Yes' : 'No'}`);
        this.log(`Include Examples: ${flags['include-examples'] ? 'Yes' : 'No'}`);
        this.log('');
        // Show top API files
        this.log('📂 API Files:');
        for (const file of apiFiles.slice(0, 5)) {
            this.log(`   ${file.path} (${file.apis.length} endpoint${file.apis.length !== 1 ? 's' : ''})`);
        }
        if (apiFiles.length > 5) {
            this.log(`   ... and ${apiFiles.length - 5} more files`);
        }
        this.log('');
    }
    async enhanceApiDocumentation(apiDoc, context, flags) {
        // Add more detailed API information
        const enhanced = { ...apiDoc };
        // Add base URL information
        if (flags['base-url']) {
            enhanced.content = enhanced.content.replace('# API Documentation', `# API Documentation\\n\\n**Base URL:** \`${flags['base-url']}\`\\n`);
        }
        // Add authentication section if patterns suggest it
        if (this.hasAuthenticationPatterns(context)) {
            enhanced.content += '\\n\\n## Authentication\\n\\nThis API uses authentication. Please refer to the authentication documentation for details.\\n';
        }
        // Add error handling section
        enhanced.content += this.generateErrorHandlingSection();
        // Add rate limiting info if detected
        if (this.hasRateLimitingPatterns(context)) {
            enhanced.content += '\\n\\n## Rate Limiting\\n\\nThis API implements rate limiting. Please refer to response headers for current limits.\\n';
        }
        return enhanced;
    }
    async generateApiSpecification(context, flags) {
        if (flags.format === 'json') {
            const apiSpec = this.buildJsonApiSpec(context);
            const specPath = `api-spec.json`;
            const specOutput = {
                type: 'api',
                title: 'API Specification (JSON)',
                content: JSON.stringify(apiSpec, null, 2),
                filePath: specPath,
                sections: [],
                references: []
            };
            await this.fileManager.writeDocumentation(specOutput);
        }
        if (flags.format === 'openapi') {
            const openApiSpec = this.buildOpenApiSpec(context);
            const specPath = `openapi.yaml`;
            const specOutput = {
                type: 'api',
                title: 'OpenAPI Specification',
                content: openApiSpec,
                filePath: specPath,
                sections: [],
                references: []
            };
            await this.fileManager.writeDocumentation(specOutput);
        }
    }
    displayApiDocumentationSummary(apiDoc, context, flags) {
        this.log('\n📡 API Documentation Generated', 'info');
        this.log('═'.repeat(40));
        const apiFiles = context.projectStructure.files.filter((f) => f.apis.length > 0);
        const totalEndpoints = apiFiles.reduce((sum, file) => sum + file.apis.length, 0);
        const contentSize = (apiDoc.content.length / 1024).toFixed(1);
        this.log(`📄 Generated: ${apiDoc.filePath} (${contentSize}KB)`);
        this.log(`🎯 Documented ${totalEndpoints} API endpoints`);
        this.log(`📂 Analyzed ${apiFiles.length} API files`);
        if (apiDoc.sections) {
            this.log(`📑 Created ${apiDoc.sections.length} documentation sections`);
        }
        this.log(`🔧 Format: ${flags.format}`);
        this.log(`📁 Output: ${flags['output-dir']}/`);
        this.log('');
        // Show method breakdown
        const methodCounts = this.getMethodCounts(apiFiles);
        this.log('🔗 HTTP Methods:');
        for (const [method, count] of Object.entries(methodCounts)) {
            this.log(`   ${method}: ${count} endpoint${count !== 1 ? 's' : ''}`);
        }
        this.log('');
        this.log('💡 Next Steps:');
        this.log('   • Review the generated API documentation');
        this.log('   • Add custom examples and descriptions');
        this.log('   • Test API endpoints for accuracy');
        if (flags.format === 'markdown') {
            this.log('   • Consider generating OpenAPI spec: `mastro docs api --format openapi`');
        }
    }
    getMethodCounts(apiFiles) {
        const counts = {};
        for (const file of apiFiles) {
            for (const api of file.apis) {
                counts[api.method] = (counts[api.method] || 0) + 1;
            }
        }
        return counts;
    }
    hasAuthenticationPatterns(context) {
        // Simple pattern detection for authentication
        const authPatterns = ['auth', 'token', 'jwt', 'bearer', 'session'];
        return context.projectStructure.files.some((file) => authPatterns.some(pattern => file.path.toLowerCase().includes(pattern) ||
            file.imports.some((imp) => imp.module.toLowerCase().includes(pattern))));
    }
    hasRateLimitingPatterns(context) {
        // Simple pattern detection for rate limiting
        const rateLimitPatterns = ['rate-limit', 'ratelimit', 'throttle', 'limit'];
        return context.projectStructure.files.some((file) => rateLimitPatterns.some(pattern => file.imports.some((imp) => imp.module.toLowerCase().includes(pattern))));
    }
    generateErrorHandlingSection() {
        return `
## Error Handling

The API uses standard HTTP response codes to indicate success or failure:

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200  | OK - Request successful |
| 201  | Created - Resource created successfully |
| 400  | Bad Request - Invalid request parameters |
| 401  | Unauthorized - Authentication required |
| 403  | Forbidden - Access denied |
| 404  | Not Found - Resource not found |
| 500  | Internal Server Error - Server error |

### Error Response Format

\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional error details"
  }
}
\`\`\`
`;
    }
    buildJsonApiSpec(context) {
        const apiFiles = context.projectStructure.files.filter((f) => f.apis.length > 0);
        return {
            info: {
                title: `${context.repository.name} API`,
                version: '1.0.0',
                description: `API specification for ${context.repository.name}`
            },
            baseUrl: 'http://localhost:3000',
            endpoints: apiFiles.flatMap((file) => file.apis.map((api) => ({
                path: api.path,
                method: api.method,
                handler: api.handler,
                description: api.description || `${api.method} ${api.path}`,
                parameters: api.parameters || [],
                responses: api.responses || []
            })))
        };
    }
    buildOpenApiSpec(context) {
        const apiFiles = context.projectStructure.files.filter((f) => f.apis.length > 0);
        const lines = [];
        lines.push('openapi: 3.0.0');
        lines.push('info:');
        lines.push(`  title: ${context.repository.name} API`);
        lines.push('  version: 1.0.0');
        lines.push(`  description: API specification for ${context.repository.name}`);
        lines.push('');
        lines.push('servers:');
        lines.push('  - url: http://localhost:3000');
        lines.push('    description: Development server');
        lines.push('');
        lines.push('paths:');
        for (const file of apiFiles) {
            for (const api of file.apis) {
                lines.push(`  ${api.path}:`);
                lines.push(`    ${api.method.toLowerCase()}:`);
                lines.push(`      summary: ${api.description || api.path}`);
                lines.push('      responses:');
                lines.push("        '200':");
                lines.push('          description: Successful response');
                lines.push('');
            }
        }
        return lines.join('\n');
    }
}
//# sourceMappingURL=api.js.map