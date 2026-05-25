(async function() {
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
    window.highlightTextInDOM(document.querySelector('.markdown-body'), highlightQuery);
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
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  window.highlightTextInDOM = function highlightTextInDOM(node, query) {
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
})();

// --- SPA / PJAX Navigation & Scroll Preserving ---
function initNavigation() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    const scrollPos = sessionStorage.getItem('sidebarScroll');
    if (scrollPos) sidebar.scrollTop = parseInt(scrollPos, 10);
    sidebar.addEventListener('scroll', () => {
      sessionStorage.setItem('sidebarScroll', sidebar.scrollTop);
    });
  }

  // Delegate click for nav links
  document.querySelector('.nav-links').addEventListener('click', async (e) => {
    const link = e.target.closest('a');
    if (link) {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('http') && !href.startsWith('#')) {
        e.preventDefault();
        await navigateTo(href);
      }
    }
  });

  // Delegate click for search results
  document.getElementById('search-results').addEventListener('click', async (e) => {
    const link = e.target.closest('a');
    if (link) {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('http') && !href.startsWith('#')) {
        e.preventDefault();
        document.querySelector('.search-results').classList.add('hidden');
        document.getElementById('search-input').value = '';
        await navigateTo(href);
      }
    }
  });
}

async function navigateTo(href) {
  const parts = href.split('?');
  const targetPage = parts[0];
  const query = new URLSearchParams(parts[1]).get('highlight');
  
  const mainContent = document.querySelector('.content');
  mainContent.style.opacity = '0.5';
  
  try {
    const res = await fetch(targetPage);
    const html = await res.text();
    const p = new DOMParser();
    const doc = p.parseFromString(html, 'text/html');
    
    mainContent.innerHTML = doc.querySelector('.content').innerHTML;
    document.title = doc.title;
    
    // Update active state
    document.querySelectorAll('.nav-links a').forEach(a => {
      if (a.getAttribute('href') === targetPage) a.classList.add('active');
      else a.classList.remove('active');
    });

    history.pushState(null, '', href);
    window.scrollTo(0,0);

    if (query) {
      // Small timeout to allow DOM to render
      setTimeout(() => {
        if (typeof highlightTextInDOM === 'function') {
          highlightTextInDOM(document.querySelector('.markdown-body'), query);
        }
      }, 50);
    }
  } catch (err) {
    window.location.href = href;
  } finally {
    mainContent.style.opacity = '1';
  }
}

window.addEventListener('popstate', async () => {
  const href = window.location.pathname.split('/').pop() || 'index.html';
  await navigateTo(href);
});

// Run once loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavigation);
} else {
  initNavigation();
}
