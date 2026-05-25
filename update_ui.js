const fs = require('fs');

async function update() {
    // 1. Template HTML
    let template = fs.readFileSync('src/template.html', 'utf-8');
    
    // Remove search box from sidebar
    template = template.replace(/<div class="search-box[^>]*>[\s\S]*?<input[^>]*>[\s\S]*?<div id="search-results"[^>]*>[\s\S]*?<\/div>\s*<\/div>/, '');

    // Transform top-toolbar
    const oldToolbar = /<div class="top-toolbar">[\s\S]*?<\/div>(\s*)<div class="markdown-body">/;
    const newToolbar = `<div class="top-toolbar">
         <div class="toolbar-left" style="display: flex; align-items: center; flex: 1;">
           <button id="sidebar-toggle" class="btn btn-outline" style="margin-right: 20px; margin-left: 0; flex-shrink: 0; padding: 8px 12px; font-weight: bold; border-color: var(--border); color: var(--text-muted);">☰ 目录</button>
           <div class="search-box relative-search" style="flex: 1; max-width: 600px; position: relative;">
             <input type="text" id="search-input" placeholder="搜索知识点 (例如：文化相对主义)..." style="width: 100%; padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; font-size: 0.95rem;">
             <div id="search-results" class="search-results hidden" style="position: absolute; top: 100%; left: 0; right: 0; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); max-height: 50vh; overflow-y: auto; z-index: 20;"></div>
           </div>
         </div>
         <div class="toolbar-actions" style="margin-left: 20px; flex-shrink: 0;">
           <button class="btn" onclick="window.toggleDetails(true)">展开全部</button>
           <button class="btn btn-outline" onclick="window.toggleDetails(false)">折叠全部</button>
         </div>
      </div>$1<div class="markdown-body">`;
    template = template.replace(oldToolbar, newToolbar);
    fs.writeFileSync('src/template.html', template);

    // 2. Style CSS
    let style = fs.readFileSync('src/assets/style.css', 'utf-8');
    if(!style.includes('.sidebar.collapsed')) {
        style += `
/* Sidebar Toggle Styles */
.sidebar {
  transition: width 0.3s ease, padding 0.3s ease;
  overflow-x: hidden;
  flex-shrink: 0;
  white-space: nowrap;
}
.sidebar.collapsed {
  width: 0 !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  border-right: none !important;
}
.search-results:not(.hidden) { display: block !important; }
`;
    }
    fs.writeFileSync('src/assets/style.css', style);

    // 3. Main JS
    let mainJs = fs.readFileSync('src/assets/main.js', 'utf-8');
    
    // a. Update search excerpt logic limit 50 chars
    const oldExcerptRegex = /const regex = new RegExp\([^;]+\);\s*const highlightedText = item\.text\.replace\([^;]+\);\s*const highlightedTitle = item\.title\.replace\([^;]+\);/;
    
    const newExcerptChunk = `const regex = new RegExp(\`(\${escapeRegExp(query)})\`, 'gi');
        
        let matchIndex = item.text.toLowerCase().indexOf(query);
        let excerpt = item.text;
        if (matchIndex !== -1) {
            let start = Math.max(0, matchIndex - 25);
            let end = Math.min(item.text.length, matchIndex + query.length + 25);
            excerpt = (start > 0 ? '...' : '') + item.text.substring(start, end) + (end < item.text.length ? '...' : '');
        }
        
        const highlightedText = excerpt.replace(regex, '<mark>$1</mark>');
        const highlightedTitle = item.title.replace(regex, '<mark>$1</mark>');`;
        
    mainJs = mainJs.replace(oldExcerptRegex, newExcerptChunk);

    // b. Add sidebar toggle event listener tracking
    if(!mainJs.includes('sidebar-toggle')) {
        mainJs = mainJs.replace('function initNavigation() {', `function initNavigation() {
  const toggleBtn = document.getElementById('sidebar-toggle');
  if(toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('collapsed');
    });
  }`);
    }

    // c. Change PJAX target to .markdown-body instead of .content
    mainJs = mainJs.replace(/mainContent\.style\.opacity = '0\.5';/, "document.querySelector('.markdown-body').style.opacity = '0.5';");
    mainJs = mainJs.replace(/mainContent\.innerHTML = doc\.querySelector\('\.content'\)\.innerHTML;/, "document.querySelector('.markdown-body').innerHTML = doc.querySelector('.markdown-body').innerHTML;");
    mainJs = mainJs.replace(/mainContent\.style\.opacity = '1';/, "document.querySelector('.markdown-body').style.opacity = '1';");

    fs.writeFileSync('src/assets/main.js', mainJs);
    
    console.log('Update script finished successfully.');
}

update();