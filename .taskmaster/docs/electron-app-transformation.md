# Magents Electron App Transformation PRD

## Overview
Transform the existing Magents web interface into a native Electron desktop application with macOS-native design patterns, improved visual hierarchy, and enhanced user experience.

## Goals
1. Create a fully functional Electron desktop application
2. Implement native macOS design language and interactions
3. Update color palette for better visual hierarchy while maintaining dark theme
4. Add native menu bar and dock integration
5. Implement native notifications and system integration
6. Ensure cross-platform compatibility (macOS, Windows, Linux)

## Design Requirements

### Color Palette Update
- **Background Colors**:
  - Main background: #1A1B1E (softer than pure black)
  - Secondary background: #25262B
  - Tertiary background: #2C2E33
  - Panel borders: #373A40
- **Accent Colors**:
  - Primary: #339AF0 (system blue)
  - Success: #51CF66
  - Warning: #FFD43B
  - Error: #FF6B6B
  - Info: #4DABF7
- **Text Colors**:
  - Primary text: #ECECEC
  - Secondary text: #ADB5BD
  - Disabled text: #6C757D

### Native macOS Design Elements
- Traffic light window controls (close, minimize, maximize)
- Vibrancy effects for sidebars and panels
- Native context menus
- macOS-style tooltips and popovers
- System font stack (SF Pro Display/Text)
- Native scrollbars
- Rounded corners (8px for panels, 12px for modals)
- Subtle shadows and depth layers

### Status Bar & Quick Actions
- Fixed bottom status bar (32px height)
- Quick action buttons:
  - New Agent (⌘N)
  - Start/Stop All Agents
  - View Mode Toggle
  - Connection Status
  - System Resource Monitor
  - Notification Center
- Real-time metrics display
- Keyboard shortcut hints

## Technical Architecture

### Electron Setup
1. Main process architecture
2. Renderer process with React
3. IPC communication patterns
4. Window management
5. Auto-updater integration
6. Code signing and notarization

### Core Features

#### 1. Application Shell
- Custom title bar with integrated controls
- Native menu bar with full menu structure
- Dock icon with badge notifications
- System tray integration
- Multi-window support

#### 2. Window Management
- Remember window size/position
- Full-screen support
- Multiple workspace support
- Window snapping
- Picture-in-picture for terminal windows

#### 3. File System Integration
- Native file dialogs
- Drag & drop support
- Recent files menu
- Quick Look integration (macOS)
- File associations

#### 4. System Integration
- Native notifications
- System clipboard integration
- Global keyboard shortcuts
- Touch Bar support (macOS)
- Dark/Light mode auto-switching

#### 5. Performance Optimizations
- Lazy loading of components
- Virtual scrolling for large lists
- Background process management
- Memory usage optimization
- GPU acceleration

### Component Updates

#### 1. Sidebar Enhancement
- Collapsible with animation
- Vibrancy background effect
- Section headers with counts
- Drag-to-reorder agents
- Quick filters
- Search functionality

#### 2. Agent Cards Redesign
- Elevated card design with shadows
- Status indicators with animations
- Quick action buttons on hover
- Resource usage graphs
- Terminal preview thumbnail
- Drag handle for reordering

#### 3. Terminal Integration
- Native terminal performance
- Split pane support
- Tab management
- Theme customization
- Font preferences
- Copy/paste improvements

#### 4. Configuration Panels
- Native form controls
- Segmented controls for options
- Slider components
- Color pickers
- Path selection with native dialogs

#### 5. Onboarding & Setup
- First-launch experience
- Guided setup wizard
- Docker detection and setup
- Claude auth configuration
- Sample project creation

### Security & Distribution

#### 1. Security
- Code signing certificates
- Notarization for macOS
- Sandbox restrictions
- Secure storage for credentials
- CSP policies

#### 2. Distribution
- Auto-updater with delta updates
- DMG installer for macOS
- MSI installer for Windows
- AppImage/Snap for Linux
- Homebrew cask formula
- App Store submission (future)

#### 3. Build Pipeline
- GitHub Actions CI/CD
- Multi-platform builds
- Automated testing
- Release management
- Version tracking

### Testing Requirements

#### 1. Unit Testing
- Electron main process tests
- React component tests
- IPC communication tests
- Integration tests

#### 2. E2E Testing
- Spectron/Playwright setup
- Cross-platform testing
- Performance benchmarks
- Memory leak detection

#### 3. Manual Testing
- Installation flow
- Update process
- System integration
- Accessibility testing

### Accessibility
- Full keyboard navigation
- Screen reader support
- High contrast mode
- Reduced motion support
- Focus indicators
- ARIA labels

### Performance Targets
- Startup time: < 2 seconds
- Memory usage: < 200MB idle
- CPU usage: < 5% idle
- Smooth 60fps animations
- Instant UI responses

## Implementation Phases

### Phase 1: Electron Foundation
- Basic Electron setup
- Main/renderer architecture
- Window management
- Development environment

### Phase 2: UI Migration
- Port existing React components
- Update styling for native look
- Implement new color palette
- Add native controls

### Phase 3: System Integration
- Menu bar implementation
- Keyboard shortcuts
- File system integration
- Native dialogs

### Phase 4: Enhanced Features
- Multi-window support
- Advanced terminal features
- System tray
- Notifications

### Phase 5: Polish & Distribution
- Performance optimization
- Auto-updater
- Installers
- Documentation

### Phase 6: App Store Preparation
- Sandboxing
- App Store guidelines
- Marketing materials
- Beta testing

## Success Metrics
- App startup time < 2s
- Memory usage < 200MB
- User satisfaction > 4.5/5
- Zero critical security issues
- 95% crash-free sessions
- Native feel score > 90%

## Timeline
- Total estimated time: 8-10 weeks
- Phase 1-2: 3 weeks
- Phase 3-4: 3 weeks
- Phase 5-6: 2-4 weeks

## Dependencies
- Electron framework
- electron-builder
- electron-updater
- Native modules for system integration
- Code signing certificates
- CI/CD infrastructure