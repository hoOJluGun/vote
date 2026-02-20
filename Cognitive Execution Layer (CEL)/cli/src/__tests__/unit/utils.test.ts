import fs from 'fs/promises';
import { FileUtils, GitUtils, Logger } from '../../utils';

// Mock fs module
jest.mock('fs/promises');

describe('FileUtils', () => {
  const mockFilePath = '/test/file.js';
  const mockContent = 'console.log("test");';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('readFile', () => {
    test('should read file content successfully', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);
      
      const result = await FileUtils.readFile(mockFilePath);
      
      expect(fs.readFile).toHaveBeenCalledWith(mockFilePath, 'utf8');
      expect(result).toBe(mockContent);
    });

    test('should throw error when file reading fails', async () => {
      const errorMessage = 'File not found';
      (fs.readFile as jest.Mock).mockRejectedValue(new Error(errorMessage));
      
      await expect(FileUtils.readFile(mockFilePath))
        .rejects
        .toThrow(`Failed to read file ${mockFilePath}: ${errorMessage}`);
    });
  });

  describe('writeFile', () => {
    test('should write file content successfully', async () => {
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      
      await FileUtils.writeFile(mockFilePath, mockContent);
      
      expect(fs.writeFile).toHaveBeenCalledWith(mockFilePath, mockContent, 'utf8');
    });

    test('should throw error when file writing fails', async () => {
      const errorMessage = 'Permission denied';
      (fs.writeFile as jest.Mock).mockRejectedValue(new Error(errorMessage));
      
      await expect(FileUtils.writeFile(mockFilePath, mockContent))
        .rejects
        .toThrow(`Failed to write file ${mockFilePath}: ${errorMessage}`);
    });
  });

  describe('fileExists', () => {
    test('should return true when file exists', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      
      const result = await FileUtils.fileExists(mockFilePath);
      
      expect(result).toBe(true);
      expect(fs.access).toHaveBeenCalledWith(mockFilePath);
    });

    test('should return false when file does not exist', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));
      
      const result = await FileUtils.fileExists(mockFilePath);
      
      expect(result).toBe(false);
    });
  });

  describe('createBackup', () => {
    test('should create backup with timestamp', async () => {
      const originalContent = 'original content';
      const backupPath = `${mockFilePath}.backup.${Date.now()}`;
      
      (fs.readFile as jest.Mock).mockResolvedValue(originalContent);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      
      // Mock Date.now to return predictable value
      const mockTimestamp = 1234567890;
      jest.spyOn(global.Date, 'now').mockImplementation(() => mockTimestamp);
      
      const result = await FileUtils.createBackup(mockFilePath);
      
      expect(result).toBe(`${mockFilePath}.backup.${mockTimestamp}`);
      expect(fs.readFile).toHaveBeenCalledWith(mockFilePath, 'utf8');
      expect(fs.writeFile).toHaveBeenCalledWith(
        `${mockFilePath}.backup.${mockTimestamp}`,
        originalContent,
        'utf8'
      );
    });
  });
});

describe('Logger', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('should log info messages with info icon', () => {
    Logger.info('Test info message');
    expect(console.log).toHaveBeenCalledWith('\x1b[36mℹ\x1b[0m Test info message');
  });

  test('should log success messages with checkmark', () => {
    Logger.success('Test success message');
    expect(console.log).toHaveBeenCalledWith('\x1b[32m✔\x1b[0m Test success message');
  });

  test('should log warning messages with warning icon', () => {
    Logger.warn('Test warning message');
    expect(console.log).toHaveBeenCalledWith('\x1b[33m⚠\x1b[0m Test warning message');
  });

  test('should log error messages with cross', () => {
    Logger.error('Test error message');
    expect(console.log).toHaveBeenCalledWith('\x1b[31m✘\x1b[0m Test error message');
  });

  test('should log debug messages in gray', () => {
    Logger.debug('Test debug message');
    expect(console.log).toHaveBeenCalledWith('\x1b[90m🐛 Test debug message\x1b[0m');
  });
});