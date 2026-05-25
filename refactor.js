const fs = require('fs');
const path = require('path');

// 1. Rewrite build.js
const buildJsContent = `const fs = require('fs');
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
  
  const sections = content.split(/\\n(?=## )/);
  
  // Neat nav category name
  navigationHtml += \`<div class="nav-category">\${sourceFile.shortName}</div>\`;
  
  sections.forEach((section, index) => {
    let title = '前言/导言';
    const match = section.match(/^#+\\s+(.*)/);
    if (match) {
      title = match[1].trim();
    }
    
    const safeTitle = title.replace(/[\\/\\\\:*?"<>|]/g, '').replace(/\\s+/g, '_');
    const filename = \`\${sourceFile.name}_\${index}_\${safeTitle}.html\`;
    const url = filename;
    
    // Tweak to look neater (e.g. bolded numbers if available)
    const neatTitle = title.replace(/^(第\\d+讲|\\d+\\_\\d+)/, '<strong>$1</strong>');
    navigationHtml += \`<li><a href="\${url}">\${neatTitle}</a></li>\`;
    
    // Parse markdown into HTML
    const rawHtmlContent = marked.parse(section);

    // Split by <h3> tags
    const parts = rawHtmlContent.split(/(<h3[^>]*>[\\s\\S]*?<\\/h3>)/gi);
    
    let masonryHtml = '<div class="masonry-grid">';
    
    // First part: intro / before first <h3>
    if (parts[0] && parts[0].trim().length > 0) {
      masonryHtml += \`<div class="card intro-card"><div class="card-body">\${parts[0]}</div></div>\`;
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

      if (isQuiz) {
        masonryHtml += \`
          <details class="\${classes.join(' ')}">
            <summary class="card-header">\${h3}</summary>
            <div class="card-body">\${contentParts}</div>
          </details>\`;
      } else {
        masonryHtml += \`
          <div class="\${classes.join(' ')}">
            <div class="card-header">\${h3}</div>
            <div class="card-body">\${contentParts}</div>
          </div>\`;
      }
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
  const paragraphs = page.markdownContent.split(/\\n\\s*\\n/);
  paragraphs.forEach((p, pIdx) => {
    const text = p.replace(/#+\\s+/g, '').replace(/[*_\`>]/g, '').trim();
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
    \`href="\${page.url}"\`,
    \`href="\${page.url}" class="active"\`
  );
  
  const finalHtml = template
    .replace('{{TITLE}}', page.title)
    .replace('{{NAVIGATION}}', activeNavHtml)
    .replace('{{CONTENT}}', page.htmlContent);
    
  fs.writeFileSync(path.join(DOCS_DIR, page.filename), finalHtml);
});

if (pages.length > 0) {
  fs.writeFileSync(
    path.join(DOCS_DIR, 'index.html'), 
    \`<meta http-equiv="refresh" content="0; url=\${pages[0].url}" />\`
  );
}

console.log('Build complete. Check docs/ folder.');
`;

// 2. Rewrite src/template.html
const templateHtmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>{{TITLE}} - 科学与文明史</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>
  <div class="container">
    <nav class="sidebar">
      <div class="sidebar-header">
        <h2>复习导航</h2>
      </div>
      <div class="search-box sticky-search">
        <input type="text" id="search-input" placeholder="搜索知识点...">
        <div id="search-results" class="search-results hidden"></div>
      </div>
      <ul class="nav-links">
        {{NAVIGATION}}
      </ul>
    </nav>
    <main class="content">
      <div class="top-toolbar">
         <h1 class="page-title">{{TITLE}}</h1>
         <div class="toolbar-actions">
           <button class="btn" onclick="window.toggleDetails(true)">展开全部</button>
           <button class="btn btn-outline" onclick="window.toggleDetails(false)">折叠全部</button>
         </div>
      </div>
      <div class="markdown-body">
        {{CONTENT}}
      </div>
    </main>
  </div>
  <script src="assets/main.js"></script>
</body>
</html>`;

// 3. Rewrite src/assets/style.css
const styleCssContent = `:root {
  --primary: #4f46e5;
  --primary-hover: #4338ca;
  --bg-color: #f8fafc;
  --surface: #ffffff;
  --text-main: #1e293b;
  --text-muted: #64748b;
  --border: #e2e8f0;
  --badge-bg: #e0e7ff;
  --badge-text: #3730a3;
  --core-bg: #fffbeb;
  --core-accent: #f59e0b;
}

* { box-sizing: border-box; }

body {
  margin: 0; padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: var(--bg-color);
  color: var(--text-main);
  line-height: 1.6;
}

.container {
  display: flex;
  min-height: 100vh;
}

/* Sidebar & Sticky Search */
.sidebar {
  width: 280px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.sidebar-header h2 { margin: 0; font-size: 1.25rem; color: var(--text-main); }

.sticky-search {
  position: sticky;
  top: 0;
  background: var(--surface);
  z-index: 10;
  padding: 15px 20px;
  border-bottom: 1px solid var(--border);
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}

.sticky-search input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}
.sticky-search input:focus {
  outline: none; border-color: var(--primary);
}

.search-results {
  position: absolute;
  top: 100%; left: 20px; right: 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
  max-height: 60vh;
  overflow-y: auto;
  z-index: 20;
}
.search-results.hidden { display: none; }
.search-result-item {
  display: block; padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  text-decoration: none; color: inherit;
}
.search-result-item:hover { background: var(--bg-color); }
.search-result-title { font-weight: 600; font-size: 0.9em; margin-bottom: 4px; }
.search-result-text { font-size: 0.85em; color: var(--text-muted); }

.nav-links {
  overflow-y: auto; flex: 1;
  padding: 15px 10px; margin: 0; list-style: none;
}
.nav-category {
  font-weight: 700; font-size: 0.85rem; text-transform: uppercase;
  color: var(--text-muted); padding: 15px 10px 5px;
}
.nav-links li a {
  display: block; padding: 8px 12px;
  color: var(--text-main); text-decoration: none;
  border-radius: 6px; font-size: 0.95rem;
  transition: all 0.2s; margin-bottom: 2px;
}
.nav-links li a:hover { background: var(--bg-color); color: var(--primary); }
.nav-links li a.active {
  background: var(--primary); color: white;
}

/* Main Content area */
.content {
  flex: 1; padding: 40px;
  max-width: 1400px; margin: 0 auto;
}

.top-toolbar {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 30px; padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}
.page-title { margin: 0; font-size: 2rem; }

.btn {
  background: var(--primary); color: white;
  border: none; padding: 8px 16px;
  border-radius: 8px; cursor: pointer;
  font-weight: 600; font-size: 0.9rem;
  transition: background 0.2s;
}
.btn:hover { background: var(--primary-hover); }
.btn-outline {
  background: transparent; color: var(--primary);
  border: 1px solid var(--primary); margin-left: 10px;
}
.btn-outline:hover { background: var(--primary); color: white; }

/* Masonry Grid */
.masonry-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  align-items: start;
  gap: 24px;
}

/* Card Styling */
.card {
  background: var(--surface);
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
  border: 1px solid var(--border);
  overflow: hidden; break-inside: avoid;
  transition: transform 0.2s, box-shadow 0.2s;
}
.card:hover { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }

.card-header {
  padding: 16px 20px; margin: 0;
  border-bottom: 1px solid var(--border);
  background: #f8fafc; font-size: 1.15rem; color: var(--primary);
}
.card-header h3 { margin: 0; font-size: inherit; }
.card-body { padding: 20px; }
.card-body p:first-child { margin-top: 0; }
.card-body p:last-child { margin-bottom: 0; }

/* Quiz Details Card specific styling */
details.quiz-card summary {
  cursor: pointer; position: relative; list-style: none; /* Hide default marker */
  user-select: none; transition: background 0.2s;
}
details.quiz-card summary::-webkit-details-marker { display: none; }
details.quiz-card summary::before {
  content: '▶';
  position: absolute; right: 20px; top: 50%;
  transform: translateY(-50%);
  font-size: 0.8rem; color: var(--text-muted); transition: transform 0.3s;
}
details.quiz-card[open] summary::before { transform: translateY(-50%) rotate(90deg); color: var(--primary); }
details.quiz-card summary:hover { background: #f1f5f9; }

/* Chic Badges for strong inside quiz */
.quiz-card .card-body strong {
  background-color: var(--badge-bg); color: var(--badge-text);
  padding: 2px 8px; border-radius: 6px;
  font-weight: 600; font-size: 0.9em; display: inline-block; margin-right: 4px;
}

/* Core takeaway styling */
.core-card {
  border-color: #fcd34d;
}
.core-card .card-header {
  background: var(--core-bg); color: var(--core-accent);
  border-bottom-color: #fde68a;
}
.core-card .card-body blockquote {
  background: var(--core-bg); border-left: 4px solid var(--core-accent);
  margin: 0 -20px 15px; padding: 15px 20px;
  font-style: italic; font-weight: 500; color: #92400e;
}

mark {
  background-color: #fef08a; padding: 0 2px;
  border-radius: 3px; font-weight: bold;
}

.intro-card {
  grid-column: 1 / -1;
  background: #ffffff;
}

/* Timeline Layout Tweak */
.timeline-card .card-body ul {
  border-left: 2px solid var(--border);
  padding-left: 20px; margin-left: 10px; position: relative;
}
.timeline-card .card-body li {
  position: relative; margin-bottom: 15px; list-style: none;
}
.timeline-card .card-body li::before {
  content: ''; position: absolute; left: -25.5px; top: 6px;
  width: 10px; height: 10px; background: var(--primary);
  border-radius: 50%;
}
`;

// 4. Create src/assets/main.js
const mainJsContent = `(async function() {
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  let searchIndex = [];

  // Expose toggleDetails globally
  window.toggleDetails = function(open) {
    document.querySelectorAll('details').forEach(d => d.open = open);
  };

  try {
    const response = await fetch('search-index.json');
    searchIndex = await response.json();
  } catch (err) {
    console.error('Failed to load search index', err);
  }

  const urlParams = new URLSearchParams(window.location.search);
  const highlightQuery = urlParams.get('highlight');
  if (highlightQuery) {
    highlightTextInDOM(document.querySelector('.markdown-body'), highlightQuery);
  }

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    
    if (query.length === 0) {
      searchResults.innerHTML = '';
      searchResults.classList.add('hidden');
      return;
    }

    const matches = [];
    for (const item of searchIndex) {
      if (item.text.toLowerCase().includes(query) || item.title.toLowerCase().includes(query)) {
        matches.push(item);
      }
      if (matches.length >= 20) break;
    }

    if (matches.length === 0) {
      searchResults.innerHTML = '<div class="search-result-item"><span class="search-result-text">无结果</span></div>';
    } else {
      searchResults.innerHTML = matches.map(item => {
        const regex = new RegExp(\`(\${escapeRegExp(query)})\`, 'gi');
        const highlightedText = item.text.replace(regex, '<mark>$1</mark>');
        const highlightedTitle = item.title.replace(regex, '<mark>$1</mark>');
        
        return \`
          <a href="\${item.url}?highlight=\${encodeURIComponent(query)}" class="search-result-item">
            <div class="search-result-title">\${item.source} - \${highlightedTitle}</div>
            <div class="search-result-text">\${highlightedText}</div>
          </a>
        \`;
      }).join('');
    }
    
    searchResults.classList.remove('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.classList.add('hidden');
    }
  });
  
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim().length > 0) {
      searchResults.classList.remove('hidden');
    }
  });

  function escapeRegExp(string) {
    return string.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
  }

  function highlightTextInDOM(node, query) {
    if (!query) return;
    const regex = new RegExp(\`(\${escapeRegExp(query)})\`, 'gi');
    
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
    const nodesToReplace = [];
    
    let currentNode;
    while (currentNode = walker.nextNode()) {
      if (currentNode.parentNode && currentNode.parentNode.nodeName === 'MARK') continue;
      if (regex.test(currentNode.nodeValue)) {
        nodesToReplace.push(currentNode);
      }
    }
    
    nodesToReplace.forEach(textNode => {
      const matchText = textNode.nodeValue;
      const span = document.createElement('span');
      span.innerHTML = matchText.replace(regex, '<mark>$1</mark>');
      textNode.parentNode.replaceChild(span, textNode);
    });
    
    // Auto-expand enclosing details cards & Scroll
    const firstMark = node.querySelector('mark');
    if (firstMark) {
      document.querySelectorAll('mark').forEach(mark => {
        const parentDetail = mark.closest('details');
        if (parentDetail) {
          parentDetail.setAttribute('open', '');
        }
      });
      firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
})();`;

// Write the files out
function writeFiles() {
  fs.writeFileSync(path.join(__dirname, 'build.js'), buildJsContent);
  fs.writeFileSync(path.join(__dirname, 'src', 'template.html'), templateHtmlContent);
  fs.writeFileSync(path.join(__dirname, 'src', 'assets', 'style.css'), styleCssContent);
  fs.writeFileSync(path.join(__dirname, 'src', 'assets', 'main.js'), mainJsContent);
  
  // Cleanup old search.js 
  const oldSearchJsPath = path.join(__dirname, 'src', 'assets', 'search.js');
  if (fs.existsSync(oldSearchJsPath)) {
    fs.unlinkSync(oldSearchJsPath);
  }

  console.log('✅ Successfully refactored all project files!');
}

writeFiles();
