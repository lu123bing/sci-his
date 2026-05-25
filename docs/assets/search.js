(async function() {
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  let searchIndex = [];

  // Load search index
  try {
    const response = await fetch('search-index.json');
    searchIndex = await response.json();
  } catch (err) {
    console.error('Failed to load search index', err);
  }

  // Handle highlighing in main DOM if navigated with query string
  const urlParams = new URLSearchParams(window.location.search);
  const highlightQuery = urlParams.get('highlight');
  if (highlightQuery) {
    highlightTextInDOM(document.querySelector('.markdown-body'), highlightQuery);
  }

  // Search input event
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
      if (matches.length >= 20) break; // Limit results
    }

    if (matches.length === 0) {
      searchResults.innerHTML = '<div class="search-result-item"><span class="search-result-text">无结果</span></div>';
    } else {
      searchResults.innerHTML = matches.map(item => {
        // Simple highlighting for the result snippet
        const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
        const highlightedText = item.text.replace(regex, '<mark>$1</mark>');
        const highlightedTitle = item.title.replace(regex, '<mark>$1</mark>');
        
        return `
          <a href="${item.url}?highlight=${encodeURIComponent(query)}" class="search-result-item">
            <div class="search-result-title">${item.source} - ${highlightedTitle}</div>
            <div class="search-result-text">${highlightedText}</div>
          </a>
        `;
      }).join('');
    }
    
    searchResults.classList.remove('hidden');
  });

  // Hide search when clicked outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.classList.add('hidden');
    }
  });
  
  // Highlight search when focused again
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim().length > 0) {
      searchResults.classList.remove('hidden');
    }
  });

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlightTextInDOM(node, query) {
    if (!query) return;
    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    
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
    
    // Scroll to first mark
    const firstMark = node.querySelector('mark');
    if (firstMark) {
      firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
})();
