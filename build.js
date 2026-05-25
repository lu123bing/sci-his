const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// Paths
const DOCS_DIR = path.join(__dirname, 'docs');
const SRC_DIR = path.join(__dirname, 'src');
const TEMPLATE_PATH = path.join(SRC_DIR, 'template.html');

// Create docs dir if not exists
if (!fs.existsSync(path.join(__dirname, 'docs'))) {
  fs.mkdirSync(path.join(__dirname, 'docs'), { recursive: true });
}
if (!fs.existsSync(path.join(__dirname, 'docs', 'assets'))) {
  fs.mkdirSync(path.join(__dirname, 'docs', 'assets'), { recursive: true });
}

// Copy assets
fs.copyFileSync(path.join(SRC_DIR, 'assets', 'style.css'), path.join(__dirname, 'docs', 'assets', 'style.css'));
fs.copyFileSync(path.join(SRC_DIR, 'assets', 'search.js'), path.join(__dirname, 'docs', 'assets', 'search.js'));

const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

const filesToProcess = [
  { name: '科学与文明史概论复习笔记', file: '科学与文明史概论复习笔记.md' },
  { name: '课堂小测整理扩展版', file: '科学与文明史概论_课堂小测整理扩展版.md' }
];

let navigationHtml = '';
let searchIndex = [];
const pages = [];

for (const sourceFile of filesToProcess) {
  const content = fs.readFileSync(path.join(__dirname, sourceFile.file), 'utf-8');
  
  // Split by "## " (Level 2 heading)
  // But wait, the first part might be just "# Title", so let's split from the start or before ##
  const sections = content.split(/\n(?=## )/);
  
  navigationHtml += `<div class="nav-category">${sourceFile.name}</div>`;
  
  sections.forEach((section, index) => {
    let title = '前言/导言';
    
    // Extact title
    const match = section.match(/^#+\s+(.*)/);
    if (match) {
      title = match[1].trim();
    }
    
    // create a safe filename
    const safeTitle = title.replace(/[\/\\:*?"<>|]/g, '').replace(/\s+/g, '_');
    const filename = `${sourceFile.name}_${index}_${safeTitle}.html`;
    const url = filename;
    
    navigationHtml += `<li><a href="${url}">${title}</a></li>`;
    
    pages.push({
      title,
      htmlContent: marked.parse(section),
      filename,
      sourceName: sourceFile.name,
      url,
      markdownContent: section // for search indexing
    });
  });
}

// Process search index
pages.forEach(page => {
  // Extract paragraphs for search
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

// Write search index
fs.writeFileSync(path.join(__dirname, 'docs', 'search-index.json'), JSON.stringify(searchIndex));

// Write HTML files
pages.forEach(page => {
  let activeNavHtml = navigationHtml.replace(
    `href="${page.url}"`,
    `href="${page.url}" class="active"`
  );
  
  const finalHtml = template
    .replace('{{TITLE}}', page.title)
    .replace('{{NAVIGATION}}', activeNavHtml)
    .replace('{{CONTENT}}', page.htmlContent);
    
  fs.writeFileSync(path.join(__dirname, 'docs', page.filename), finalHtml);
});

// redirect index.html to first page
if (pages.length > 0) {
  fs.writeFileSync(
    path.join(__dirname, 'docs', 'index.html'), 
    `<meta http-equiv="refresh" content="0; url=${pages[0].url}" />`
  );
}

console.log('Build complete. Check docs/ folder.');
