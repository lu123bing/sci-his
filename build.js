const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// Paths
const DOCS_DIR = path.join(__dirname, 'docs');
const SRC_DIR = path.join(__dirname, 'src');
const TEMPLATE_PATH = path.join(SRC_DIR, 'template.html');

// Create docs dir if not exists
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}
if (!fs.existsSync(path.join(DOCS_DIR, 'assets'))) {
  fs.mkdirSync(path.join(DOCS_DIR, 'assets'), { recursive: true });
}

// Copy assets
fs.copyFileSync(path.join(SRC_DIR, 'assets', 'style.css'), path.join(DOCS_DIR, 'assets', 'style.css'));
fs.copyFileSync(path.join(SRC_DIR, 'assets', 'main.js'), path.join(DOCS_DIR, 'assets', 'main.js'));

const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

const filesToProcess = [
  { name: '科学与文明史概论复习笔记', file: '科学与文明史概论复习笔记.md', shortName: '📖 知识点复习' },
  { name: '课堂小测整理扩展版', file: '科学与文明史概论_课堂小测整理扩展版.md', shortName: '📝 小测与扩展' }
];

let navigationHtml = '';
let searchIndex = [];
const pages = [];

const emojiMap = {
  '科学与文明史概论复习笔记': '📖',
  '总纲': '📌',
  '第01讲 为什么要学历史？如何是科学史与文明史？': '⏳🧠',
  '第02讲 史前技术与希腊思想': '🔥🏺',
  '第03讲 希腊与希腊化：科学的起点': '🏛️🦉',
  '第04讲 从希腊到罗马': '⚔️🛡️',
  '第05讲 文明的三个前提：大交汇的世界格局': '🌍🧭',
  '第06讲 中国古代科学与李约瑟问题': '🐉📜',
  '第07讲 从文艺复兴到科学革命': '🎨🔭',
  '第08讲 从伽利略到牛顿：大自然的数学化': '🍎📐',
  '第09讲 工业革命与工业文明': '🚂🏭',
  '第10讲 化学、化工、化肥、土壤、食物（一）': '🧪🌾',
  '第11讲 化学、化工、化肥、土壤、食物（二）': '🥖🧬',
  '人物速背表': '👤',
  '时间线速背': '⏳',
  '简答题模板': '📝',
  '最后冲刺：十个必背判断': '🎯',
  '《科学与文明史概论》课堂小测题整理与期末复习扩展版': '📋',
  '一、总复习框架': '🗂️',
  '3_03：为什么学历史、人文社科要求与价值观': '🏛️💡',
  '3_17：史前文明、希腊思想与希腊化科学': '🏺✨',
  '4_07：中国古代科学、李约瑟问题与技术文明': '🐉⚙️',
  '4_21：科学革命、伽利略、牛顿与机械自然观': '🔭⚙️',
  '最后一次：科学主义、化学、农业、环境伦理': '🧪🌱'
};

for (const sourceFile of filesToProcess) {
  const content = fs.readFileSync(path.join(__dirname, sourceFile.file), 'utf-8');
  
  const sections = content.split(/\n(?=## )/);
  
  // Neat nav category name
  navigationHtml += `<div class="nav-category">${sourceFile.shortName}</div>`;
  
  sections.forEach((section, index) => {
    let title = '前言/导言';
    const match = section.match(/^#+\s+(.*)/);
    if (match) {
      title = match[1].trim();
    }
    
    const safeTitle = title.replace(/[\/\\:*?"<>|]/g, '').replace(/\s+/g, '_');
    const filename = `${sourceFile.name}_${index}_${safeTitle}.html`;
    const url = filename;
    
    // Tweak to look neater (e.g. bolded numbers if available)
    const neatTitle = title.replace(/^(第\d+讲|\d+\_\d+)/, '<strong>$1</strong>');
    navigationHtml += `<li><a href="${url}">${neatTitle}</a></li>`;
    
    // Parse markdown into HTML
    const rawHtmlContent = marked.parse(section);

    // Split by <h3> tags
    const parts = rawHtmlContent.split(/(<h3[^>]*>[\s\S]*?<\/h3>)/gi);
    
    let masonryHtml = '<div class="masonry-grid">';
    
    const grids = [];
    // First part: intro / before first <h3>
    let introText = "";
    if (parts[0] && parts[0].trim().length > 0) {
      let introHtml = parts[0];
      const emoji = emojiMap[title] || '';
      if (emoji) {
        introHtml = introHtml.replace(/(<h[12][^>]*>)/i, `$1<span class="grid-emoji" style="font-size: 1.2em; margin-right: 8px;">${emoji}</span> `);
      }
      masonryHtml += `<div class="card intro-card"><div class="card-body">${introHtml}</div></div>`;
      introText = introHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    const isQuiz = sourceFile.name.includes('课堂小测');

    for (let i = 1; i < parts.length; i += 2) {
      const h3 = parts[i];
      const contentParts = parts[i + 1] || '';
      const h3Text = h3.replace(/<[^>]+>/g, '').trim();
      const plainContent = contentParts.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      
      grids.push({ h3: h3Text, content: plainContent });

      let classes = ['card'];
      if (isQuiz) classes.push('quiz-card');
      else classes.push('subject-card');

      if (h3Text.includes('核心句')) classes.push('core-card');
      if (h3Text.includes('时间线')) classes.push('timeline-card');

      const defaultOpen = 'open';
      masonryHtml += `
        <details class="${classes.join(' ')}" ${defaultOpen}>
          <summary class="card-header">${h3}</summary>
          <div class="card-body">${contentParts}</div>
        </details>`;
    }
    masonryHtml += '</div>';

    pages.push({
      title,
      htmlContent: masonryHtml,
      filename,
      sourceName: sourceFile.name,
      url,
      intro: introText,
      grids: grids
    });
  });
}

// Process search index
pages.forEach(page => {
  searchIndex.push({
    source: page.sourceName,
    title: page.title,
    url: page.url,
    intro: page.intro,
    grids: page.grids
  });
});

fs.writeFileSync(path.join(DOCS_DIR, 'search-index.json'), JSON.stringify(searchIndex));

// Write HTML files
pages.forEach(page => {
  let activeNavHtml = navigationHtml.replace(
    `href="${page.url}"`,
    `href="${page.url}" class="active"`
  );
  
  const finalHtml = template
    .replace(/{{TITLE}}/g, page.title)
    .replace(/{{NAVIGATION}}/g, activeNavHtml)
    .replace(/{{CONTENT}}/g, page.htmlContent);
    
  fs.writeFileSync(path.join(DOCS_DIR, page.filename), finalHtml);
});

if (pages.length > 0) {
  fs.writeFileSync(
    path.join(DOCS_DIR, 'index.html'), 
    `<meta http-equiv="refresh" content="0; url=${pages[0].url}" />`
  );
}

console.log('Build complete. Check docs/ folder.');
