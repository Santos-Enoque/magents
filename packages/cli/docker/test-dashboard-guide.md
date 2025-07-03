# Dashboard Testing Guide

## Quick Start Testing

### 1. Start the Dashboard
```bash
cd /Users/santossafrao/Development/personal/magents/packages/web
npm run dev
```
This will start the dashboard on http://localhost:3001

### 2. Manual Testing Checklist

#### Core Features
- [ ] **Dashboard loads** - Navigate to http://localhost:3001
- [ ] **Connection status** - Check "Connected" or "Disconnected" indicator
- [ ] **View toggle** - Try grid/list view buttons in top right
- [ ] **System metrics** - Verify Live System Metrics section shows data
- [ ] **Progressive disclosure** - Expand/collapse "System Overview" section

#### Quick Actions
- [ ] **Create Agent** - Click blue "Create Agent" button
- [ ] **Terminal** - Click "Terminal" button (should open terminal page)
- [ ] **Settings** - Click "Settings" button
- [ ] **Bulk actions** - Click "Show Bulk Actions" to reveal more options

#### Keyboard Shortcuts (Power User Features)
- [ ] **Help modal** - Press `Ctrl+?` to show shortcuts help
- [ ] **Create agent** - Press `Ctrl+N` 
- [ ] **Terminal** - Press `Ctrl+T`
- [ ] **Toggle view** - Press `Ctrl+V` to switch grid/list
- [ ] **Refresh** - Press `Ctrl+R`
- [ ] **Close modal** - Press `Escape` to close help modal

#### Real-time Features
- [ ] **Live metrics** - Check CPU, Memory, Network I/O update
- [ ] **Connection type** - Verify shows "WebSocket" or "SSE"
- [ ] **Agent status** - Create/start/stop agents to see real-time updates

#### Responsive Design
- [ ] **Mobile view** - Resize browser to mobile width (375px)
- [ ] **Tablet view** - Test medium screen size (768px)
- [ ] **Desktop view** - Test large screen (1200px+)

### 3. Automated Testing

#### Run Playwright Tests
```bash
cd /Users/santossafrao/Development/personal/magents
node debug-dashboard.js
```

#### Run Simple Test
```bash
cd /Users/santossafrao/Development/personal/magents
./test-dashboard-simple.sh
```

### 4. Demo Mode Testing

If backend isn't available, the dashboard automatically enters demo mode:
- [ ] **Demo data** - Verify mock agents appear
- [ ] **Demo actions** - Test creating/starting/stopping agents
- [ ] **Demo terminal** - Test terminal functionality
- [ ] **Demo metrics** - Check live metrics show realistic data

### 5. Advanced Testing

#### Test All Agent Operations
1. Create new agent
2. Start agent
3. Stop agent  
4. Attach to agent
5. Delete agent
6. Bulk start all
7. Bulk stop all
8. Restart all
9. Clean up stopped

#### Test Terminal Integration
1. Open terminal from dashboard
2. Test WebSocket connection
3. Try fullscreen mode
4. Test terminal themes
5. Check terminal persistence

#### Test Error Handling
1. Disconnect from internet
2. Stop backend server
3. Verify demo mode activates
4. Check error messages
5. Test reconnection

### 6. Performance Testing

#### Load Testing
- [ ] **Multiple agents** - Test with 10+ agents
- [ ] **Real-time updates** - Monitor performance with live data
- [ ] **Memory usage** - Check for memory leaks
- [ ] **Network requests** - Monitor API calls

#### Browser Compatibility
- [ ] **Chrome/Chromium** - Primary testing browser
- [ ] **Firefox** - Secondary testing
- [ ] **Safari** - macOS testing
- [ ] **Mobile browsers** - iOS/Android testing

### 7. Expected Test Results

#### ✅ All Features Working
- Single-page layout with unified navigation
- Progressive disclosure sections expand/collapse
- Real-time metrics update every 5 seconds
- Keyboard shortcuts respond immediately
- Responsive design adapts to screen size
- Demo mode provides full functionality
- Error handling gracefully manages failures

#### 🚨 Known Limitations
- Terminal requires WebSocket connection
- Some features need backend for full functionality
- Bundle size warning (optimization opportunity)
- Real-time updates depend on SSE/WebSocket support

### 8. Troubleshooting

#### Dashboard Won't Load
1. Check `packages/web` directory exists
2. Run `npm install` in web package
3. Verify port 3001 is available
4. Check for TypeScript compilation errors

#### Features Not Working
1. Open browser DevTools (F12)
2. Check Console for errors
3. Verify API endpoints in Network tab
4. Check if demo mode is active

#### Performance Issues
1. Monitor memory usage in DevTools
2. Check for console warnings
3. Verify network requests are efficient
4. Test with fewer agents

### 9. Quick Test Commands

```bash
# Start everything
cd /Users/santossafrao/Development/personal/magents/packages/web
npm run dev

# Test in another terminal
cd /Users/santossafrao/Development/personal/magents
node debug-dashboard.js

# Manual browser test
open http://localhost:3001
```

## Testing Completed Features

### ✅ Task 25.1 - Unified Dashboard
- Single-page layout with agent cards
- Grid and list view modes
- Real-time agent status indicators

### ✅ Task 25.2 - Collapsible Sections  
- Progressive disclosure interface
- Smooth expand/collapse animations
- Organized content sections

### ✅ Task 25.3 - Quick Actions
- Create, start, stop, assign tasks buttons
- Bulk operations (start all, stop all, restart all)
- Loading states and error handling

### ✅ Task 25.4 - Terminal Integration
- xterm.js professional terminal
- WebSocket connections
- Fullscreen mode
- Terminal themes

### ✅ Task 25.5 - Real-time Updates
- Server-Sent Events implementation
- Live system metrics
- WebSocket fallback
- Connection status indicators

### ✅ Task 25.6 - Keyboard Shortcuts
- Comprehensive shortcut system
- Help modal with all shortcuts
- Power user workflow support
- Visual shortcut hints

### ✅ Task 25.7 - Responsive Design
- Mobile-first approach
- Adaptive layouts
- Touch-friendly controls
- Multiple viewport support

### ✅ Task 25.8 - Comprehensive Testing
- Playwright automated testing
- Demo mode for testing without backend
- Error handling validation
- Performance verification

All 8 subtasks completed and ready for testing!