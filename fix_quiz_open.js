const fs = require('fs');
let build = fs.readFileSync('build.js', 'utf8');

build = build.replace(
  /const defaultOpen = isQuiz \? '' : 'open';/,
  `const defaultOpen = 'open';`
);

fs.writeFileSync('build.js', build);
