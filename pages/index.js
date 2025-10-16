import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [funnel, setFunnel] = useState({ landing: "", atc: "", checkout: "", purchase: "" });
  const [insights, setInsights] = useState("");
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, funnel }),
    });
    const data = await res.json();
    setInsights(data.insights);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow">
        <h1 className="text-2xl font-bold mb-4">Smart Nudge Builder 🧠</h1>

        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste landing page URL"
          className="border p-2 w-full mb-4 rounded"
        />

        {["landing", "atc", "checkout", "purchase"].map((key) => (
          <input
            key={key}
            type="number"
            placeholder={`${key.toUpperCase()} count`}
            value={funnel[key]}
            onChange={(e) => setFunnel({ ...funnel, [key]: e.target.value })}
            className="border p-2 w-full mb-2 rounded"
          />
        ))}

        <button
          onClick={analyze}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded mt-4"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>

        {insights && (
          <div className="mt-6 bg-gray-100 p-4 rounded">
            <h2 className="font-semibold mb-2">AI Insights:</h2>
            <pre className="whitespace-pre-wrap">{insights}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
