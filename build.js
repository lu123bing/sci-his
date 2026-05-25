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
    
    // First part: intro / before first <h3>
    if (parts[0] && parts[0].trim().length > 0) {
      masonryHtml += `<div class="card intro-card"><div class="card-body">${parts[0]}</div></div>`;
    }

    const isQuiz = sourceFile.name.includes('课堂小测');

    for (let i = 1; i < parts.length; i += 2) {
      const h3 = parts[i];
      const contentParts = parts[i + 1] || '';
      const h3Text = h3.replace(/<[^>]+>/g, '');

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
      markdownContent: section // for search indexing
    });
  });
}

// Process search index
pages.forEach(page => {
  const paragraphs = page.markdownContent.split(/\n\s*\n/);
  paragraphs.forEach((p, pIdx) => {
    const text = p.replace(/#+\s+/g, '').replace(/[*_`>]/g, '').trim();
    if (text.length > 5) {
      searchIndex.push({
        source: page.sourceName,
        title: page.title,
        text: text,
        url: page.url
      });
    }
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
