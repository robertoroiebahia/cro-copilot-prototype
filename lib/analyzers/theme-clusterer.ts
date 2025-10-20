/**
 * Theme Clusterer
 * Groups related insights into coherent themes
 */

import { BaseModule } from '../modules/base';
import { ModuleConfig } from '../types/modules';
import { ThemeClustererInput, ThemeClustererOutput } from './types';
import { Theme, PatternType } from '../types/insights-advanced';
import { AtomicInsight, InsightCategory } from '../types/insights';

/**
 * Theme Clusterer Module
 */
export class ThemeClusterer extends BaseModule<ThemeClustererInput, ThemeClustererOutput> {
  constructor() {
    const config: ModuleConfig = {
      name: 'theme-clusterer',
      version: '1.0.0',
      enabled: true,
      priority: 20,
      dependencies: ['insight-extractor-v2'],
    };

    super(config);
  }

  async validate(input: ThemeClustererInput): Promise<boolean> {
    return !!(
      input.analysisId &&
      input.userId &&
      input.insights &&
      input.insights.length > 0
    );
  }

  protected async run(input: ThemeClustererInput): Promise<ThemeClustererOutput> {
    this.logger.info('Clustering insights into themes', {
      insightCount: input.insights.length,
    });

    // Simple category-based clustering for now
    // In production, you'd use semantic similarity, clustering algorithms, etc.
    const themes = this.clusterByCategory(input);

    this.logger.info('Themes created', {
      themeCount: themes.length,
    });

    return {
      themes,
    };
  }

  /**
   * Cluster insights by category (simple approach)
   */
  private clusterByCategory(input: ThemeClustererInput): Theme[] {
    const categoryGroups: Map<InsightCategory, AtomicInsight[]> = new Map();

    // Group insights by category
    input.insights.forEach((insight) => {
      if (!categoryGroups.has(insight.category)) {
        categoryGroups.set(insight.category, []);
      }
      categoryGroups.get(insight.category)!.push(insight);
    });

    // Create themes from groups
    const themes: Theme[] = [];
    let themeIndex = 1;

    categoryGroups.forEach((insights, category) => {
      if (insights.length >= (input.options?.minClusterSize || 2)) {
        const theme: Theme = {
          analysisId: input.analysisId,
          userId: input.userId,
          name: `${this.categoryToName(category)} Theme ${themeIndex}`,
          description: this.generateThemeDescription(insights, category),
          insightIds: insights.map((i) => i.id || ''),
          insights,
          patternType: this.determinePatternType(insights),
          priority: this.calculatePriority(insights),
          businessImpact: this.generateBusinessImpact(insights),
          metadata: {
            category,
            insightCount: insights.length,
            avgConfidence:
              insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length,
            avgImpact:
              insights.reduce((sum, i) => sum + i.impactScore, 0) / insights.length,
          },
        };

        themes.push(theme);
        themeIndex++;
      }
    });

    // Sort by priority
    return themes.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Convert category enum to readable name
   */
  private categoryToName(category: InsightCategory): string {
    const names: Record<InsightCategory, string> = {
      [InsightCategory.UX]: 'User Experience',
      [InsightCategory.MESSAGING]: 'Messaging',
      [InsightCategory.TRUST]: 'Trust & Credibility',
      [InsightCategory.URGENCY]: 'Urgency & Scarcity',
      [InsightCategory.VALUE_PROP]: 'Value Proposition',
      [InsightCategory.FRICTION]: 'Friction Points',
      [InsightCategory.CONVERSION]: 'Conversion',
      [InsightCategory.ENGAGEMENT]: 'Engagement',
    };

    return names[category] || category;
  }

  /**
   * Generate theme description
   */
  private generateThemeDescription(insights: AtomicInsight[], category: InsightCategory): string {
    const problemCount = insights.filter((i) => i.type === 'problem').length;
    const opportunityCount = insights.filter((i) => i.type === 'opportunity').length;

    return `${insights.length} ${this.categoryToName(category).toLowerCase()} insights identified (${problemCount} problems, ${opportunityCount} opportunities)`;
  }

  /**
   * Determine pattern type
   */
  private determinePatternType(insights: AtomicInsight[]): PatternType {
    // Simple heuristic - can be enhanced with ML
    const sections = new Set(insights.map((i) => i.location.section));

    if (sections.size === 1) {
      return PatternType.RECURRING;
    } else if (sections.size > 3) {
      return PatternType.SYSTEMIC;
    } else {
      return PatternType.BEHAVIORAL;
    }
  }

  /**
   * Calculate theme priority
   */
  private calculatePriority(insights: AtomicInsight[]): number {
    const avgImpact =
      insights.reduce((sum, i) => sum + i.impactScore, 0) / insights.length;
    const avgConfidence =
      insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;
    const count = insights.length;

    // Priority = (impact * confidence * count) / 100
    return Math.round((avgImpact * avgConfidence * Math.min(count, 10)) / 10000);
  }

  /**
   * Generate business impact statement
   */
  private generateBusinessImpact(insights: AtomicInsight[]): string {
    const highSeverity = insights.filter((i) => i.severity === 'high' || i.severity === 'critical')
      .length;

    if (highSeverity > 0) {
      return `High priority area with ${highSeverity} critical issues affecting conversion`;
    }

    return `Moderate impact area with ${insights.length} improvement opportunities`;
  }
}

/**
 * Create theme clusterer
 */
export function createThemeClusterer(): ThemeClusterer {
  return new ThemeClusterer();
}
