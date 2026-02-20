import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

/**
 * Модуль анализа контекста проекта
 */
export class ProjectContextAnalyzer {
  /**
   * Получает структуру проекта
   */
  static async getProjectStructure(projectRoot) {
    try {
      // Получаем список файлов в проекте (рекурсивно до 3 уровней)
      const { stdout } = await execAsync(`find "${projectRoot}" -type f -not -path "*/node_modules/*" -not -path "*/\\.git/*" -not -path "*/\\.svn/*" -not -path "*/\\.hg/*" -not -path "*/\\.DS_Store" -not -path "*/__pycache__/*" -not -path "*/\\.build/*" -not -path "*/build/*" -not -path "*/dist/*" -not -path "*/\\.vscode/*" -not -path "*/\\.idea/*" | head -n 200`);
      const files = stdout.trim().split('\n').filter(f => f && !f.startsWith('find:'));
      
      // Группируем файлы по расширениям
      const fileGroups = {};
      files.forEach(file => {
        const ext = path.extname(file).substring(1) || 'other';
        if (!fileGroups[ext]) {
          fileGroups[ext] = [];
        }
        fileGroups[ext].push(path.relative(projectRoot, file));
      });
      
      return {
        projectRoot,
        totalFiles: files.length,
        fileGroups,
        files: files.slice(0, 100) // ограничиваем количество файлов
      };
    } catch (error) {
      console.error('Error getting project structure:', error.message);
      return {
        projectRoot,
        totalFiles: 0,
        fileGroups: {},
        files: []
      };
    }
  }

  /**
   * Получает последние изменения из Git
   */
  static async getGitChanges(projectRoot) {
    try {
      // Проверяем, является ли директория Git-репозиторием
      const gitDir = path.join(projectRoot, '.git');
      try {
        await fs.access(gitDir);
      } catch {
        // Если .git не существует, возвращаем пустой результат
        return {
          hasGit: false,
          diff: '',
          lastCommit: null
        };
      }

      // Получаем diff последнего коммита
      const { stdout: diff } = await execAsync(`cd "${projectRoot}" && git diff HEAD~1 HEAD`);
      
      // Получаем информацию о последнем коммите
      const { stdout: lastCommit } = await execAsync(`cd "${projectRoot}" && git log -1 --pretty=format:"%H|%an|%ae|%s|%ci"`);
      
      const [hash, author, email, subject, date] = lastCommit.split('|');
      
      return {
        hasGit: true,
        diff: diff.trim(),
        lastCommit: {
          hash,
          author,
          email,
          subject,
          date
        }
      };
    } catch (error) {
      console.error('Error getting Git changes:', error.message);
      return {
        hasGit: false,
        diff: '',
        lastCommit: null
      };
    }
  }

  /**
   * Получает метаданные проекта
   */
  static async getProjectMetadata(projectRoot) {
    try {
      // Определяем язык программирования по файлам
      const structure = await this.getProjectStructure(projectRoot);
      const languages = Object.keys(structure.fileGroups).filter(ext => {
        return ['js', 'ts', 'jsx', 'tsx', 'swift', 'm', 'mm', 'py', 'java', 'cpp', 'c', 'h', 'hpp', 'cs', 'go', 'rb', 'php', 'rs', 'kt', 'dart', 'vue', 'svelte'].includes(ext);
      });

      // Определяем тип проекта
      let projectType = 'unknown';
      if (languages.includes('swift') || languages.includes('m') || languages.includes('mm')) {
        projectType = 'iOS/macOS';
      } else if (languages.includes('js') || languages.includes('ts')) {
        projectType = 'web/javascript';
      } else if (languages.includes('py')) {
        projectType = 'python';
      } else if (languages.includes('java')) {
        projectType = 'java';
      } else if (languages.includes('go')) {
        projectType = 'go';
      } else if (languages.includes('rs')) {
        projectType = 'rust';
      } else if (languages.includes('dart')) {
        projectType = 'flutter';
      } else if (languages.includes('kt')) {
        projectType = 'kotlin/android';
      }

      // Проверяем наличие конфигурационных файлов
      const configFiles = [];
      const configFileNames = [
        'package.json', 'requirements.txt', 'Gemfile', 'Podfile', 'Cartfile',
        'build.gradle', 'pom.xml', 'Cargo.toml', 'go.mod', 'composer.json',
        'pyproject.toml', 'setup.py', 'Gemfile.lock', 'yarn.lock', 'pnpm-lock.yaml',
        'Pods', 'fastlane', 'Rakefile', 'Makefile', 'CMakeLists.txt'
      ];

      for (const configFile of configFileNames) {
        try {
          await fs.access(path.join(projectRoot, configFile));
          configFiles.push(configFile);
        } catch {
          // Файл не найден, продолжаем
        }
      }

      return {
        languages,
        projectType,
        configFiles,
        detectedFrameworks: this.detectFrameworks(configFiles)
      };
    } catch (error) {
      console.error('Error getting project metadata:', error.message);
      return {
        languages: [],
        projectType: 'unknown',
        configFiles: [],
        detectedFrameworks: []
      };
    }
  }

  /**
   * Определяет фреймворки на основе конфигурационных файлов
   */
  static detectFrameworks(configFiles) {
    const frameworks = [];

    if (configFiles.includes('package.json')) {
      frameworks.push('Node.js', 'React', 'Vue', 'Angular');
    }
    if (configFiles.includes('requirements.txt') || configFiles.includes('Pipfile') || configFiles.includes('pyproject.toml')) {
      frameworks.push('Python');
    }
    if (configFiles.includes('Podfile')) {
      frameworks.push('CocoaPods', 'iOS/macOS');
    }
    if (configFiles.includes('Cartfile')) {
      frameworks.push('Carthage', 'iOS/macOS');
    }
    if (configFiles.includes('build.gradle') || configFiles.includes('pom.xml')) {
      frameworks.push('Java', 'Android', 'Spring');
    }
    if (configFiles.includes('Cargo.toml')) {
      frameworks.push('Rust');
    }
    if (configFiles.includes('go.mod')) {
      frameworks.push('Go');
    }
    if (configFiles.includes('pubspec.yaml')) {
      frameworks.push('Flutter', 'Dart');
    }
    if (configFiles.includes('settings.gradle')) {
      frameworks.push('Gradle');
    }

    return frameworks;
  }

  /**
   * Собирает полный контекст проекта
   */
  static async getFullProjectContext(filePath) {
    const projectRoot = path.dirname(filePath);
    
    const [structure, gitChanges, metadata] = await Promise.all([
      this.getProjectStructure(projectRoot),
      this.getGitChanges(projectRoot),
      this.getProjectMetadata(projectRoot)
    ]);

    return {
      projectRoot,
      structure,
      gitChanges,
      metadata,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Получает информацию о зависимостях проекта
   */
  static async getDependencies(projectRoot) {
    try {
      const deps = {};
      
      // Проверяем зависимости для Node.js
      if (await this.checkFileExists(path.join(projectRoot, 'package.json'))) {
        const packageJson = JSON.parse(await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8'));
        deps.node = {
          dependencies: packageJson.dependencies || {},
          devDependencies: packageJson.devDependencies || {}
        };
      }
      
      // Проверяем зависимости для Python
      if (await this.checkFileExists(path.join(projectRoot, 'requirements.txt'))) {
        const requirements = await fs.readFile(path.join(projectRoot, 'requirements.txt'), 'utf8');
        deps.python = requirements.split('\n')
          .filter(line => line.trim() && !line.startsWith('#'))
          .map(dep => dep.trim());
      }
      
      // Проверяем зависимости для Swift (CocoaPods)
      if (await this.checkFileExists(path.join(projectRoot, 'Podfile.lock'))) {
        const podfileLock = await fs.readFile(path.join(projectRoot, 'Podfile.lock'), 'utf8');
        // Извлекаем зависимости из Podfile.lock
        const pods = [];
        const lines = podfileLock.split('\n');
        let inSpecs = false;
        
        for (const line of lines) {
          if (line.trim() === 'SPEC CHECKSUMS:') {
            inSpecs = true;
            continue;
          }
          
          if (inSpecs && line.trim() && !line.startsWith('  ')) {
            const podName = line.trim().replace(':', '');
            pods.push(podName);
          }
        }
        
        deps.swift = pods;
      }
      
      return deps;
    } catch (error) {
      console.error('Error getting dependencies:', error.message);
      return {};
    }
  }
  
  /**
   * Проверяет существование файла
   */
  static async checkFileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}