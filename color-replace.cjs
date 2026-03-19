const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

// Replace dark zinc buttons with vibrant violet
content = content.replace(/bg-zinc-900/g, 'bg-violet-600');
content = content.replace(/hover:bg-zinc-800/g, 'hover:bg-violet-700');
content = content.replace(/shadow-zinc-900\/20/g, 'shadow-violet-600/30');

// Replace emerald with rose for a warmer, bolder palette
content = content.replace(/emerald/g, 'rose');

// Replace blue with amber for warmth
content = content.replace(/blue-500/g, 'amber-500');
content = content.replace(/blue-50/g, 'amber-50');

// Replace text-zinc-900 with text-violet-950 for better harmony
content = content.replace(/text-zinc-900/g, 'text-violet-950');

fs.writeFileSync(appPath, content);
console.log('Replaced colors in App.tsx');
