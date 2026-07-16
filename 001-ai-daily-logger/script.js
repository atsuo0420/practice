// カテゴリ名とキーワードの対応（上から順に判定する）
const CATEGORY_RULES = [
  { name: "学んだこと", keywords: ["学んだ", "覚えた", "分かった"] },
  { name: "困ったこと", keywords: ["困った", "エラー", "苦戦"] },
  { name: "次回やること", keywords: ["次回", "明日", "次は"] },
];
const DEFAULT_CATEGORY = "今日やったこと";

// 出力に並べる順番
const CATEGORY_ORDER = [DEFAULT_CATEGORY, "学んだこと", "困ったこと", "次回やること"];

const logDate = document.getElementById("log-date");
const inputText = document.getElementById("input-text");
const outputText = document.getElementById("output-text");
const organizeBtn = document.getElementById("organize-btn");
const copyBtn = document.getElementById("copy-btn");

logDate.value = formatDate(new Date());

organizeBtn.addEventListener("click", () => {
  const sentences = splitIntoSentences(inputText.value);
  const grouped = classifySentences(sentences);
  outputText.value = buildOutput(logDate.value, grouped);
});

copyBtn.addEventListener("click", async () => {
  if (!outputText.value) return;
  await navigator.clipboard.writeText(outputText.value);
  copyBtn.textContent = "コピーしました！";
  copyBtn.classList.add("copied");
  setTimeout(() => {
    copyBtn.textContent = "コピー";
    copyBtn.classList.remove("copied");
  }, 1500);
});

// 改行と句点（。）で文章を1文ずつに分割する
function splitIntoSentences(text) {
  return text
    .split(/\n/)
    .flatMap((line) => line.split("。"))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// 各文をキーワードに応じてカテゴリごとに振り分ける
function classifySentences(sentences) {
  const grouped = {};
  CATEGORY_ORDER.forEach((name) => (grouped[name] = []));

  sentences.forEach((sentence) => {
    const rule = CATEGORY_RULES.find((r) =>
      r.keywords.some((keyword) => sentence.includes(keyword))
    );
    const category = rule ? rule.name : DEFAULT_CATEGORY;
    grouped[category].push(sentence);
  });

  return grouped;
}

// カテゴリごとにNotion貼り付け用のMarkdown風テキストを組み立てる
function buildOutput(date, grouped) {
  const sections = CATEGORY_ORDER.filter((name) => grouped[name].length > 0).map(
    (name) => {
      const items = grouped[name].map((s) => `- ${s}`).join("\n");
      return `## ${name}\n${items}`;
    }
  );
  const heading = date ? `# ${date}` : null;
  return [heading, ...sections].filter(Boolean).join("\n\n");
}

// Dateオブジェクトを input[type="date"] 用の YYYY-MM-DD 形式にする
function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
