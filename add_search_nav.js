const fs = require('fs');

// 1. Update style.css to add .selected style for search results
let style = fs.readFileSync('src/assets/style.css', 'utf8');
if (!style.includes('.search-result-item.selected')) {
  style = style.replace(
    /\.search-result-item:hover \{ background: var\(--bg-color\); \}/,
    `.search-result-item:hover, .search-result-item.selected { background: var(--bg-color); border-left: 3px solid var(--primary); }`
  );
  fs.writeFileSync('src/assets/style.css', style);
}

// 2. Update main.js
let main = fs.readFileSync('src/assets/main.js', 'utf8');

const searchLogicNew = `
  let currentFocus = -1;

  searchInput.addEventListener('input', (e) => {
    currentFocus = -1;
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
        
        let matchIndex = item.text.toLowerCase().indexOf(query);
        let excerpt = item.text;
        if (matchIndex !== -1) {
            let start = Math.max(0, matchIndex - 25);
            let end = Math.min(item.text.length, matchIndex + query.length + 25);
            excerpt = (start > 0 ? '...' : '') + item.text.substring(start, end) + (end < item.text.length ? '...' : '');
        }
        
        const highlightedText = excerpt.replace(regex, '<mark>$1</mark>');
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

  searchInput.addEventListener('keydown', function(e) {
    let items = searchResults.querySelectorAll('.search-result-item');
    if (items.length === 0 || items[0].querySelector('.search-result-text').innerText === '无结果') {
      if (e.key === 'Escape') {
        searchResults.classList.add('hidden');
        searchInput.blur();
      }
      return;
    }
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      currentFocus++;
      addActive(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      currentFocus--;
      addActive(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentFocus > -1) {
        if (items[currentFocus]) {
          items[currentFocus].click();
        }
      } else {
        if (items.length > 0) items[0].click(); // default to first result
      }
    } else if (e.key === 'Escape') {
      searchResults.classList.add('hidden');
      searchInput.blur();
    }
  });

  function addActive(items) {
    if (!items) return false;
    removeActive(items);
    if (currentFocus >= items.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (items.length - 1);
    items[currentFocus].classList.add('selected');
    items[currentFocus].scrollIntoView({ block: 'nearest' });
  }

  function removeActive(items) {
    for (let i = 0; i < items.length; i++) {
      items[i].classList.remove('selected');
    }
  }
`;

// Replace the old searchInput.addEventListener('input') block
const blockRegex = /searchInput\.addEventListener\('input', \(e\) => \{[\s\S]*?searchResults\.classList\.remove\('hidden'\);\n  \}\);/m;
main = main.replace(blockRegex, searchLogicNew);

fs.writeFileSync('src/assets/main.js', main);

console.log('Search navigation logic added successfully');
