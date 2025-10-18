import React from 'react';
import IssueCard, { type IssueCardProps, type IssueSeverity } from './IssueCard';

/**
 * Props for the PrioritySection component
 */
export interface PrioritySectionProps {
  title: string;
  subtitle: string;
  severity: IssueSeverity;
  issues: IssueCardProps[];
  icon: string;
}

/**
 * PrioritySection - Groups conversion issues by severity level
 *
 * Displays a collection of issues (critical, medium, or low priority)
 * with color-coded styling and a clear hierarchy. Shows an empty state
 * when no issues are found.
 *
 * @example
 * ```tsx
 * <PrioritySection
 *   title="Critical Issues"
 *   subtitle="Fix These First - Highest Impact"
 *   severity="critical"
 *   icon="🔴"
 *   issues={criticalIssues}
 * />
 * ```
 */
export default function PrioritySection({
  title,
  subtitle,
  severity,
  issues,
  icon,
}: PrioritySectionProps) {
  // Color coding based on severity
  const severityConfig = {
    critical: {
      bg: 'bg-red-50',
      border: 'border-l-red-500',
      textColor: 'text-red-700',
      subtitleColor: 'text-red-600',
    },
    medium: {
      bg: 'bg-yellow-50',
      border: 'border-l-yellow-500',
      textColor: 'text-yellow-700',
      subtitleColor: 'text-yellow-600',
    },
    low: {
      bg: 'bg-green-50',
      border: 'border-l-green-500',
      textColor: 'text-green-700',
      subtitleColor: 'text-green-600',
    },
  };

  const config = severityConfig[severity];

  return (
    <section
      className={`rounded-xl border-l-4 ${config.border} ${config.bg} overflow-hidden`}
    >
      {/* Section Header */}
      <div className="px-6 py-5 border-b border-gray-200 bg-white">
        <div className="flex items-start gap-3">
          <span className="text-3xl flex-shrink-0">{icon}</span>
          <div className="flex-1">
            <h2 className={`text-2xl font-bold ${config.textColor} mb-1`}>
              {title}
            </h2>
            <p className={`text-sm font-medium ${config.subtitleColor}`}>
              {subtitle}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${config.textColor} bg-white border-2 ${config.border}`}>
            {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div className="p-6">
        {issues.length > 0 ? (
          <div className="space-y-6">
            {issues.map((issue, index) => (
              <IssueCard
                key={index}
                {...issue}
                severity={severity}
              />
            ))}
          </div>
        ) : (
          // Empty state
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white border-2 border-gray-200 mb-4">
              <span className="text-3xl">✓</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No {severity} issues found
            </h3>
            <p className="text-sm text-gray-600">
              {severity === 'critical'
                ? 'Great! No critical issues detected in this analysis.'
                : severity === 'medium'
                ? 'No medium priority issues found. Keep up the good work!'
                : 'Everything looks good - no low priority issues to address.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
