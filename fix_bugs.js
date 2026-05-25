const fs = require('fs');
const path = require('path');

async function fix() {
  try {
    // 1. Fix build.js: Replace .replace with global regex for {{TITLE}}, etc.
    let buildJs = fs.readFileSync('build.js', 'utf-8');
    
    // Fix replacements
    buildJs = buildJs.replace(
      /\.replace\('\{\{TITLE\}\}', page\.title\)\s*\.replace\('\{\{NAVIGATION\}\}', activeNavHtml\)\s*\.replace\('\{\{CONTENT\}\}', page.htmlContent\);/g,
      `.replace(/{{TITLE}}/g, page.title)
    .replace(/{{NAVIGATION}}/g, activeNavHtml)
    .replace(/{{CONTENT}}/g, page.htmlContent);`
    );

    // Fix card generation: make them all <details>
    // Search for: if (isQuiz) { masonryHtml += \` ... </div>\`; }
    const quizRegex = /if \(isQuiz\) \{\s*masonryHtml \+= `[\s\S]*?<\/div>`;\s*\}/;
    buildJs = buildJs.replace(quizRegex, `const defaultOpen = isQuiz ? '' : 'open';
      masonryHtml += \`
        <details class="\${classes.join(' ')}" \${defaultOpen}>
          <summary class="card-header">\${h3}</summary>
          <div class="card-body">\${contentParts}</div>
        </details>\`;`);

    fs.writeFileSync('build.js', buildJs);
    console.log('Fixed build.js');

    // 2. Fix style.css: change quiz-card summary to card summary and add table styles
    let styleCss = fs.readFileSync(path.join('src', 'assets', 'style.css'), 'utf-8');
    styleCss = styleCss.replace(/details\.quiz-card/g, 'details.card');
    
    if (!styleCss.includes('table {')) {
      styleCss += `

/* Table Styling */
.card-body table {
  width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 0.95rem;
  border-radius: 8px; overflow: hidden; box-shadow: 0 0 0 1px var(--border);
}
.card-body th, .card-body td {
  padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border);
}
.card-body th { background: #f1f5f9; font-weight: 600; color: var(--text-main); }
.card-body tr:last-child td { border-bottom: none; }
.card-body tr:nth-child(even) { background: #f8fafc; }
.card-body tr:hover { background: #f1f5f9; }
`;
    }
    fs.writeFileSync(path.join('src', 'assets', 'style.css'), styleCss);
    console.log('Fixed style.css');

    // 3. Fix main.js: Add PJAX (no page refresh) logic and sidebar scroll restore
    let mainJs = fs.readFileSync(path.join('src', 'assets', 'main.js'), 'utf-8');
    if (!mainJs.includes('initNavigation')) {
      mainJs += `

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
`;
      // We also need to extract `highlightTextInDOM` out of the IIFE if it is inside it, 
      // but instead we can let navigateTo find it if it's there. Actually, let's expose it to window:
      mainJs = mainJs.replace('function highlightTextInDOM', 'window.highlightTextInDOM = function highlightTextInDOM');
      mainJs = mainJs.replace('highlightTextInDOM(', 'window.highlightTextInDOM(');
    }
    fs.writeFileSync(path.join('src', 'assets', 'main.js'), mainJs);
    console.log('Fixed main.js');

  } catch (e) {
    console.error(e);
  }
}

fix();
