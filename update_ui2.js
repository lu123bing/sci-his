const fs = require('fs');

// 1. Update template.html
let template = fs.readFileSync('src/template.html', 'utf8');

// Replace top-toolbar to remove inline styles for search-box
template = template.replace(
  /<div class="search-box relative-search"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<div class="toolbar-actions"/,
  `<div class="search-box relative-search">
             <input type="text" id="search-input" placeholder="搜索知识点 (例如 ：文化相对主义)...">
             <div id="search-results" class="search-results hidden"></div>
           </div>
         </div>
         <div class="toolbar-actions"`
);

// Add inner inline styles? No, let's just let CSS handle it. 
template = template.replace(
  /<input type="text" id="search-input"[^>]*>/,
  `<input type="text" id="search-input" placeholder="搜索知识点...">`
);

template = template.replace(
  /<div id="search-results"[^>]*><\/div>/,
  `<div id="search-results" class="search-results hidden"></div>`
);

fs.writeFileSync('src/template.html', template);

// 2. Update style.css
let style = fs.readFileSync('src/assets/style.css', 'utf8');

// Update Grid
style = style.replace(
  /\.masonry-grid \{[\s\S]*?gap: 24px;\n\}/,
  `.masonry-grid {
  display: grid;
  grid-template-columns: 1fr;
  align-items: start;
  gap: 24px;
}

@media (min-width: 768px) { .masonry-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1100px) { .masonry-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1500px) { .masonry-grid { grid-template-columns: repeat(4, 1fr); } }

/* Force +1 column when sidebar is collapsed */
.container:has(.sidebar.collapsed) .masonry-grid { grid-template-columns: repeat(2, 1fr); }
@media (min-width: 768px) { .container:has(.sidebar.collapsed) .masonry-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1100px) { .container:has(.sidebar.collapsed) .masonry-grid { grid-template-columns: repeat(4, 1fr); } }
@media (min-width: 1500px) { .container:has(.sidebar.collapsed) .masonry-grid { grid-template-columns: repeat(5, 1fr); } }
`
);

// Append new Toolbar CSS
style += `

/* Sticky Top Toolbar */
.top-toolbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: var(--bg-color); /* matches body background */
  padding-top: 10px;
  padding-bottom: 10px;
  margin-top: -10px; /* Offset the content padding gap if necessary */
  border-bottom: 1px solid var(--border);
}

/* Expandable Search Box */
.search-box {
  width: 250px;
  position: relative;
  transition: width 0.3s ease;
}
.search-box:focus-within {
  width: 500px;
}
.search-box input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.2s;
  background: var(--surface);
}
.search-box input:focus {
  outline: none;
  border-color: var(--primary);
}
.search-results.hidden {
  display: none !important;
}
.search-results {
  position: absolute;
  top: 100%; left: 0; right: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
  max-height: 50vh;
  overflow-y: auto;
  z-index: 200;
  margin-top: 5px;
}
`;

fs.writeFileSync('src/assets/style.css', style);
console.log('Update Complete');
