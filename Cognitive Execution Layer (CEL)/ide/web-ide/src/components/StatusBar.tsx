import React from 'react';
import { Wifi, Battery, Cpu, HardDrive, GitBranch, Bell } from 'lucide-react';
import { useIDEStore } from '../stores/ideStore';

const StatusBar = () => {
  const { activeFile, files } = useIDEStore();
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getGitStatus = () => {
    // Mock git status
    return {
      branch: 'main',
      changes: 3,
      status: 'modified'
    };
  };

  const gitStatus = getGitStatus();

  return (
    <div className="flex items-center justify-between px-4 py-1 bg-tabbar-dark border-t border-border-dark text-xs text-gray-500">
      {/* Left Section */}
      <div className="flex items-center space-x-6">
        {/* Git Status */}
        <div className="flex items-center space-x-2">
          <GitBranch className="w-3 h-3" />
          <span className={gitStatus.changes > 0 ? 'text-yellow-400' : 'text-gray-500'}>
            {gitStatus.branch}
          </span>
          {gitStatus.changes > 0 && (
            <span className="bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded text-xs">
              {gitStatus.changes}
            </span>
          )}
        </div>

        {/* File Encoding */}
        <span>UTF-8</span>
        
        {/* Line Endings */}
        <span>LF</span>

        {/* Language Mode */}
        {activeFile && (
          <span className="text-gray-400">
            {activeFile.language.toUpperCase()}
          </span>
        )}
      </div>

      {/* Center Section - Notifications */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Bell className="w-3 h-3 text-gray-500" />
          <span className="text-gray-500">0</span>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-6">
        {/* AI Status */}
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-green-400">AI Ready</span>
        </div>

        {/* Performance Indicators */}
        <div className="flex items-center space-x-2">
          <Cpu className="w-3 h-3 text-gray-500" />
          <span>12%</span>
        </div>

        <div className="flex items-center space-x-2">
          <HardDrive className="w-3 h-3 text-gray-500" />
          <span>45%</span>
        </div>

        {/* Network Status */}
        <div className="flex items-center space-x-1">
          <Wifi className="w-3 h-3 text-green-400" />
          <span className="text-green-400">Online</span>
        </div>

        {/* Battery Status */}
        <div className="flex items-center space-x-1">
          <Battery className="w-3 h-3 text-green-400" />
          <span>87%</span>
        </div>

        {/* Current Time */}
        <span className="font-mono">{formatTime(currentTime)}</span>
      </div>
    </div>
  );
};

export default StatusBar;