export class ImpactAnalyzer {
    async analyzeImpact(changes, semanticAnalysis) {
        const basicImpact = await this.analyzeBasicImpact(changes);
        const businessImpact = await this.analyzeBusinessImpact(changes, semanticAnalysis);
        const technicalImpact = await this.analyzeTechnicalImpact(changes, semanticAnalysis);
        const userImpact = await this.analyzeUserImpact(changes, semanticAnalysis);
        const performanceImpact = await this.analyzePerformanceImpact(changes, semanticAnalysis);
        const securityImpact = await this.analyzeSecurityImpact(changes, semanticAnalysis);
        const maintenanceImpact = await this.analyzeMaintenanceImpact(changes, semanticAnalysis);
        return {
            ...basicImpact,
            businessImpact,
            technicalImpact,
            userImpact,
            performanceImpact,
            securityImpact,
            maintenanceImpact
        };
    }
    async analyzeBasicImpact(changes) {
        const affectedComponents = this.identifyAffectedComponents(changes);
        const potentialIssues = this.identifyPotentialIssues(changes);
        const testingRecommendations = this.generateTestingRecommendations(changes);
        const risk = this.assessRisk(changes, affectedComponents, potentialIssues);
        const scope = this.assessScope(changes, affectedComponents);
        return {
            risk,
            scope,
            affectedComponents,
            potentialIssues,
            testingRecommendations
        };
    }
    async analyzeBusinessImpact(changes, semanticAnalysis) {
        const customerFacing = this.isCustomerFacing(changes, semanticAnalysis);
        const revenueImpact = this.assessRevenueImpact(changes, semanticAnalysis);
        const userExperienceChange = this.assessUserExperienceChange(changes, semanticAnalysis);
        const timeToMarket = this.assessTimeToMarket(changes, semanticAnalysis);
        const competitiveAdvantage = this.assessCompetitiveAdvantage(changes, semanticAnalysis);
        return {
            customerFacing,
            revenueImpact,
            userExperienceChange,
            timeToMarket,
            competitiveAdvantage
        };
    }
    async analyzeTechnicalImpact(changes, semanticAnalysis) {
        const architectureChange = this.assessArchitectureChange(changes, semanticAnalysis);
        const codeQuality = this.assessCodeQuality(changes, semanticAnalysis);
        const testCoverage = this.assessTestCoverage(changes, semanticAnalysis);
        const technicalDebt = this.assessTechnicalDebt(changes, semanticAnalysis);
        const scalability = this.assessScalability(changes, semanticAnalysis);
        return {
            architectureChange,
            codeQuality,
            testCoverage,
            technicalDebt,
            scalability
        };
    }
    async analyzeUserImpact(changes, semanticAnalysis) {
        const affectedUserGroups = this.identifyAffectedUserGroups(changes, semanticAnalysis);
        const usabilityChange = this.assessUsabilityChange(changes, semanticAnalysis);
        const accessibilityChange = this.assessAccessibilityChange(changes, semanticAnalysis);
        const performanceChange = this.assessPerformanceChange(changes, semanticAnalysis);
        const featureAvailability = this.assessFeatureAvailability(changes, semanticAnalysis);
        return {
            affectedUserGroups,
            usabilityChange,
            accessibilityChange,
            performanceChange,
            featureAvailability
        };
    }
    async analyzePerformanceImpact(changes, semanticAnalysis) {
        return {
            cpuUsage: this.assessCpuUsage(changes, semanticAnalysis),
            memoryUsage: this.assessMemoryUsage(changes, semanticAnalysis),
            networkTraffic: this.assessNetworkTraffic(changes, semanticAnalysis),
            databaseLoad: this.assessDatabaseLoad(changes, semanticAnalysis),
            responseTime: this.assessResponseTime(changes, semanticAnalysis),
            throughput: this.assessThroughput(changes, semanticAnalysis)
        };
    }
    async analyzeSecurityImpact(changes, semanticAnalysis) {
        const securityRisks = semanticAnalysis.riskFactors.filter(r => r.type === 'security');
        return {
            vulnerabilityIntroduction: securityRisks.length > 0,
            vulnerabilityResolution: this.hasSecurityFixes(changes, semanticAnalysis),
            accessControlChange: this.hasAccessControlChanges(changes, semanticAnalysis),
            dataExposureRisk: this.assessDataExposureRisk(changes, semanticAnalysis),
            authenticationChange: this.hasAuthenticationChanges(changes, semanticAnalysis),
            encryptionChange: this.hasEncryptionChanges(changes, semanticAnalysis)
        };
    }
    async analyzeMaintenanceImpact(changes, semanticAnalysis) {
        return {
            codeComplexity: this.assessCodeComplexityChange(changes, semanticAnalysis),
            debuggability: this.assessDebuggabilityChange(changes, semanticAnalysis),
            documentationQuality: this.assessDocumentationQuality(changes, semanticAnalysis),
            teamKnowledgeDistribution: this.assessKnowledgeDistribution(changes, semanticAnalysis),
            onboardingComplexity: this.assessOnboardingComplexity(changes, semanticAnalysis)
        };
    }
    // Business Impact Assessment Methods
    isCustomerFacing(changes, semanticAnalysis) {
        const uiFiles = changes.filter(c => c.file.includes('component') ||
            c.file.includes('page') ||
            c.file.includes('view') ||
            c.file.includes('.css') ||
            c.file.includes('.scss') ||
            c.file.endsWith('.html'));
        const hasApiChanges = semanticAnalysis.codeStructure.exports.length > 0;
        return uiFiles.length > 0 || hasApiChanges;
    }
    assessRevenueImpact(changes, semanticAnalysis) {
        if (semanticAnalysis.changeType === 'feature') {
            return this.isCustomerFacing(changes, semanticAnalysis) ? 'medium' : 'low';
        }
        if (semanticAnalysis.changeType === 'bugfix') {
            const breakingRisks = semanticAnalysis.riskFactors.filter(r => r.type === 'breaking');
            return breakingRisks.length > 0 ? 'high' : 'low';
        }
        return 'none';
    }
    assessUserExperienceChange(changes, semanticAnalysis) {
        if (semanticAnalysis.changeType === 'feature')
            return 'improved';
        if (semanticAnalysis.changeType === 'bugfix')
            return 'improved';
        const performanceRisks = semanticAnalysis.riskFactors.filter(r => r.type === 'performance');
        return performanceRisks.length > 0 ? 'degraded' : 'unchanged';
    }
    assessTimeToMarket(changes, semanticAnalysis) {
        if (semanticAnalysis.changeType === 'chore' || semanticAnalysis.changeType === 'refactor') {
            return 'accelerated'; // Infrastructure improvements
        }
        if (semanticAnalysis.complexity.cyclomaticComplexity > 20) {
            return 'delayed'; // High complexity changes take time
        }
        return 'neutral';
    }
    assessCompetitiveAdvantage(changes, semanticAnalysis) {
        if (semanticAnalysis.changeType === 'feature' && this.isCustomerFacing(changes, semanticAnalysis)) {
            return 'increased';
        }
        if (semanticAnalysis.changeType === 'refactor' || semanticAnalysis.changeType === 'test') {
            return 'maintained'; // Quality improvements
        }
        return 'maintained';
    }
    // Technical Impact Assessment Methods
    assessArchitectureChange(changes, semanticAnalysis) {
        const breakingRisks = semanticAnalysis.riskFactors.filter(r => r.type === 'breaking');
        if (breakingRisks.length > 0)
            return 'breaking';
        const newClasses = semanticAnalysis.codeStructure.addedClasses.length;
        const removedFunctions = semanticAnalysis.codeStructure.removedFunctions.length;
        if (newClasses > 2 || removedFunctions > 0)
            return 'major';
        if (newClasses > 0 || semanticAnalysis.codeStructure.addedFunctions.length > 5)
            return 'minor';
        return 'none';
    }
    assessCodeQuality(changes, semanticAnalysis) {
        if (semanticAnalysis.changeType === 'refactor')
            return 'improved';
        if (semanticAnalysis.changeType === 'test')
            return 'improved';
        const complexityIncrease = semanticAnalysis.complexity.cyclomaticComplexity > 15;
        return complexityIncrease ? 'degraded' : 'unchanged';
    }
    assessTestCoverage(changes, semanticAnalysis) {
        const testFiles = changes.filter(c => c.file.includes('test') || c.file.includes('spec'));
        const testFileChanges = testFiles.reduce((sum, f) => sum + f.insertions, 0);
        const codeChanges = changes.reduce((sum, f) => sum + f.insertions, 0) - testFileChanges;
        if (testFileChanges > codeChanges * 0.5)
            return 'increased';
        if (testFiles.length === 0 && codeChanges > 100)
            return 'decreased';
        return 'unchanged';
    }
    assessTechnicalDebt(changes, semanticAnalysis) {
        if (semanticAnalysis.changeType === 'refactor')
            return 'reduced';
        const hasDocumentation = changes.some(c => c.file.includes('.md') || c.file.includes('doc'));
        const highComplexity = semanticAnalysis.complexity.cyclomaticComplexity > 20;
        if (hasDocumentation && !highComplexity)
            return 'reduced';
        if (highComplexity)
            return 'increased';
        return 'unchanged';
    }
    assessScalability(changes, semanticAnalysis) {
        const performanceRisks = semanticAnalysis.riskFactors.filter(r => r.type === 'performance');
        if (performanceRisks.length > 0)
            return 'reduced';
        if (semanticAnalysis.changeType === 'refactor')
            return 'improved';
        return 'unchanged';
    }
    // User Impact Assessment Methods
    identifyAffectedUserGroups(changes, semanticAnalysis) {
        const groups = [];
        if (this.isCustomerFacing(changes, semanticAnalysis)) {
            groups.push('end-users');
        }
        const hasApiChanges = semanticAnalysis.codeStructure.exports.length > 0;
        if (hasApiChanges) {
            groups.push('developers', 'integrators');
        }
        const hasAdminFeatures = changes.some(c => c.file.includes('admin') || c.file.includes('dashboard'));
        if (hasAdminFeatures) {
            groups.push('administrators');
        }
        return groups;
    }
    assessUsabilityChange(changes, semanticAnalysis) {
        if (semanticAnalysis.changeType === 'feature')
            return 'improved';
        if (semanticAnalysis.changeType === 'bugfix')
            return 'improved';
        return 'unchanged';
    }
    assessAccessibilityChange(changes, semanticAnalysis) {
        const a11yFiles = changes.filter(c => c.file.includes('accessibility') ||
            c.file.includes('a11y') ||
            c.hunks.some(h => h.lines.some(l => l.content.includes('aria-') || l.content.includes('role='))));
        return a11yFiles.length > 0 ? 'improved' : 'unchanged';
    }
    assessPerformanceChange(changes, semanticAnalysis) {
        const performanceRisks = semanticAnalysis.riskFactors.filter(r => r.type === 'performance');
        return performanceRisks.length > 0 ? 'slower' : 'unchanged';
    }
    assessFeatureAvailability(changes, semanticAnalysis) {
        if (semanticAnalysis.changeType === 'feature')
            return 'increased';
        const removedFunctions = semanticAnalysis.codeStructure.removedFunctions.length;
        return removedFunctions > 0 ? 'decreased' : 'unchanged';
    }
    // Performance Impact Assessment Methods
    assessCpuUsage(changes, semanticAnalysis) {
        const hasLoops = semanticAnalysis.patterns.some(p => p.evidence.some(e => e.includes('for(') || e.includes('while(')));
        const hasOptimization = semanticAnalysis.changeType === 'refactor';
        if (hasOptimization)
            return 'reduced';
        if (hasLoops && semanticAnalysis.complexity.cyclomaticComplexity > 15)
            return 'increased';
        return 'unchanged';
    }
    assessMemoryUsage(changes, semanticAnalysis) {
        const hasNewClasses = semanticAnalysis.codeStructure.addedClasses.length > 0;
        const hasLargeDataStructures = changes.some(c => c.hunks.some(h => h.lines.some(l => l.content.includes('Array(') || l.content.includes('new Map') || l.content.includes('new Set'))));
        if (hasLargeDataStructures || hasNewClasses)
            return 'increased';
        return 'unchanged';
    }
    assessNetworkTraffic(changes, semanticAnalysis) {
        const hasApiCalls = changes.some(c => c.hunks.some(h => h.lines.some(l => l.content.includes('fetch(') || l.content.includes('axios') || l.content.includes('http'))));
        return hasApiCalls ? 'increased' : 'unchanged';
    }
    assessDatabaseLoad(changes, semanticAnalysis) {
        const hasDbQueries = changes.some(c => c.hunks.some(h => h.lines.some(l => l.content.includes('SELECT') ||
            l.content.includes('INSERT') ||
            l.content.includes('query') ||
            l.content.includes('find(') ||
            l.content.includes('findOne('))));
        return hasDbQueries ? 'increased' : 'unchanged';
    }
    assessResponseTime(changes, semanticAnalysis) {
        const performanceRisks = semanticAnalysis.riskFactors.filter(r => r.type === 'performance');
        const isOptimization = semanticAnalysis.changeType === 'refactor';
        if (isOptimization && performanceRisks.length === 0)
            return 'faster';
        if (performanceRisks.length > 0)
            return 'slower';
        return 'unchanged';
    }
    assessThroughput(changes, semanticAnalysis) {
        return this.assessResponseTime(changes, semanticAnalysis) === 'faster' ? 'increased' :
            this.assessResponseTime(changes, semanticAnalysis) === 'slower' ? 'decreased' : 'unchanged';
    }
    // Security Impact Assessment Methods
    hasSecurityFixes(changes, semanticAnalysis) {
        return changes.some(c => c.hunks.some(h => h.lines.some(l => l.content.toLowerCase().includes('security') ||
            l.content.toLowerCase().includes('vulnerability') ||
            l.content.toLowerCase().includes('sanitize') ||
            l.content.toLowerCase().includes('validate'))));
    }
    hasAccessControlChanges(changes, semanticAnalysis) {
        return changes.some(c => c.hunks.some(h => h.lines.some(l => l.content.includes('auth') ||
            l.content.includes('permission') ||
            l.content.includes('role') ||
            l.content.includes('access'))));
    }
    assessDataExposureRisk(changes, semanticAnalysis) {
        const securityRisks = semanticAnalysis.riskFactors.filter(r => r.type === 'security');
        const hasExposureRisk = changes.some(c => c.hunks.some(h => h.lines.some(l => l.content.includes('console.log') ||
            l.content.includes('print(') ||
            l.content.includes('password') ||
            l.content.includes('token'))));
        if (securityRisks.length > 0)
            return 'high';
        if (hasExposureRisk)
            return 'medium';
        return 'none';
    }
    hasAuthenticationChanges(changes, semanticAnalysis) {
        return changes.some(c => c.file.includes('auth') ||
            c.hunks.some(h => h.lines.some(l => l.content.includes('login') ||
                l.content.includes('authenticate') ||
                l.content.includes('jwt') ||
                l.content.includes('session'))));
    }
    hasEncryptionChanges(changes, semanticAnalysis) {
        return changes.some(c => c.hunks.some(h => h.lines.some(l => l.content.includes('encrypt') ||
            l.content.includes('decrypt') ||
            l.content.includes('crypto') ||
            l.content.includes('hash'))));
    }
    // Maintenance Impact Assessment Methods
    assessCodeComplexityChange(changes, semanticAnalysis) {
        if (semanticAnalysis.changeType === 'refactor')
            return 'reduced';
        const complexityIncrease = semanticAnalysis.complexity.cyclomaticComplexity > 15;
        return complexityIncrease ? 'increased' : 'unchanged';
    }
    assessDebuggabilityChange(changes, semanticAnalysis) {
        const hasLogging = changes.some(c => c.hunks.some(h => h.lines.some(l => l.content.includes('console.') ||
            l.content.includes('log') ||
            l.content.includes('debug'))));
        const hasComments = changes.some(c => c.hunks.some(h => h.lines.some(l => l.content.trim().startsWith('//') || l.content.includes('/*'))));
        if (hasLogging || hasComments)
            return 'improved';
        if (semanticAnalysis.complexity.cyclomaticComplexity > 20)
            return 'degraded';
        return 'unchanged';
    }
    assessDocumentationQuality(changes, semanticAnalysis) {
        const docFiles = changes.filter(c => c.file.includes('.md') || c.file.includes('doc'));
        const hasJsDoc = changes.some(c => c.hunks.some(h => h.lines.some(l => l.content.includes('/**') || l.content.includes('@param'))));
        return docFiles.length > 0 || hasJsDoc ? 'improved' : 'unchanged';
    }
    assessKnowledgeDistribution(changes, semanticAnalysis) {
        const hasDocumentation = this.assessDocumentationQuality(changes, semanticAnalysis) === 'improved';
        const highComplexity = semanticAnalysis.complexity.cyclomaticComplexity > 20;
        if (hasDocumentation && !highComplexity)
            return 'improved';
        if (highComplexity && !hasDocumentation)
            return 'concentrated';
        return 'unchanged';
    }
    assessOnboardingComplexity(changes, semanticAnalysis) {
        const hasDocumentation = this.assessDocumentationQuality(changes, semanticAnalysis) === 'improved';
        const addedComplexity = semanticAnalysis.complexity.cyclomaticComplexity > 15;
        if (hasDocumentation)
            return 'reduced';
        if (addedComplexity)
            return 'increased';
        return 'unchanged';
    }
    // Helper methods from basic impact analysis
    identifyAffectedComponents(changes) {
        const components = new Set();
        for (const change of changes) {
            const parts = change.file.split('/');
            if (parts.includes('components')) {
                const componentIndex = parts.indexOf('components');
                if (componentIndex + 1 < parts.length) {
                    components.add(parts[componentIndex + 1]);
                }
            }
            if (parts.includes('services') || parts.includes('modules')) {
                const serviceIndex = Math.max(parts.indexOf('services'), parts.indexOf('modules'));
                if (serviceIndex + 1 < parts.length) {
                    components.add(parts[serviceIndex + 1]);
                }
            }
            if (parts.length > 1) {
                components.add(parts[0]); // Top-level directory
            }
        }
        return Array.from(components);
    }
    identifyPotentialIssues(changes) {
        const issues = [];
        for (const change of changes) {
            if (change.insertions + change.deletions > 200) {
                issues.push(`Large change in ${change.file} might indicate complexity issues`);
            }
            if (change.type === 'deleted') {
                issues.push(`Deletion of ${change.file} might break dependent components`);
            }
            const fileName = change.file.toLowerCase();
            if (fileName.includes('config') || fileName.includes('.env') || fileName.includes('package.json')) {
                issues.push(`Configuration change in ${change.file} might affect runtime behavior`);
            }
        }
        return issues;
    }
    generateTestingRecommendations(changes) {
        const recommendations = [];
        for (const change of changes) {
            const fileName = change.file.toLowerCase();
            if (fileName.includes('component') || fileName.includes('page')) {
                recommendations.push(`Test UI interactions for ${change.file}`);
            }
            if (fileName.includes('api') || fileName.includes('service')) {
                recommendations.push(`Test API endpoints affected by ${change.file}`);
            }
            if (fileName.includes('model') || fileName.includes('schema')) {
                recommendations.push(`Verify data integrity after changes to ${change.file}`);
            }
        }
        if (changes.length > 3) {
            recommendations.push('Run integration tests to verify component interactions');
        }
        return recommendations;
    }
    assessRisk(changes, components, issues) {
        let riskScore = 0;
        const totalChanges = changes.reduce((sum, c) => sum + c.insertions + c.deletions, 0);
        if (totalChanges > 500)
            riskScore += 2;
        else if (totalChanges > 100)
            riskScore += 1;
        if (components.length > 5)
            riskScore += 2;
        else if (components.length > 2)
            riskScore += 1;
        riskScore += Math.min(issues.length, 3);
        const criticalFiles = changes.filter(c => c.file.includes('config') ||
            c.file.includes('package.json') ||
            c.type === 'deleted');
        riskScore += criticalFiles.length;
        if (riskScore >= 5)
            return 'high';
        if (riskScore >= 2)
            return 'medium';
        return 'low';
    }
    assessScope(changes, components) {
        if (changes.some(c => c.file.includes('package.json') ||
            c.file.includes('global') ||
            c.file.includes('app.') ||
            c.file.includes('main.'))) {
            return 'system';
        }
        if (components.length > 1 || changes.length > 3) {
            return 'module';
        }
        return 'local';
    }
}
//# sourceMappingURL=impact-analyzer.js.map