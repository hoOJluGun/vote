import fs from 'fs/promises';
import path from 'path';
import { GitChanges } from '../types';

export class FileUtils {
  static async readFile(filePath: string): Promise<string> {
    try {
      const fullPath = path.resolve(filePath);
      return await fs.readFile(fullPath, 'utf8');
    } catch (error: any) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  static async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const fullPath = path.resolve(filePath);
      await fs.writeFile(fullPath, content, 'utf8');
    } catch (error: any) {
      throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
  }

  static async createBackup(filePath: string): Promise<string> {
    try {
      const content = await this.readFile(filePath);
      const backupPath = `${filePath}.backup.${Date.now()}`;
      await this.writeFile(backupPath, content);
      return backupPath;
    } catch (error: any) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(path.resolve(filePath));
      return true;
    } catch {
      return false;
    }
  }
}

export class GitUtils {
  static async getChanges(): Promise<GitChanges> {
    try {
      // This would use actual git commands in real implementation
      // For now returning mock data
      return {
        modified: ['src/index.js', 'package.json'],
        added: ['new-feature.js'],
        deleted: []
      };
    } catch (error: any) {
      throw new Error(`Failed to get git changes: ${error.message}`);
    }
  }

  static async commit(message: string): Promise<void> {
    try {
      // This would execute actual git commit
      console.log(`Would commit with message: ${message}`);
    } catch (error: any) {
      throw new Error(`Failed to commit: ${error.message}`);
    }
  }
}

export class Logger {
  static info(message: string): void {
    console.log(`\x1b[36mℹ\x1b[0m ${message}`);
  }

  static success(message: string): void {
    console.log(`\x1b[32m✔\x1b[0m ${message}`);
  }

  static warn(message: string): void {
    console.log(`\x1b[33m⚠\x1b[0m ${message}`);
  }

  static error(message: string): void {
    console.log(`\x1b[31m✘\x1b[0m ${message}`);
  }

  static debug(message: string): void {
    console.log(`\x1b[90m🐛 ${message}\x1b[0m`);
  }
}