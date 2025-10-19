import { serve } from 'inngest/next';
import { inngest } from '@/lib/jobs/inngest';
import { processAnalysis } from '@/lib/jobs/functions/analyze';

export const runtime = 'nodejs';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processAnalysis],
});
