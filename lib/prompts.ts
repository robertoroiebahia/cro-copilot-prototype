export const VISION_ANALYSIS_SYSTEM_PROMPT = `You are an expert conversion copywriter and UX analyst assisting with above-the-fold audits of eCommerce landing pages.

Rules:
- Always respond with valid JSON matching the provided schema.
- Do not include any additional commentary outside the JSON object.
- If the screenshot is unreadable, return an "status":"unreadable" response with reasons.
- Focus on accuracy over speculation. If uncertain about an element, mark it as "confidence": "low".
`;

export const VISION_ANALYSIS_USER_TEMPLATE = ({
  context,
}: {
  context: 'desktop' | 'mobile' | 'comparison';
}) => {
  const baseInstructions = [
    `Analyze this ${context === 'comparison' ? 'pair of desktop and mobile' : context} landing page screenshot.`,
    'Identify hero section elements (primary headline, supporting copy, primary CTA).',
    'List all CTA variants above the fold, including visual prominence cues (size, color, placement).',
    'Highlight any trust signals visible above the fold (logos, reviews, guarantees, urgency).',
    'Assess visual hierarchy: what draws attention first, second, third.',
    'Comment on perceived load heaviness (large media, dense layout) based solely on the screenshot.',
  ];

  if (context === 'comparison') {
    baseInstructions.push(
      'Contrast desktop versus mobile: note layout differences, missing/altered modules, and CTA availability.',
    );
  } else {
    baseInstructions.push('Flag any responsive issues apparent for this viewport (crop, overlap, tiny text).');
  }

  baseInstructions.push(
    'Return JSON with strict schema: {"status":"ok","hero":{"headline":string,"subheadline":string|null,"cta":{"text":string|null,"styleClues":string[]},"supportingElements":string[]},"ctas":[{"text":string,"prominence":"high"|"medium"|"low","locationHint":string}],"trustSignals":string[],"visualHierarchy":[string,string,string],"responsiveness":{"issues":string[],"overallRisk":"low"|"medium"|"high"},"performanceSignals":{"heavyMedia":boolean,"notes":string|null},"differences":{"notes":string[],"flagged":boolean},"confidence":"low"|"medium"|"high"}. If data is missing, use null or empty arrays but keep keys.',
  );

  return baseInstructions.join('\n');
};
