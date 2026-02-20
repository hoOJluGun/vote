# CEL Web IDE - Cognitive Execution Layer Web Interface

A modern, feature-rich web-based IDE inspired by VS Code, Cursor, and JetBrains, with integrated AI assistant capabilities.

## Features

### 🎨 Modern UI/UX
- VS Code-inspired dark theme with customizable accent colors
- Responsive design with smooth animations and transitions
- Intuitive file explorer with collapsible folders
- Multi-tab editor interface

### 💬 Advanced AI Assistant
- Integrated chat panel with conversation history
- Model selection (GPT-4, Claude, Llama, etc.)
- Adjustable temperature and token settings
- Context attachment (current file, project structure)
- Wave typing animation for realistic AI responses
- Code explanation and generation capabilities

### 📝 Smart Editor
- Syntax highlighting for multiple languages
- Real-time line numbers and cursor positioning
- Auto-save functionality with visual indicators
- Code folding and minimap support
- IntelliSense-like autocompletion

### 🔧 Developer Tools
- Integrated terminal emulator
- Git status integration
- Debugging controls
- Performance monitoring
- Build and run commands

### 🎯 Project Management
- File explorer with search functionality
- Project structure visualization
- Quick file creation and management
- Recent files and favorites

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Navigate to the web IDE directory
cd ide/web-ide

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The IDE will be available at `http://localhost:3000`

## Architecture

### Core Components
- **App.tsx** - Main application layout and routing
- **Editor.tsx** - Code editor with syntax highlighting
- **ChatPanel.tsx** - AI assistant interface
- **FileExplorer.tsx** - Project file navigation
- **StatusBar.tsx** - System status and indicators

### State Management
Uses Zustand for lightweight, scalable state management:
- File operations (open, close, save)
- Chat conversations and settings
- IDE preferences and configuration
- UI state and visibility toggles

### Styling
Built with Tailwind CSS featuring:
- Custom design tokens for consistent theming
- Component-based utility classes
- Responsive breakpoints
- Smooth animations and transitions

## Key Features Explained

### AI Assistant Integration
The chat panel provides:
- Natural language code understanding
- Context-aware responses using file/project context
- Code generation and refactoring suggestions
- Interactive debugging assistance
- Documentation generation

### File Management
- Real-time file system monitoring
- Drag-and-drop file operations
- Quick search and filtering
- Recent files tracking
- Favorites and bookmarks

### Editor Capabilities
- Multi-language syntax highlighting
- Intelligent code completion
- Error detection and linting
- Code formatting and beautification
- Version control integration

## Customization

### Theme Configuration
Modify `src/index.css` to customize:
- Color schemes and accents
- Typography and spacing
- Component styling
- Animation timings

### Adding New Features
1. Create new components in `src/components/`
2. Update state management in `src/stores/`
3. Add routes in `App.tsx`
4. Configure styling with Tailwind classes

## Development Roadmap

### Phase 1 ✅ (Current)
- Basic IDE interface
- File explorer and editor
- AI chat integration
- Core functionality

### Phase 2 🚀 (Coming Soon)
- Plugin system architecture
- Advanced debugging tools
- Version control integration
- Collaboration features

### Phase 3 🎯 (Future)
- Cloud synchronization
- Mobile responsiveness
- AI-powered code analysis
- Custom AI model integration

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Inspired by VS Code, Cursor, and JetBrains IDEs
- Built with React, TypeScript, and Tailwind CSS
- Icons from Lucide React
- State management powered by Zustand