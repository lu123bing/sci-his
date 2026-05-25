const fs = require('fs');
let style = fs.readFileSync('src/assets/style.css', 'utf8');

// remove standard content padding top
style = style.replace(
  /\.content \{\s*flex: 1; padding: 40px;\s*max-width: 1400px; margin: 0 auto;\s*\}/,
  `.content {\n  flex: 1; padding: 20px 40px 40px 40px;\n  max-width: 1400px; margin: 0 auto;\n}`
);

// fix sticky toolbar
style = style.replace(
  /\.top-toolbar \{\s*position: sticky;.*?border-bottom: 1px solid var\(--border\);\s*\}/s,
  `.top-toolbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: rgba(248, 250, 252, 0.95); /* matching --bg-color #f8fafc with slight opacity */
  backdrop-filter: blur(8px);
  padding: 15px 0;
  margin-top: -20px;
  margin-bottom: 25px;
  border-bottom: 1px solid var(--border);
}`
);

fs.writeFileSync('src/assets/style.css', style);
