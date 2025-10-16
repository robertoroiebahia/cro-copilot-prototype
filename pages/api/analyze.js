import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzePage(url) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(data);

    return {
      h1: $("h1").first().text().trim() || "Not found",
      headlines: $("h2, h3")
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(h => h.length > 0)
        .slice(0, 5),
      ctas: $("button, a.btn, [class*='button'], [class*='cta']")
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(cta => cta.length > 0 && cta.length < 50)
        .slice(0, 10),
      formFields: $("input, select, textarea").length,
      hasReviews: $("[class*='review'], [class*='rating'], [class*='stars']").length > 0,
      hasTrustBadges: $("[class*='trust'], [class*='secure'], [class*='guarantee'], [class*='badge']").length > 0,
      hasUrgency: /(limited|hurry|now|today|sale|ending|last chance)/i.test($.text()),
      hasSocialProof: /(customer|bought|purchased|rated|verified)/i.test($.text()),
      textContent: $("body").text().replace(/\s+/g, " ").trim().slice(0, 3000),
      meta: {
        title: $("title").text(),
        description: $('meta[name="description"]').attr("content") || "",
      },
    };
  } catch (error) {
    console.error("Page analysis error:", error.message);
    throw new Error("Failed to fetch page content");
  }
}

function analyzeFunnel(funnel) {
  const stages = ["landing", "pdp", "atc", "checkout", "purchase"];
  const stageNames = ["Landing", "Product Page", "Add to Cart", "Checkout", "Purchase"];
  const dropOffs = [];

  for (let i = 0; i < stages.length - 1; i++) {
    const current = Number(funnel[stages[i]]);
    const next = Number(funnel[stages[i + 1]]);

    if (current > 0) {
      const dropOffRate = ((current - next) / current * 100).toFixed(1);
      dropOffs.push({
        from: stageNames[i],
        to: stageNames[i + 1],
        rate: dropOffRate,
        severity: Number(dropOffRate) > 70 ? "critical" : Number(dropOffRate) > 50 ? "high" : "medium",
      });
    }
  }

  return dropOffs;
}

export default async function handler(req, res) {
  try {
    const { url, funnel, context } = req.body;

    // Validate inputs
    if (!url || !url.startsWith("http")) {
      return res.status(400).json({ error: "Invalid URL" });
    }

    // Analyze page content
    const pageData = await analyzePage(url);

    // Analyze funnel
    const dropOffs = analyzeFunnel(funnel);
    const worstStage = dropOffs.reduce((prev, current) =>
      Number(current.rate) > Number(prev.rate) ? current : prev
    );

    // Build enhanced prompt
    const prompt = `You are an expert DTC conversion rate optimizer analyzing a funnel for an e-commerce brand.

PAGE ANALYSIS:
- H1 Headline: "${pageData.h1}"
- Key headlines found: ${pageData.headlines.join(", ") || "None"}
- CTAs found: ${pageData.ctas.slice(0, 5).join(", ") || "None"}
- Form fields count: ${pageData.formFields}
- Has customer reviews: ${pageData.hasReviews ? "Yes" : "No"}
- Has trust badges: ${pageData.hasTrustBadges ? "Yes" : "No"}
- Has urgency messaging: ${pageData.hasUrgency ? "Yes" : "No"}
- Has social proof: ${pageData.hasSocialProof ? "Yes" : "No"}

FUNNEL DROP-OFFS:
${dropOffs.map(d => `${d.from} → ${d.to}: ${d.rate}% drop-off (${d.severity} severity)`).join("\n")}

BIGGEST LEAK: ${worstStage.from} → ${worstStage.to} (${worstStage.rate}% drop-off)

CONTEXT:
- Primary traffic source: ${context.trafficSource}
${context.aov ? `- Average Order Value: $${context.aov}` : ""}

Based on this analysis, provide:

1. **Root Cause** - Why is the worst funnel stage bleeding users? Consider missing trust signals, unclear value prop, friction points, mobile UX issues, or pricing concerns.

2. **3 Prioritized Fixes** - For each recommendation provide:
   - Priority level (High/Medium/Low based on impact vs effort)
   - Specific, actionable title
   - Detailed description of what to change
   - CRO principle explaining why it works
   - Expected conversion lift estimate (e.g., "8-12%")
   - Before/after copy example (if relevant)
   - Implementation difficulty (Easy/Medium/Hard)
   - Which funnel stage it targets

3. **Quick Wins** - 2 things they can test this week with minimal dev work

Return response as valid JSON in this exact format:
{
  "rootCause": "string explaining the core issue",
  "recommendations": [
    {
      "priority": "High",
      "title": "Specific recommendation title",
      "description": "Detailed explanation of what to do",
      "principle": "CRO principle or psychological trigger",
      "expectedLift": "8-12%",
      "before": "optional old copy",
      "after": "optional improved copy",
      "difficulty": "Easy",
      "stage": "atc"
    }
  ],
  "quickWins": ["Quick win 1", "Quick win 2"]
}`;

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const insights = JSON.parse(response.choices[0].message.content || "{}");

    // Return enriched response
    res.status(200).json({
      ...insights,
      pageData: {
        h1: pageData.h1,
        hasReviews: pageData.hasReviews,
        hasTrustBadges: pageData.hasTrustBadges,
      },
      funnelAnalysis: dropOffs,
    });
  } catch (err) {
    console.error("Analysis error:", err);
    res.status(500).json({ error: err.message || "Analysis failed" });
  }
}