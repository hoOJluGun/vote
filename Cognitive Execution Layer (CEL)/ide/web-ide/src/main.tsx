import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Mock some initial files for demonstration
const mockFiles = [
  {
    id: '1',
    name: 'App.jsx',
    content: `import React, { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Welcome to CEL Web IDE</h1>
      <p className="mb-4">Count: {count}</p>
      <button 
        onClick={() => setCount(count + 1)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Increment
      </button>
    </div>
  );
}

export default App;`,
    language: 'jsx',
    path: '/src/App.jsx',
    isDirty: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'index.css',
    content: `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}`,
    language: 'css',
    path: '/src/index.css',
    isDirty: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Initialize with mock files
// In a real app, this would come from a file system API
window.mockFiles = mockFiles;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);