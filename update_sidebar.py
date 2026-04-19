#!/usr/bin/env python3
"""
Script to add account settings link to sidebar
"""

# Read the sidebar file
with open('/app/src/app/components/layout/sidebar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Account link HTML to insert (mobile)
account_link_mobile = '''              <div 
                onClick={() => handleNav('/account')}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                  location.pathname === '/account' ? 'bg-[#0d0d12] dark:bg-[#262626] text-[#fafafa] dark:text-[#fafafa]' : 'text-[#36394a] dark:text-[#d4d4d4] hover:bg-[#f5f5f5] dark:hover:bg-[#404040]'
                }`}
              >
                <User size={20} className="stroke-[1.5px]" />
                <span className="text-sm font-medium">הגדרות חשבון</span>
              </div>
'''

# Account link HTML to insert (desktop collapsed)
account_link_desktop_collapsed = '''                <div 
                  onClick={() => handleNav('/account')}
                  className={`flex items-center justify-center p-2.5 cursor-pointer transition-colors rounded-md mx-1 ${
                    location.pathname === '/account' ? 'bg-[#0d0d12] dark:bg-[#262626] text-[#fafafa] dark:text-[#fafafa]' : 'text-[#36394a] dark:text-[#d4d4d4] hover:bg-[#f5f5f5] dark:hover:bg-[#404040]'
                  }`}
                  title="הגדרות חשבון"
                >
                  <User size={20} className="stroke-[1.5px]" />
                </div>
'''

# Account link HTML to insert (desktop expanded)
account_link_desktop_expanded = '''                <div 
                  onClick={() => handleNav('/account')}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                    location.pathname === '/account' ? 'bg-[#0d0d12] dark:bg-[#262626] text-[#fafafa] dark:text-[#fafafa]' : 'text-[#36394a] dark:text-[#d4d4d4] hover:bg-[#f5f5f5] dark:hover:bg-[#404040]'
                  }`}
                >
                  <User size={20} className="stroke-[1.5px]" />
                  <span className="text-sm font-medium">הגדרות חשבון</span>
                </div>
'''

# Find and replace - Mobile Menu
mobile_pattern = '''              </div>
              <div 
                onClick={() => handleNav('/settings')}'''

mobile_replacement = '''              </div>
''' + account_link_mobile + '''              <div 
                onClick={() => handleNav('/settings')}'''

content = content.replace(mobile_pattern, mobile_replacement, 1)

# Find and replace - Desktop Collapsed
desktop_collapsed_pattern = '''                </div>
                <div 
                  onClick={() => handleNav('/help')}
                  className={`flex items-center justify-center p-2.5 cursor-pointer transition-colors rounded-md mx-1 ${
                    location.pathname === '/help''''

desktop_collapsed_replacement = '''                </div>
''' + account_link_desktop_collapsed + '''                <div 
                  onClick={() => handleNav('/help')}
                  className={`flex items-center justify-center p-2.5 cursor-pointer transition-colors rounded-md mx-1 ${
                    location.pathname === '/help''''

content = content.replace(desktop_collapsed_pattern, desktop_collapsed_replacement, 1)

# Find and replace - Desktop Expanded
desktop_expanded_pattern = '''                </div>
                <div 
                  onClick={() => handleNav('/help')}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors mt-1 ${
                    location.pathname === '/help''''

desktop_expanded_replacement = '''                </div>
''' + account_link_desktop_expanded + '''                <div 
                  onClick={() => handleNav('/help')}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors mt-1 ${
                    location.pathname === '/help''''

content = content.replace(desktop_expanded_pattern, desktop_expanded_replacement, 1)

# Write the updated content
with open('/app/src/app/components/layout/sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Successfully added account settings link to sidebar in all 3 locations!")
