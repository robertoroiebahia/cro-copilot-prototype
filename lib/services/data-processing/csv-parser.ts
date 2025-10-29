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
 *
 * NEW APPROACH: AI-powered flexible validation
 * We no longer require specific column names - the AI will figure it out
 */
export function validateCSVForResearchType(
  headers: string[],
  researchType: 'survey_analysis' | 'onsite_poll' | 'review_mining'
): { valid: boolean; error?: string; suggestions?: string[] } {
  // Basic validation - just ensure we have headers and at least some text columns
  if (headers.length === 0) {
    return {
      valid: false,
      error: 'CSV must have column headers',
      suggestions: ['Ensure the first row contains column names'],
    };
  }

  // Check if there's at least one column that likely contains text (not just IDs or numbers)
  const hasTextColumn = headers.some(h => {
    const lower = h.toLowerCase();
    // Allow anything except obvious ID/numeric columns
    return !lower.match(/^(id|#|index|num|count|total)$/);
  });

  if (!hasTextColumn) {
    return {
      valid: false,
      error: 'CSV appears to contain only ID or numeric columns',
      suggestions: [
        'Ensure your CSV contains text data (responses, feedback, reviews, etc.)',
        'The AI needs text content to analyze',
      ],
    };
  }

  // That's it! Let the AI figure out the rest
  return { valid: true };
}

/**
 * Extract text content from CSV for AI analysis
 *
 * NEW APPROACH: AI-powered intelligent extraction
 * Instead of filtering specific columns, we send the FULL row structure
 * to the AI, which will intelligently determine what's important
 */
export function extractTextForAnalysis(
  data: CSVRow[],
  headers: string[],
  researchType: 'survey_analysis' | 'onsite_poll' | 'review_mining'
): string[] {
  // Sample up to first 100 rows for analysis (prevent token overflow)
  const sampleData = data.slice(0, 100);

  // Format each row as "Column: Value" pairs
  return sampleData.map(row => {
    const parts = headers
      .map(header => {
        const value = row[header];
        // Skip empty values
        if (!value || value.trim().length === 0) return null;

        // Format as "Column: Value" for AI context
        return `${header}: ${value}`;
      })
      .filter(Boolean);

    return parts.join(' | ');
  }).filter(text => text.length > 0);
}
