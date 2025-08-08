import * as vscode from 'vscode';
import { LiveQualityEngine, QualityIssue } from '../services/liveQualityEngine';
import { RealTimeAnalyzer } from '../services/realTimeAnalyzer';

/**
 * Mastro Code Action Provider that offers intelligent refactoring suggestions
 * and quick fixes based on real-time quality analysis
 */
export class MastroCodeActionProvider implements vscode.CodeActionProvider {
    private liveQualityEngine: LiveQualityEngine;
    private realTimeAnalyzer: RealTimeAnalyzer;

    constructor(liveQualityEngine: LiveQualityEngine, realTimeAnalyzer: RealTimeAnalyzer) {
        this.liveQualityEngine = liveQualityEngine;
        this.realTimeAnalyzer = realTimeAnalyzer;
    }

    async provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.CodeAction[]> {
        const actions: vscode.CodeAction[] = [];

        try {
            // Get quality metrics for current file
            const metrics = this.liveQualityEngine.getFileMetrics(document.uri.fsPath);
            
            // Get refactoring opportunities
            const opportunities = this.realTimeAnalyzer.getRefactoringOpportunities(document.uri.fsPath);
            
            // Add actions for quality issues in the current range
            for (const metric of metrics) {
                for (const issue of metric.issues) {
                    if (this.isIssueInRange(issue, range)) {
                        const action = this.createFixAction(document, issue);
                        if (action) actions.push(action);
                    }
                }
            }
            
            // Add refactoring actions for opportunities in the current range
            for (const opportunity of opportunities) {
                if (this.isOpportunityInRange(opportunity, range)) {
                    const action = this.createRefactoringAction(document, opportunity);
                    if (action) actions.push(action);
                }
            }
            
            // Add general improvement actions
            const generalActions = await this.createGeneralImprovementActions(document, range);
            actions.push(...generalActions);
            
        } catch (error) {
            console.error('Error providing code actions:', error);
        }

        return actions;
    }

    private isIssueInRange(issue: QualityIssue, range: vscode.Range): boolean {
        const issueLine = issue.line;
        return issueLine >= range.start.line && issueLine <= range.end.line;
    }

    private isOpportunityInRange(opportunity: any, range: vscode.Range): boolean {
        return opportunity.line >= range.start.line && opportunity.line <= range.end.line;
    }

    private createFixAction(document: vscode.TextDocument, issue: QualityIssue): vscode.CodeAction | null {
        const action = new vscode.CodeAction(
            issue.autoFixable ? `Fix: ${issue.message}` : `Mastro: ${issue.message}`,
            issue.autoFixable ? vscode.CodeActionKind.QuickFix : vscode.CodeActionKind.Refactor
        );

        action.diagnostics = []; // Would be populated if we had matching diagnostics
        action.isPreferred = issue.severity === 'error';

        switch (issue.rule) {
            case 'max-line-length':
                return this.createLineLengthFix(document, issue, action);
            
            case 'no-magic-numbers':
                return this.createMagicNumberFix(document, issue, action);
            
            case 'no-secrets-logging':
                return this.createSecretsLoggingFix(document, issue, action);
            
            case 'no-eval':
                return this.createEvalFix(document, issue, action);
            
            case 'no-inner-html':
                return this.createInnerHtmlFix(document, issue, action);
            
            default:
                // Generic action without edit
                return action;
        }
    }

    private createLineLengthFix(
        document: vscode.TextDocument,
        issue: QualityIssue,
        action: vscode.CodeAction
    ): vscode.CodeAction {
        const line = document.lineAt(issue.line);
        const lineText = line.text;
        
        // Try to break the line at logical points
        const breakPoints = [
            lineText.indexOf('&&'),
            lineText.indexOf('||'),
            lineText.indexOf(','),
            lineText.indexOf('.')
        ].filter(pos => pos > 80 && pos < 120);

        if (breakPoints.length > 0) {
            const breakPoint = breakPoints[0];
            const beforeBreak = lineText.substring(0, breakPoint + (lineText[breakPoint] === ',' ? 1 : 2));
            const afterBreak = lineText.substring(breakPoint + (lineText[breakPoint] === ',' ? 1 : 2));
            const indent = lineText.match(/^\s*/)?.[0] || '';
            
            action.edit = new vscode.WorkspaceEdit();
            action.edit.replace(
                document.uri,
                line.range,
                `${beforeBreak}\n${indent}    ${afterBreak.trim()}`
            );
        }
        
        return action;
    }

    private createMagicNumberFix(
        document: vscode.TextDocument,
        issue: QualityIssue,
        action: vscode.CodeAction
    ): vscode.CodeAction {
        const line = document.lineAt(issue.line);
        const lineText = line.text;
        
        // Extract the magic number
        const numberMatch = lineText.match(/\d{2,}/);
        if (numberMatch) {
            const number = numberMatch[0];
            const constantName = `CONSTANT_${number}`;
            
            // Add the constant at the top of the file and replace usage
            action.edit = new vscode.WorkspaceEdit();
            
            // Add constant declaration at the top
            action.edit.insert(
                document.uri,
                new vscode.Position(0, 0),
                `const ${constantName} = ${number};\n`
            );
            
            // Replace the magic number
            const numberStart = lineText.indexOf(number);
            const numberRange = new vscode.Range(
                issue.line,
                numberStart,
                issue.line,
                numberStart + number.length
            );
            
            action.edit.replace(document.uri, numberRange, constantName);
        }
        
        return action;
    }

    private createSecretsLoggingFix(
        document: vscode.TextDocument,
        issue: QualityIssue,
        action: vscode.CodeAction
    ): vscode.CodeAction {
        const line = document.lineAt(issue.line);
        const lineText = line.text;
        
        // Replace with a safer logging approach
        const safeLine = lineText.replace(
            /(console\.log\(.*)(password|token|secret|key)([^)]*\))/i,
            '$1[REDACTED]$3'
        );
        
        action.edit = new vscode.WorkspaceEdit();
        action.edit.replace(document.uri, line.range, safeLine);
        
        return action;
    }

    private createEvalFix(
        document: vscode.TextDocument,
        issue: QualityIssue,
        action: vscode.CodeAction
    ): vscode.CodeAction {
        // This is complex to auto-fix, so just provide guidance
        action.title = 'Mastro: Replace eval() with safer alternative (manual fix required)';
        action.kind = vscode.CodeActionKind.Refactor;
        
        // Could add a comment with suggestions
        const line = document.lineAt(issue.line);
        const commentText = `${line.text}\n// TODO: Replace eval() with JSON.parse(), Function constructor, or other safe alternative`;
        
        action.edit = new vscode.WorkspaceEdit();
        action.edit.replace(document.uri, line.range, commentText);
        
        return action;
    }

    private createInnerHtmlFix(
        document: vscode.TextDocument,
        issue: QualityIssue,
        action: vscode.CodeAction
    ): vscode.CodeAction {
        const line = document.lineAt(issue.line);
        const lineText = line.text;
        
        // Replace innerHTML with textContent for simple cases
        const safeLine = lineText.replace(/\.innerHTML\s*=/, '.textContent =');
        
        action.edit = new vscode.WorkspaceEdit();
        action.edit.replace(document.uri, line.range, safeLine);
        action.title = 'Replace innerHTML with textContent';
        
        return action;
    }

    private createRefactoringAction(document: vscode.TextDocument, opportunity: any): vscode.CodeAction | null {
        const action = new vscode.CodeAction(
            `Mastro: ${opportunity.description}`,
            vscode.CodeActionKind.RefactorExtract
        );

        switch (opportunity.type) {
            case 'extract_function':
                return this.createExtractFunctionAction(document, opportunity, action);
            
            case 'simplify_conditional':
                return this.createSimplifyConditionalAction(document, opportunity, action);
            
            case 'reduce_complexity':
                return this.createReduceComplexityAction(document, opportunity, action);
            
            default:
                // Generic suggestion without automatic edit
                action.title = `Mastro Suggestion: ${opportunity.description}`;
                return action;
        }
    }

    private createExtractFunctionAction(
        document: vscode.TextDocument,
        opportunity: any,
        action: vscode.CodeAction
    ): vscode.CodeAction {
        action.title = `Extract method from long function`;
        action.command = {
            title: 'Extract Function',
            command: 'mastro.showExtractFunctionHelp',
            arguments: [document.uri, opportunity]
        };
        
        return action;
    }

    private createSimplifyConditionalAction(
        document: vscode.TextDocument,
        opportunity: any,
        action: vscode.CodeAction
    ): vscode.CodeAction {
        action.title = `Simplify complex conditional`;
        action.command = {
            title: 'Simplify Conditional',
            command: 'mastro.showSimplifyConditionalHelp',
            arguments: [document.uri, opportunity]
        };
        
        return action;
    }

    private createReduceComplexityAction(
        document: vscode.TextDocument,
        opportunity: any,
        action: vscode.CodeAction
    ): vscode.CodeAction {
        action.title = `Reduce function complexity`;
        action.command = {
            title: 'Reduce Complexity',
            command: 'mastro.showComplexityHelp',
            arguments: [document.uri, opportunity]
        };
        
        return action;
    }

    private async createGeneralImprovementActions(
        document: vscode.TextDocument,
        range: vscode.Range
    ): Promise<vscode.CodeAction[]> {
        const actions: vscode.CodeAction[] = [];
        
        // Add documentation action
        const addDocsAction = new vscode.CodeAction(
            'Mastro: Add documentation to function',
            vscode.CodeActionKind.Refactor
        );
        addDocsAction.command = {
            title: 'Add Documentation',
            command: 'mastro.addDocumentation',
            arguments: [document.uri, range]
        };
        actions.push(addDocsAction);
        
        // Add test creation action
        const addTestAction = new vscode.CodeAction(
            'Mastro: Create test for this function',
            vscode.CodeActionKind.Refactor
        );
        addTestAction.command = {
            title: 'Create Test',
            command: 'mastro.createTest',
            arguments: [document.uri, range]
        };
        actions.push(addTestAction);
        
        // Add performance analysis action
        const analyzePerformanceAction = new vscode.CodeAction(
            'Mastro: Analyze performance impact',
            vscode.CodeActionKind.Source
        );
        analyzePerformanceAction.command = {
            title: 'Analyze Performance',
            command: 'mastro.analyzePerformance',
            arguments: [document.uri, range]
        };
        actions.push(analyzePerformanceAction);
        
        return actions;
    }
}

/**
 * Mastro Refactoring Helper - Provides guided refactoring assistance
 */
export class MastroRefactoringHelper {
    
    static async showExtractFunctionHelp(uri: vscode.Uri, opportunity: any): Promise<void> {
        const message = `
**Extract Function Suggestion**

${opportunity.description}

**Benefits:**
- ${opportunity.benefit}
- Improved code organization
- Better testability

**Recommended Steps:**
1. Select the code block to extract (lines ${opportunity.line} and below)
2. Use VS Code's "Extract to function" refactoring (Ctrl+Shift+R)
3. Give the function a descriptive name
4. Consider adding JSDoc documentation

**Effort**: ${opportunity.effort}
        `.trim();
        
        const action = await vscode.window.showInformationMessage(
            'Extract Function Guidance',
            { modal: true, detail: message },
            'Apply Refactoring',
            'Learn More',
            'Dismiss'
        );
        
        if (action === 'Apply Refactoring') {
            await vscode.commands.executeCommand('editor.action.refactor');
        } else if (action === 'Learn More') {
            vscode.env.openExternal(vscode.Uri.parse('https://docs.mastro.ai/refactoring/extract-function'));
        }
    }

    static async showSimplifyConditionalHelp(uri: vscode.Uri, opportunity: any): Promise<void> {
        const message = `
**Simplify Conditional Suggestion**

${opportunity.description}

**Common Techniques:**
- Use early returns to reduce nesting
- Extract complex conditions into well-named boolean variables
- Consider using switch statements for multiple conditions
- Break down nested conditions into separate functions

**Example:**
\`\`\`typescript
// Instead of:
if (user && user.isActive && user.permissions.includes('admin')) {
  // ...
}

// Consider:
const isActiveAdmin = user?.isActive && user?.permissions.includes('admin');
if (isActiveAdmin) {
  // ...
}
\`\`\`

**Effort**: ${opportunity.effort}
        `.trim();
        
        vscode.window.showInformationMessage(
            'Simplify Conditional Guidance',
            { modal: true, detail: message },
            'Got it'
        );
    }

    static async showComplexityHelp(uri: vscode.Uri, opportunity: any): Promise<void> {
        const message = `
**Reduce Complexity Suggestion**

Function has high complexity and would benefit from refactoring.

**Strategies:**
- Break large functions into smaller, focused functions
- Extract complex logic into helper methods  
- Use early returns to reduce nesting
- Consider using design patterns (Strategy, Command, etc.)
- Move complex calculations to separate utility functions

**Current Complexity**: High
**Target**: Keep functions under 10 complexity points

**Benefits:**
- Easier to understand and maintain
- Better testability
- Reduced bug risk
        `.trim();
        
        vscode.window.showInformationMessage(
            'Reduce Complexity Guidance', 
            { modal: true, detail: message },
            'Show Examples',
            'Dismiss'
        ).then(action => {
            if (action === 'Show Examples') {
                vscode.env.openExternal(vscode.Uri.parse('https://docs.mastro.ai/refactoring/complexity'));
            }
        });
    }

    static async addDocumentation(uri: vscode.Uri, range: vscode.Range): Promise<void> {
        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document);
        
        // Find function at range
        const line = document.lineAt(range.start.line);
        const functionMatch = line.text.match(/(?:function\s+(\w+)|(\w+)\s*[=:]\s*(?:function|\(.*\)\s*=>))/);
        
        if (functionMatch) {
            const functionName = functionMatch[1] || functionMatch[2] || 'function';
            
            const docTemplate = `/**
 * TODO: Describe what this function does
 * @param {type} param - TODO: Describe parameter
 * @returns {type} TODO: Describe return value
 */
`;
            
            const edit = new vscode.WorkspaceEdit();
            edit.insert(uri, new vscode.Position(range.start.line, 0), docTemplate);
            
            await vscode.workspace.applyEdit(edit);
            
            // Position cursor at first TODO
            const newPosition = new vscode.Position(range.start.line + 1, 10);
            editor.selection = new vscode.Selection(newPosition, newPosition);
        }
    }

    static async createTest(uri: vscode.Uri, range: vscode.Range): Promise<void> {
        const document = await vscode.workspace.openTextDocument(uri);
        const line = document.lineAt(range.start.line);
        
        // Extract function name
        const functionMatch = line.text.match(/(?:function\s+(\w+)|(\w+)\s*[=:])/);
        const functionName = functionMatch?.[1] || functionMatch?.[2] || 'function';
        
        // Determine test file path
        const sourceFilePath = uri.fsPath;
        const testFilePath = sourceFilePath.replace(/\.(ts|js)$/, '.test.$1');
        
        // Create basic test template
        const testTemplate = `import { ${functionName} } from './${document.fileName.replace(/\.(ts|js)$/, '')}';

describe('${functionName}', () => {
  it('should TODO: describe expected behavior', () => {
    // Arrange
    const input = /* TODO: define input */;
    const expected = /* TODO: define expected output */;
    
    // Act
    const result = ${functionName}(input);
    
    // Assert
    expect(result).toBe(expected);
  });
  
  it('should handle edge cases', () => {
    // TODO: Add edge case tests
  });
});
`;
        
        try {
            // Check if test file already exists
            await vscode.workspace.fs.stat(vscode.Uri.file(testFilePath));
            vscode.window.showInformationMessage('Test file already exists. Opening for editing.');
            const testDoc = await vscode.workspace.openTextDocument(testFilePath);
            await vscode.window.showTextDocument(testDoc);
        } catch {
            // Test file doesn't exist, create it
            const testUri = vscode.Uri.file(testFilePath);
            await vscode.workspace.fs.writeFile(testUri, Buffer.from(testTemplate));
            
            const testDoc = await vscode.workspace.openTextDocument(testUri);
            await vscode.window.showTextDocument(testDoc);
            
            vscode.window.showInformationMessage(`Created test file: ${testFilePath}`);
        }
    }

    static async analyzePerformance(uri: vscode.Uri, range: vscode.Range): Promise<void> {
        vscode.window.showInformationMessage(
            'Performance analysis feature coming soon! This will provide detailed performance impact analysis.',
            'Learn More'
        ).then(action => {
            if (action === 'Learn More') {
                vscode.env.openExternal(vscode.Uri.parse('https://docs.mastro.ai/performance-analysis'));
            }
        });
    }
}