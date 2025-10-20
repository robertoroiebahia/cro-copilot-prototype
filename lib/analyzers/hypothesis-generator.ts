/**
 * Hypothesis Generator
 * Generates testable hypotheses from themes
 */

import { BaseModule } from '../modules/base';
import { ModuleConfig } from '../types/modules';
import { HypothesisGeneratorInput, HypothesisGeneratorOutput } from './types';
import { Hypothesis, HypothesisStatus } from '../types/insights-advanced';

/**
 * Hypothesis Generator Module
 */
export class HypothesisGenerator extends BaseModule<
  HypothesisGeneratorInput,
  HypothesisGeneratorOutput
> {
  constructor() {
    const config: ModuleConfig = {
      name: 'hypothesis-generator',
      version: '1.0.0',
      enabled: true,
      priority: 30,
      dependencies: ['theme-clusterer'],
    };

    super(config);
  }

  async validate(input: HypothesisGeneratorInput): Promise<boolean> {
    return !!(input.analysisId && input.userId && input.theme);
  }

  protected async run(input: HypothesisGeneratorInput): Promise<HypothesisGeneratorOutput> {
    this.logger.info('Generating hypotheses', {
      themeId: input.theme.id,
      themeName: input.theme.name,
    });

    const hypotheses = this.generateFromTheme(input);

    this.logger.info('Hypotheses generated', {
      count: hypotheses.length,
    });

    return {
      hypotheses,
    };
  }

  /**
   * Generate hypotheses from theme
   */
  private generateFromTheme(input: HypothesisGeneratorInput): Hypothesis[] {
    const hypotheses: Hypothesis[] = [];
    const insights = input.insights || input.theme.insights || [];

    // Generate problem-solution hypotheses
    const problems = insights.filter((i) => i.type === 'problem');
    problems.forEach((problem) => {
      const hypothesis = this.createHypothesis(input, problem.title, problem.description);
      if (hypothesis) {
        hypotheses.push(hypothesis);
      }
    });

    // Limit to max hypotheses
    const maxHypotheses = input.options?.maxHypotheses || 3;
    return hypotheses.slice(0, maxHypotheses);
  }

  /**
   * Create a hypothesis
   */
  private createHypothesis(
    input: HypothesisGeneratorInput,
    problemTitle: string,
    problemDesc: string
  ): Hypothesis {
    // Simple template-based hypothesis generation
    // In production, use LLM for more sophisticated generation

    const hypothesis: Hypothesis = {
      themeId: input.theme.id || '',
      analysisId: input.analysisId,
      userId: input.userId,
      hypothesis: `If we ${this.generateChange(problemTitle)}, then ${this.generateMetric()} will ${this.generateImprovement()} because ${this.generateReason(problemDesc)}`,
      rationale: problemDesc,
      expectedOutcome: this.generateOutcome(),
      successMetrics: [
        {
          name: 'Conversion Rate',
          baseline: 2.5,
          target: 3.0,
          unit: '%',
          priority: 'primary',
        },
        {
          name: 'Bounce Rate',
          baseline: 45,
          target: 35,
          unit: '%',
          priority: 'secondary',
        },
      ],
      status: HypothesisStatus.DRAFT,
      confidenceLevel: 70,
      metadata: {
        framework: 'LIFT',
        reach: 1000,
        estimatedLift: 20,
      },
    };

    return hypothesis;
  }

  /**
   * Generate change statement
   */
  private generateChange(title: string): string {
    // Extract action from title
    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes('form')) {
      return 'simplify the form';
    } else if (lowerTitle.includes('button')) {
      return 'improve the CTA button';
    } else if (lowerTitle.includes('trust')) {
      return 'add trust signals';
    } else if (lowerTitle.includes('value')) {
      return 'clarify the value proposition';
    } else {
      return 'address this issue';
    }
  }

  /**
   * Generate metric name
   */
  private generateMetric(): string {
    return 'conversion rate';
  }

  /**
   * Generate improvement
   */
  private generateImprovement(): string {
    return 'increase by 15-20%';
  }

  /**
   * Generate reason
   */
  private generateReason(description: string): string {
    // Extract key reason from description
    return 'this reduces friction and builds trust';
  }

  /**
   * Generate expected outcome
   */
  private generateOutcome(): string {
    return 'Improved user experience leading to higher conversion rates and lower abandonment';
  }
}

/**
 * Create hypothesis generator
 */
export function createHypothesisGenerator(): HypothesisGenerator {
  return new HypothesisGenerator();
}
