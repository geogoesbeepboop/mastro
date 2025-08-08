import type { GitChange, ImpactAnalysis } from '../types/index.js';
import type { SemanticAnalysis } from './semantic-analyzer.js';
export interface EnhancedImpactAnalysis extends ImpactAnalysis {
    businessImpact: BusinessImpact;
    technicalImpact: TechnicalImpact;
    userImpact: UserImpact;
    performanceImpact: PerformanceImpact;
    securityImpact: SecurityImpact;
    maintenanceImpact: MaintenanceImpact;
}
export interface BusinessImpact {
    customerFacing: boolean;
    revenueImpact: 'none' | 'low' | 'medium' | 'high';
    userExperienceChange: 'improved' | 'unchanged' | 'degraded';
    timeToMarket: 'accelerated' | 'neutral' | 'delayed';
    competitiveAdvantage: 'increased' | 'maintained' | 'reduced';
}
export interface TechnicalImpact {
    architectureChange: 'none' | 'minor' | 'major' | 'breaking';
    codeQuality: 'improved' | 'unchanged' | 'degraded';
    testCoverage: 'increased' | 'unchanged' | 'decreased';
    technicalDebt: 'reduced' | 'unchanged' | 'increased';
    scalability: 'improved' | 'unchanged' | 'reduced';
}
export interface UserImpact {
    affectedUserGroups: string[];
    usabilityChange: 'improved' | 'unchanged' | 'degraded';
    accessibilityChange: 'improved' | 'unchanged' | 'degraded';
    performanceChange: 'faster' | 'unchanged' | 'slower';
    featureAvailability: 'increased' | 'unchanged' | 'decreased';
}
export interface PerformanceImpact {
    cpuUsage: 'reduced' | 'unchanged' | 'increased';
    memoryUsage: 'reduced' | 'unchanged' | 'increased';
    networkTraffic: 'reduced' | 'unchanged' | 'increased';
    databaseLoad: 'reduced' | 'unchanged' | 'increased';
    responseTime: 'faster' | 'unchanged' | 'slower';
    throughput: 'increased' | 'unchanged' | 'decreased';
}
export interface SecurityImpact {
    vulnerabilityIntroduction: boolean;
    vulnerabilityResolution: boolean;
    accessControlChange: boolean;
    dataExposureRisk: 'none' | 'low' | 'medium' | 'high';
    authenticationChange: boolean;
    encryptionChange: boolean;
}
export interface MaintenanceImpact {
    codeComplexity: 'reduced' | 'unchanged' | 'increased';
    debuggability: 'improved' | 'unchanged' | 'degraded';
    documentationQuality: 'improved' | 'unchanged' | 'degraded';
    teamKnowledgeDistribution: 'improved' | 'unchanged' | 'concentrated';
    onboardingComplexity: 'reduced' | 'unchanged' | 'increased';
}
export declare class ImpactAnalyzer {
    analyzeImpact(changes: GitChange[], semanticAnalysis: SemanticAnalysis): Promise<EnhancedImpactAnalysis>;
    private analyzeBasicImpact;
    private analyzeBusinessImpact;
    private analyzeTechnicalImpact;
    private analyzeUserImpact;
    private analyzePerformanceImpact;
    private analyzeSecurityImpact;
    private analyzeMaintenanceImpact;
    private isCustomerFacing;
    private assessRevenueImpact;
    private assessUserExperienceChange;
    private assessTimeToMarket;
    private assessCompetitiveAdvantage;
    private assessArchitectureChange;
    private assessCodeQuality;
    private assessTestCoverage;
    private assessTechnicalDebt;
    private assessScalability;
    private identifyAffectedUserGroups;
    private assessUsabilityChange;
    private assessAccessibilityChange;
    private assessPerformanceChange;
    private assessFeatureAvailability;
    private assessCpuUsage;
    private assessMemoryUsage;
    private assessNetworkTraffic;
    private assessDatabaseLoad;
    private assessResponseTime;
    private assessThroughput;
    private hasSecurityFixes;
    private hasAccessControlChanges;
    private assessDataExposureRisk;
    private hasAuthenticationChanges;
    private hasEncryptionChanges;
    private assessCodeComplexityChange;
    private assessDebuggabilityChange;
    private assessDocumentationQuality;
    private assessKnowledgeDistribution;
    private assessOnboardingComplexity;
    private identifyAffectedComponents;
    private identifyPotentialIssues;
    private generateTestingRecommendations;
    private assessRisk;
    private assessScope;
}
//# sourceMappingURL=impact-analyzer.d.ts.map