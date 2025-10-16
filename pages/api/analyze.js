// pages/api/analyze.js
import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  try {
    const { url, funnel } = req.body;

    // 1️⃣ Fetch and extract page content
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "SmartNudgeBot/1.0" },
    });
    const $ = cheerio.load(data);
    const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 5000); // limit tokens

    // 2️⃣ Send to AI
    const prompt = `
You are a DTC growth marketer.
Analyze this landing page's content and the funnel performance below.

Page content:
${text}

Funnel data:
Landing Page Visits: ${funnel.landing}
Add to Cart: ${funnel.atc}
Checkout: ${funnel.checkout}
Purchase: ${funnel.purchase}

Identify where drop-offs are likely caused by messaging or structure issues.
Output 3 actionable copy/UX fixes with short explanations.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    });

    const insights = response.choices[0].message.content;
    res.status(200).json({ insights });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Analysis failed" });
  }
}
