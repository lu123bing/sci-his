const fs = require('fs');

// 1. Fix grid styling bounds in style.css
let style = fs.readFileSync('src/assets/style.css', 'utf8');

style = style.replace(
  /\.masonry-grid \{[\s\S]*?@media \(min-width: 1500px\) \{ \.container:has\(\.sidebar\.collapsed\) \.masonry-grid \{ grid-template-columns: repeat\(5, 1fr\); \} \}/,
  `.masonry-grid {
  display: grid;
  grid-template-columns: 1fr;
  align-items: start;
  gap: 24px;
}

@media (min-width: 900px) { .masonry-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1400px) { .masonry-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1900px) { .masonry-grid { grid-template-columns: repeat(4, 1fr); } }

/* Force +1 column when sidebar is collapsed */
.container:has(.sidebar.collapsed) .masonry-grid { grid-template-columns: repeat(2, 1fr); }
@media (min-width: 900px) { .container:has(.sidebar.collapsed) .masonry-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1400px) { .container:has(.sidebar.collapsed) .masonry-grid { grid-template-columns: repeat(4, 1fr); } }
@media (min-width: 1900px) { .container:has(.sidebar.collapsed) .masonry-grid { grid-template-columns: repeat(5, 1fr); } }`
);
fs.writeFileSync('src/assets/style.css', style);


// 2. Add keyboard shortcuts to main.js
let main = fs.readFileSync('src/assets/main.js', 'utf8');

const shortcutCode = `
  // Global Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
    
    if (!isInput) {
      if (e.key === 'f' || e.key === 'F') {
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
`;

if (!main.includes('Global Keyboard Shortcuts')) {
  main = main.replace(
    /function initNavigation\(\) \{/,
    'function initNavigation() {\n' + shortcutCode
  );
  fs.writeFileSync('src/assets/main.js', main);
}

console.log("Updated styles and main.js");
