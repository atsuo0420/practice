const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const endpoint = url.searchParams.get("endpoint");

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
