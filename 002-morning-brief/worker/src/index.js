const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const endpoint = url.searchParams.get("endpoint");

    if (endpoint === "summarize") {
      return handleSummarize(request, env);
    }

    if (endpoint !== "everything" && endpoint !== "top-headlines") {
      return new Response(JSON.stringify({ error: "invalid endpoint" }), {
        status: 400,
        headers: { "content-type": "application/json", ...CORS_HEADERS },
      });
    }

    const params = new URLSearchParams(url.searchParams);
    params.delete("endpoint");
    params.set("apiKey", env.NEWSAPI_KEY);

    const upstream = await fetch(`https://newsapi.org/v2/${endpoint}?${params.toString()}`, {
      headers: { "User-Agent": "morning-brief-app" },
    });
    const body = await upstream.text();

    return new Response(body, {
      status: upstream.status,
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  },
};

async function handleSummarize(request, env) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), {
      status: 405,
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), {
      status: 400,
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  }

  const articles = Array.isArray(payload.articles) ? payload.articles : [];
  if (articles.length === 0) {
    return new Response(JSON.stringify({ error: "articles required" }), {
      status: 400,
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  }

  const articleText = articles
    .map((article, index) => {
      const title = article.title || "";
      const description = article.description ? ` — ${article.description}` : "";
      return `${index + 1}. ${title}${description}`;
    })
    .join("\n");

  const prompt = `以下は同じジャンルのニュース記事一覧です。通勤中にサッと読めるように、全体の傾向や重要なポイントを3〜4文の自然な日本語で要約してください。箇条書きにせず、文章でまとめてください。\n\n${articleText}`;

  try {
    const result = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [{ role: "user", content: prompt }],
    });

    const summary = result.response || "";

    return new Response(JSON.stringify({ summary }), {
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "summarize failed" }), {
      status: 500,
      headers: { "content-type": "application/json", ...CORS_HEADERS },
    });
  }
}
