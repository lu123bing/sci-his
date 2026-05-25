const fs = require('fs');

let style = fs.readFileSync('src/assets/style.css', 'utf8');

// 1. Expand the max width of the content area so columns have room to breathe
style = style.replace(
  /max-width: 1400px; margin: 0 auto;/,
  `max-width: 1800px; margin: 0 auto;`
);

// 2. Adjust media query breakpoints for even wider columns
style = style.replace(
  /@media \(min-width: 900px\) \{ \.masonry-grid \{ grid-template-columns: repeat\(2, 1fr\); \} \}/,
  `@media (min-width: 1000px) { .masonry-grid { grid-template-columns: repeat(2, 1fr); } }`
);
style = style.replace(
  /@media \(min-width: 1400px\) \{ \.masonry-grid \{ grid-template-columns: repeat\(3, 1fr\); \} \}/,
  `@media (min-width: 1600px) { .masonry-grid { grid-template-columns: repeat(3, 1fr); } }`
);
style = style.replace(
  /@media \(min-width: 1900px\) \{ \.masonry-grid \{ grid-template-columns: repeat\(4, 1fr\); \} \}/,
  `@media (min-width: 2200px) { .masonry-grid { grid-template-columns: repeat(4, 1fr); } }`
);

// For collapsed sidebar
style = style.replace(
  /@media \(min-width: 900px\) \{ \.container:has\(\.sidebar\.collapsed\) \.masonry-grid \{ grid-template-columns: repeat\(3, 1fr\); \} \}/,
  `@media (min-width: 1000px) { .container:has(.sidebar.collapsed) .masonry-grid { grid-template-columns: repeat(3, 1fr); } }`
);
style = style.replace(
  /@media \(min-width: 1400px\) \{ \.container:has\(\.sidebar\.collapsed\) \.masonry-grid \{ grid-template-columns: repeat\(4, 1fr\); \} \}/,
  `@media (min-width: 1600px) { .container:has(.sidebar.collapsed) .masonry-grid { grid-template-columns: repeat(4, 1fr); } }`
);
style = style.replace(
  /@media \(min-width: 1900px\) \{ \.container:has\(\.sidebar\.collapsed\) \.masonry-grid \{ grid-template-columns: repeat\(5, 1fr\); \} \}/,
  `@media (min-width: 2200px) { .container:has(.sidebar.collapsed) .masonry-grid { grid-template-columns: repeat(5, 1fr); } }`
);

fs.writeFileSync('src/assets/style.css', style);
console.log('Done modifying breakpoints and max.width.');
