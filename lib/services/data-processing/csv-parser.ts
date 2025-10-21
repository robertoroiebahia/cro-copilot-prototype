/**
 * CSV Parser Service
 *
 * Reusable service for parsing CSV files across different research types
 */

export interface CSVRow {
  [key: string]: string;
}

export interface CSVParseResult {
  success: boolean;
  data?: CSVRow[];
  headers?: string[];
  rowCount?: number;
  error?: string;
}

/**
 * Parse CSV text into structured data
 */
export function parseCSV(csvText: string): CSVParseResult {
  try {
    // Split into lines and filter empty ones
    const lines = csvText.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      return {
        success: false,
        error: 'CSV file is empty',
      };
    }

    // Parse headers
    const headers = parseCSVLine(lines[0]!);

    if (headers.length === 0) {
      return {
        success: false,
        error: 'No headers found in CSV',
      };
    }

    // Parse data rows
    const data: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line?.trim()) continue;

      const values = parseCSVLine(line);

      // Create row object
      const row: CSVRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      data.push(row);
    }

    return {
      success: true,
      data,
      headers,
      rowCount: data.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse CSV',
    };
  }
}

/**
 * Parse a single CSV line, handling quotes and commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Handle escaped quotes ("")
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());

  return result;
}

/**
 * Validate CSV structure for specific research type
 */
export function validateCSVForResearchType(
  headers: string[],
  researchType: 'survey_analysis' | 'onsite_poll' | 'review_mining'
): { valid: boolean; error?: string; suggestions?: string[] } {
  const lowerHeaders = headers.map(h => h.toLowerCase());

  switch (researchType) {
    case 'survey_analysis':
      // Survey should have at least a response/answer column
      const hasResponse = lowerHeaders.some(h =>
        h.includes('response') ||
        h.includes('answer') ||
        h.includes('feedback') ||
        h.includes('comment')
      );

      if (!hasResponse) {
        return {
          valid: false,
          error: 'Survey CSV should contain a column with responses/answers/feedback',
          suggestions: [
            'Add a column named "response", "answer", "feedback", or "comment"',
            'Ensure the CSV contains the actual survey responses from users',
          ],
        };
      }
      break;

    case 'onsite_poll':
      // Poll should have question and answer
      const hasQuestion = lowerHeaders.some(h => h.includes('question'));
      const hasAnswer = lowerHeaders.some(h =>
        h.includes('answer') || h.includes('response') || h.includes('choice')
      );

      if (!hasQuestion || !hasAnswer) {
        return {
          valid: false,
          error: 'Poll CSV should contain question and answer columns',
          suggestions: [
            'Add columns named "question" and "answer"',
            'Include the poll question text and user responses',
          ],
        };
      }
      break;

    case 'review_mining':
      // Reviews should have review text/content
      const hasReview = lowerHeaders.some(h =>
        h.includes('review') ||
        h.includes('comment') ||
        h.includes('feedback') ||
        h.includes('text') ||
        h.includes('content')
      );

      if (!hasReview) {
        return {
          valid: false,
          error: 'Review CSV should contain a column with review text/content',
          suggestions: [
            'Add a column named "review", "comment", "feedback", or "text"',
            'Ensure the CSV contains the actual customer review text',
          ],
        };
      }
      break;
  }

  return { valid: true };
}

/**
 * Extract text content from CSV for AI analysis
 * Intelligently combines relevant columns based on research type
 */
export function extractTextForAnalysis(
  data: CSVRow[],
  headers: string[],
  researchType: 'survey_analysis' | 'onsite_poll' | 'review_mining'
): string[] {
  const lowerHeaders = headers.map(h => h.toLowerCase());

  // Find most relevant columns based on research type
  let relevantColumns: string[] = [];

  switch (researchType) {
    case 'survey_analysis':
      relevantColumns = headers.filter((h, i) => {
        const lower = lowerHeaders[i];
        return (
          lower?.includes('response') ||
          lower?.includes('answer') ||
          lower?.includes('feedback') ||
          lower?.includes('comment')
        );
      });
      break;

    case 'onsite_poll':
      relevantColumns = headers.filter((h, i) => {
        const lower = lowerHeaders[i];
        return (
          lower?.includes('question') ||
          lower?.includes('answer') ||
          lower?.includes('response') ||
          lower?.includes('choice')
        );
      });
      break;

    case 'review_mining':
      relevantColumns = headers.filter((h, i) => {
        const lower = lowerHeaders[i];
        return (
          lower?.includes('review') ||
          lower?.includes('comment') ||
          lower?.includes('feedback') ||
          lower?.includes('text') ||
          lower?.includes('content') ||
          lower?.includes('rating')
        );
      });
      break;
  }

  // If no specific columns found, use all non-ID columns
  if (relevantColumns.length === 0) {
    relevantColumns = headers.filter(h => {
      const lower = h.toLowerCase();
      return !lower.includes('id') && !lower.includes('timestamp');
    });
  }

  // Extract text entries
  return data.map(row => {
    const parts = relevantColumns
      .map(col => row[col])
      .filter(val => val && val.trim().length > 0);

    return parts.join(' | ');
  }).filter(text => text.length > 0);
}
