const WORKER_BASE_URL = "https://morning-brief-news-proxy.socceratsuo.workers.dev";

const CATEGORIES = [
  {
    id: "soccer",
    emoji: "⚽",
    title: "サッカー",
    endpoint: "everything",
    params: { q: "サッカー", sortBy: "publishedAt" },
  },
  {
    id: "basketball",
    emoji: "🏀",
    title: "バスケ",
    endpoint: "everything",
    params: { q: "バスケットボール OR NBA OR Bリーグ", sortBy: "publishedAt" },
  },
  {
    id: "ai",
    emoji: "🤖",
    title: "AI",
    endpoint: "everything",
    params: { q: "AI OR 人工知能", sortBy: "publishedAt" },
  },
  {
    id: "economy",
    emoji: "💹",
    title: "日本の経済",
    endpoint: "everything",
    params: { q: "日本経済 OR 日銀 OR 円相場", sortBy: "publishedAt" },
  },
  {
    id: "politics",
    emoji: "🏛️",
    title: "日本の政治",
    endpoint: "everything",
    params: { q: "政治 OR 国会 OR 内閣", sortBy: "publishedAt" },
  },
  {
    id: "world",
    emoji: "🌍",
    title: "世界のトレンド",
    endpoint: "top-headlines",
    params: { country: "us", category: "general" },
  },
];

const refreshBtn = document.getElementById("refresh-btn");
const feed = document.getElementById("feed");

function buildUrl(category) {
  const url = new URL(WORKER_BASE_URL);
  url.searchParams.set("endpoint", category.endpoint);
  const params = { ...category.params, pageSize: "5" };
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

function formatPublishedAt(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createCategorySection(category) {
  const section = document.createElement("section");
  section.className = "category";
  section.id = `category-${category.id}`;

  const title = document.createElement("h2");
  title.className = "category-title";
  title.textContent = `${category.emoji} ${category.title}`;
  section.appendChild(title);

  const summary = document.createElement("p");
  summary.className = "category-summary";
  summary.hidden = true;
  section.appendChild(summary);

  const status = document.createElement("p");
  status.className = "category-status";
  status.textContent = "読み込み中...";
  section.appendChild(status);

  const list = document.createElement("ul");
  list.className = "article-list";
  list.hidden = true;
  section.appendChild(list);

  return { section, summary, status, list };
}

async function translateToJapanese(text) {
  if (!text) return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ja&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) return text;
    const data = await response.json();
    return data[0].map((segment) => segment[0]).join("");
  } catch (error) {
    return text;
  }
}

function renderArticles(list, articles) {
  list.innerHTML = "";
  articles.forEach((article) => {
    const item = document.createElement("li");
    item.className = "article";

    const originalTitle = article.title || "(タイトルなし)";

    const link = document.createElement("a");
    link.href = article.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = originalTitle;
    item.appendChild(link);

    const originalMeta = document.createElement("p");
    originalMeta.className = "article-original-title";
    originalMeta.hidden = true;
    item.appendChild(originalMeta);

    const meta = document.createElement("p");
    meta.className = "article-meta";
    const sourceName = article.source && article.source.name ? article.source.name : "不明な情報源";
    meta.textContent = `${sourceName} ・ ${formatPublishedAt(article.publishedAt)}`;
    item.appendChild(meta);

    list.appendChild(item);

    translateToJapanese(originalTitle).then((translated) => {
      if (translated && translated.trim() && translated.trim() !== originalTitle.trim()) {
        link.textContent = translated;
        originalMeta.textContent = originalTitle;
        originalMeta.hidden = false;
      }
    });
  });
}

async function summarizeCategory(articles, summaryEl) {
  summaryEl.hidden = false;
  summaryEl.classList.remove("error");
  summaryEl.textContent = "📝 要約を作成中...";

  try {
    const url = new URL(WORKER_BASE_URL);
    url.searchParams.set("endpoint", "summarize");

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        articles: articles.map((article) => ({
          title: article.title,
          description: article.description,
        })),
      }),
    });
    const data = await response.json();

    if (!response.ok || !data.summary) {
      summaryEl.hidden = true;
      return;
    }

    summaryEl.textContent = `📝 ${data.summary}`;
  } catch (error) {
    summaryEl.hidden = true;
  }
}

async function loadCategory(category, refs) {
  const { summary, status, list } = refs;
  status.hidden = false;
  status.classList.remove("error");
  status.textContent = "読み込み中...";
  list.hidden = true;
  summary.hidden = true;

  try {
    const response = await fetch(buildUrl(category));
    const data = await response.json();

    if (!response.ok || data.status !== "ok") {
      throw new Error(data.message || `HTTPエラー: ${response.status}`);
    }

    if (!data.articles || data.articles.length === 0) {
      status.textContent = "記事が見つかりませんでした";
      return;
    }

    renderArticles(list, data.articles);
    status.hidden = true;
    list.hidden = false;
    summarizeCategory(data.articles, summary);
  } catch (error) {
    status.classList.add("error");
    status.textContent = `取得失敗: ${error.message}`;
  }
}

function fetchAll() {
  refreshBtn.disabled = true;
  const loads = CATEGORIES.map((category) => {
    const refs = categoryRefs[category.id];
    return loadCategory(category, refs);
  });

  Promise.allSettled(loads).finally(() => {
    refreshBtn.disabled = false;
  });
}

const categoryRefs = {};

function buildFeed() {
  feed.innerHTML = "";
  CATEGORIES.forEach((category) => {
    const refs = createCategorySection(category);
    categoryRefs[category.id] = refs;
    feed.appendChild(refs.section);
  });
}

refreshBtn.addEventListener("click", () => {
  fetchAll();
});

buildFeed();
fetchAll();
