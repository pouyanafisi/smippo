import chalk from 'chalk';
import fs from 'fs-extra';

export class Logger {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.quiet = options.quiet || false;
    this.logFile = options.logFile || null;
    this.logBuffer = [];
  }

  info(message) {
    if (!this.quiet) {
      console.log(chalk.cyan('ℹ'), message);
    }
    this._writeToFile('INFO', message);
  }

  success(message) {
    if (!this.quiet) {
      console.log(chalk.green('✓'), message);
    }
    this._writeToFile('SUCCESS', message);
  }

  warn(message) {
    if (!this.quiet) {
      console.log(chalk.yellow('⚠'), message);
    }
    this._writeToFile('WARN', message);
  }

  error(message, error) {
    console.error(chalk.red('✗'), message);
    if (error && this.verbose) {
      console.error(chalk.red(error.stack || error));
    }
    this._writeToFile('ERROR', `${message}${error ? `: ${error.message}` : ''}`);
  }

  debug(message) {
    if (this.verbose) {
      console.log(chalk.gray('⋯'), chalk.gray(message));
    }
    this._writeToFile('DEBUG', message);
  }

  _writeToFile(level, message) {
    if (!this.logFile) return;
    
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level}] ${message}\n`;
    this.logBuffer.push(line);
    
    // Flush buffer periodically
    if (this.logBuffer.length >= 10) {
      this.flush();
    }
  }

  async flush() {
    if (!this.logFile || this.logBuffer.length === 0) return;
    
    try {
      await fs.appendFile(this.logFile, this.logBuffer.join(''));
      this.logBuffer = [];
    } catch (error) {
      // Ignore file write errors
    }
  }
}

