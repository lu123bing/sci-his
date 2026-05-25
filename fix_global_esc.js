const fs = require('fs');

let main = fs.readFileSync('src/assets/main.js', 'utf8');

// Also inject an Escape key handler into the global shortcut listener
const insertPoint = `if (e.key === 'f' || e.key === 'F') {`;
const newLogic = `if (e.key === 'Escape') {
      const searchResults = document.getElementById('search-results');
      const searchInput = document.getElementById('search-input');
      if (searchResults && !searchResults.classList.contains('hidden')) {
        searchResults.classList.add('hidden');
        searchInput.blur();
      }
    } else if (e.key === 'f' || e.key === 'F') {`;

main = main.replace(insertPoint, newLogic);
fs.writeFileSync('src/assets/main.js', main);
