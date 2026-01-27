const fs = require('fs');

// Read server.js
let content = fs.readFileSync('./server.js', 'utf8');

// Function to replace ? with $1, $2, $3... within a line
function replacePlaceholders(line) {
  let count = 0;
  return line.replace(/\?/g, () => {
    count++;
    return `$${count}`;
  });
}

// Split into lines and process each
const lines = content.split('\n');
const newLines = lines.map(line => replacePlaceholders(line));

// Write back
fs.writeFileSync('./server.js', newLines.join('\n'), 'utf8');

console.log('Converted all ? to $n placeholders for PostgreSQL');
