/**
 * Script to add account settings link to sidebar
 * 
 * To run: node add-account-to-sidebar.js
 */

const fs = require('fs');
const path = require('path');

const sidebarPath = path.join(__dirname, 'src/app/components/layout/sidebar.tsx');

// Read the file
let content = fs.readFileSync(sidebarPath, 'utf8');

// Account link for mobile menu
const accountLinkMobile = `              <div 
                onClick={() => handleNav('/account')}
                className={\`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors \${
                  location.pathname === '/account' ? 'bg-[#0d0d12] dark:bg-[#262626] text-[#fafafa] dark:text-[#fafafa]' : 'text-[#36394a] dark:text-[#d4d4d4] hover:bg-[#f5f5f5] dark:hover:bg-[#404040]'
                }\`}
              >
                <User size={20} className="stroke-[1.5px]" />
                <span className="text-sm font-medium">הגדרות חשבון</span>
              </div>
`;

// Account link for desktop collapsed
const accountLinkCollapsed = `                <div 
                  onClick={() => handleNav('/account')}
                  className={\`flex items-center justify-center p-2.5 cursor-pointer transition-colors rounded-md mx-1 \${
                    location.pathname === '/account' ? 'bg-[#0d0d12] dark:bg-[#262626] text-[#fafafa] dark:text-[#fafafa]' : 'text-[#36394a] dark:text-[#d4d4d4] hover:bg-[#f5f5f5] dark:hover:bg-[#404040]'
                  }\`}
                  title="הגדרות חשבון"
                >
                  <User size={20} className="stroke-[1.5px]" />
                </div>
`;

// Account link for desktop expanded
const accountLinkExpanded = `                <div 
                  onClick={() => handleNav('/account')}
                  className={\`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors \${
                    location.pathname === '/account' ? 'bg-[#0d0d12] dark:bg-[#262626] text-[#fafafa] dark:text-[#fafafa]' : 'text-[#36394a] dark:text-[#d4d4d4] hover:bg-[#f5f5f5] dark:hover:bg-[#404040]'
                  }\`}
                >
                  <User size={20} className="stroke-[1.5px]" />
                  <span className="text-sm font-medium">הגדרות חשבון</span>
                </div>
`;

// Replace patterns
const lines = content.split('\n');
const newLines = [];
let mobileAdded = false;
let collapsedAdded = false;
let expandedAdded = false;

for (let i = 0; i < lines.length; i++) {
  newLines.push(lines[i]);
  
  // Mobile menu - add after "מראה" div closes
  if (!mobileAdded && 
      lines[i].includes('</div>') && 
      i > 0 && lines[i-1].includes('מראה') &&
      i < lines.length - 1 && lines[i+1].includes("onClick={() => handleNav('/settings')")) {
    newLines.push(accountLinkMobile);
    mobileAdded = true;
    console.log('✅ Added account link to mobile menu');
  }
  
  // Desktop collapsed - add after settings icon div
  if (!collapsedAdded &&
      lines[i].includes('</div>') &&
      i > 0 && lines[i-1].includes('<Settings size={20}') &&
      i < lines.length - 1 && lines[i+1].includes('<div') &&
      lines[i+2] && lines[i+2].includes("onClick={() => handleNav('/help')")) {
    newLines.push(accountLinkCollapsed);
    collapsedAdded = true;
    console.log('✅ Added account link to desktop collapsed menu');
  }
  
  // Desktop expanded - add after settings div with text
  if (!expandedAdded &&
      lines[i].includes('</div>') &&
      i > 0 && lines[i-1].includes('הגדרות מערכת') &&
      i < lines.length - 1 && lines[i+1].includes('<div') &&
      lines[i+2] && lines[i+2].includes("onClick(() => handleNav('/help')") &&
      lines[i+3] && lines[i+3].includes('mt-1')) {
    newLines.push(accountLinkExpanded);
    expandedAdded = true;
    console.log('✅ Added account link to desktop expanded menu');
  }
}

// Write back
fs.writeFileSync(sidebarPath, newLines.join('\n'), 'utf8');

console.log('\n🎉 Successfully updated sidebar.tsx!');
console.log(`   - Mobile menu: ${mobileAdded ? '✅' : '❌'}`);
console.log(`   - Desktop collapsed: ${collapsedAdded ? '✅' : '❌'}`);
console.log(`   - Desktop expanded: ${expandedAdded ? '✅' : '❌'}`);
