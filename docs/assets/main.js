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

  
  let currentFocus = -1;

  searchInput.addEventListener('input', (e) => {
    currentFocus = -1;
    const query = e.target.value.trim().toLowerCase();
    
    const keywords = query.split(/\s+/).filter(k => k.length > 0);
    
    if (keywords.length === 0) {
      searchResults.innerHTML = '';
      searchResults.classList.add('hidden');
      return;
    }

    const matches = [];
    const getHitCountStr = (text, q) => {
      if (!text) return 0;
      return (text.toLowerCase().match(new RegExp(escapeRegExp(q), 'g')) || []).length;
    };
    const getHitCount = (text) => keywords.reduce((sum, k) => sum + getHitCountStr(text, k), 0);

    for (const section of searchIndex) {
      let sectionHits = 0;
      let matchedGrids = [];
      
      const titleMatchesAll = keywords.every(k => section.title.toLowerCase().includes(k));
      const titleHits = titleMatchesAll ? getHitCount(section.title) : 0;
      
      const introText = section.intro || '';
      const introMatchesAll = keywords.every(k => introText.toLowerCase().includes(k));
      const introHits = introMatchesAll ? getHitCount(introText) : 0;
      if (introHits > 0) sectionHits += introHits;
      
      if (section.grids) {
        for (const grid of section.grids) {
          const gridText = (grid.h3 + " " + grid.content).toLowerCase();
          const gridMatchesAll = keywords.every(k => gridText.includes(k));
          if (gridMatchesAll) {
            const h3Hits = getHitCount(grid.h3);
            const contentHits = getHitCount(grid.content);
            sectionHits += h3Hits + contentHits;
            matchedGrids.push(grid);
          }
        }
      }
      
      sectionHits += titleHits;
      
      if (titleMatchesAll || introMatchesAll || matchedGrids.length > 0) {
        matches.push({
          section: section,
          score: sectionHits,
          titleHits: titleHits,
          introMatched: introMatchesAll,
          matchedGrids: matchedGrids
        });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    const topMatches = matches.slice(0, 15);

    if (topMatches.length === 0) {
      searchResults.innerHTML = '<div class="search-result-item"><span class="search-result-text">无结果</span></div>';
    } else {
      searchResults.innerHTML = topMatches.map(item => {
        const regexStr = keywords.map(escapeRegExp).join('|');
        const regex = new RegExp(`(${regexStr})`, 'gi');
        
        let sectionTitle = item.section.title.replace(regex, '<mark>$1</mark>');
        let innerHtml = '';
        
        const firstMatchIdx = (text) => {
          let minIdx = -1;
          for (let k of keywords) {
            let idx = (text || "").toLowerCase().indexOf(k);
            if (idx !== -1 && (minIdx === -1 || idx < minIdx)) {
              minIdx = idx;
            }
          }
          return minIdx;
        };

        if (item.introMatched) {
           let idx = firstMatchIdx(item.section.intro);
           let start = Math.max(0, idx - 20);
           let end = Math.min(item.section.intro.length, idx + 40);
           let excerpt = (start > 0 ? '...' : '') + item.section.intro.substring(start, end) + (end < item.section.intro.length ? '...' : '');
           innerHtml += `<div class="search-result-grid"><div class="search-result-text"><em>[前言]</em> ${excerpt.replace(regex, '<mark>$1</mark>')}</div></div>`;
        }
        
        item.matchedGrids.forEach(grid => {
           let h3 = grid.h3.replace(regex, '<mark>$1</mark>');
           let idx = firstMatchIdx(grid.content);
           let excerpt = grid.content;
           if (idx !== -1) {
              let start = Math.max(0, idx - 20);
              let end = Math.min(grid.content.length, idx + 40);
              excerpt = (start > 0 ? '...' : '') + grid.content.substring(start, end) + (end < grid.content.length ? '...' : '');
           } else {
              excerpt = grid.content.substring(0, 40) + (grid.content.length > 40 ? '...' : '');
           }
           innerHtml += `<div class="search-result-grid"><strong>${h3}</strong>: <span class="search-result-text">${excerpt.replace(regex, '<mark>$1</mark>')}</span></div>`;
        });

        if (item.matchedGrids.length === 0 && !item.introMatched && item.titleHits > 0) {
          innerHtml += `<div class="search-result-grid"><span class="search-result-text">标题匹配，但无便签命中。</span></div>`;
        }
        
        return `
          <a href="${item.section.url}?highlight=${encodeURIComponent(query)}" class="search-result-item">
            <div class="search-result-title">${item.section.source} - ${sectionTitle} <em><small>(${item.score}处匹配)</small></em></div>
            ${innerHtml}
          </a>
        `;
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
    const keywords = query.split(/\s+/).filter(k => k.length > 0);
    if (keywords.length === 0) return;
    const regexStr = keywords.map(escapeRegExp).join('|');
    const regex = new RegExp(`(${regexStr})`, 'gi');
    const testRegex = new RegExp(`(${regexStr})`, 'i');
    
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
    const nodesToReplace = [];
    
    let currentNode;
    while (currentNode = walker.nextNode()) {
      if (currentNode.parentNode && currentNode.parentNode.nodeName === 'MARK') continue;
      if (testRegex.test(currentNode.nodeValue)) {
        nodesToReplace.push(currentNode);
      }
    }
    
    const cardMatches = new Map();

    nodesToReplace.forEach(textNode => {
      const parentCard = textNode.parentNode.closest ? textNode.parentNode.closest('.card') : null;
      let matchesAll = false;
      if (parentCard) {
         if (cardMatches.has(parentCard)) {
            matchesAll = cardMatches.get(parentCard);
         } else {
            const cardText = parentCard.textContent.toLowerCase();
            matchesAll = keywords.every(k => cardText.includes(k));
            cardMatches.set(parentCard, matchesAll);
         }
      } else {
         matchesAll = keywords.every(k => node.textContent.toLowerCase().includes(k));
      }
      
      const matchText = textNode.nodeValue;
      const span = document.createElement('span');
      if (matchesAll) {
         span.innerHTML = matchText.replace(regex, '<mark>$1</mark>');
      } else {
         span.innerHTML = matchText.replace(regex, '<mark class="partial-match">$1</mark>');
      }
      textNode.parentNode.replaceChild(span, textNode);
    });
    
    // Auto-expand enclosing details cards & Scroll
    const firstMark = node.querySelector('mark:not(.partial-match)') || node.querySelector('mark');
    if (firstMark) {
      document.querySelectorAll('mark:not(.partial-match)').forEach(mark => {
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

  // Global Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
    
    if (!isInput) {
      if (e.key === 'Escape') {
      const searchResults = document.getElementById('search-results');
      const searchInput = document.getElementById('search-input');
      if (searchResults && !searchResults.classList.contains('hidden')) {
        searchResults.classList.add('hidden');
        searchInput.blur();
      }
    } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
          searchInput.focus();
          window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll top when focusing search
        }
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault(); // Prevent default if any
        const toggleBtn = document.getElementById('sidebar-toggle');
        if (toggleBtn) toggleBtn.click();
      }
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const activeLink = document.querySelector('.nav-links a.active');
        if (activeLink) {
          const allLinks = Array.from(document.querySelectorAll('.nav-links a'));
          const currentIndex = allLinks.indexOf(activeLink);
          if (e.key === 'ArrowLeft' && currentIndex > 0) {
            e.preventDefault();
            allLinks[currentIndex - 1].click();
          } else if (e.key === 'ArrowRight' && currentIndex < allLinks.length - 1) {
            e.preventDefault();
            allLinks[currentIndex + 1].click();
          }
        }
      }
    }
  });

  const toggleBtn = document.getElementById('sidebar-toggle');
  if(toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('collapsed');
      if (window.applyDynamicLayout) window.applyDynamicLayout();
    });
  }
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
  document.querySelector('.markdown-body').style.opacity = '0.5';
  
  try {
    const res = await fetch(targetPage);
    const html = await res.text();
    const p = new DOMParser();
    const doc = p.parseFromString(html, 'text/html');
    
    document.querySelector('.markdown-body').innerHTML = doc.querySelector('.markdown-body').innerHTML;
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
    
    if (window.applyDynamicLayout) window.applyDynamicLayout();
  } catch (err) {
    window.location.href = href;
  } finally {
    document.querySelector('.markdown-body').style.opacity = '1';
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

window.applyDynamicLayout = function() {
  const container = document.querySelector('.masonry-grid');
  if (!container) return;
  const cards = Array.from(container.querySelectorAll('.card'));
  if (cards.length === 0) return;

  const ww = window.innerWidth;
  const sideCollapsed = document.querySelector('.sidebar')?.classList.contains('collapsed');
  
  let cols = 1;
  if (sideCollapsed) {
    if (ww >= 2200) cols = 5;
    else if (ww >= 1600) cols = 4;
    else if (ww >= 1000) cols = 3;
    else cols = 2;
  } else {
    if (ww >= 2200) cols = 4;
    else if (ww >= 1600) cols = 3;
    else if (ww >= 1000) cols = 2;
  }

  if (cols === 1 || cards.length < 2) {
    cards.forEach(c => c.style.width = '100%');
    return;
  }

  const levels = [0.5, 0.75, 1, 1.25, 1.5];

  if (!container.dataset.lengthsCached) {
    cards.forEach(c => {
      const body = c.querySelector('.card-body');
      c.dataset.len = body ? body.textContent.trim().length : c.textContent.trim().length;
    });
    container.dataset.lengthsCached = "true";
  }

  const cardLengths = cards.map(c => parseInt(c.dataset.len, 10) || 1);

  for (let i = 0; i < cards.length; i += cols) {
    const rowCards = cards.slice(i, i + cols);
    const rowLengths = cardLengths.slice(i, i + cols);
    const actualColsInRow = rowCards.length;
    
    if (actualColsInRow < cols) {
       const fraction = 1 / cols;
       rowCards.forEach(card => {
         card.style.width = `calc(${fraction * 100}% - ${24 * (cols - 1) * fraction}px)`;
       });
       continue;
    }

    const meanLen = rowLengths.reduce((a,b)=>a+b, 0) / actualColsInRow;
    const chosenLevels = rowLengths.map(len => {
      const ratio = len / meanLen;
      let bestLevel = levels[0];
      let minDiff = Math.abs(ratio - levels[0]);
      for (const level of levels) {
        const diff = Math.abs(ratio - level);
        if (diff < minDiff) {
          bestLevel = level;
          minDiff = diff;
        }
      }
      return bestLevel;
    });

    const sumLevels = chosenLevels.reduce((a,b)=>a+b, 0);

    rowCards.forEach((card, j) => {
      const fraction = chosenLevels[j] / sumLevels;
      card.style.width = `calc(${fraction * 100}% - ${24 * (actualColsInRow - 1) * fraction}px)`;
    });
  }
};

let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (window.applyDynamicLayout) window.applyDynamicLayout();
  }, 100);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.applyDynamicLayout) window.applyDynamicLayout();
  });
} else {
  if (window.applyDynamicLayout) window.applyDynamicLayout();
}

