/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';

const LOG_DIR = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const logFile = path.join(LOG_DIR, 'runtime.log');

function writeLine(level: string, message: string) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level}] ${message}`;
  console.log(line);
  fs.appendFileSync(logFile, `${line}\n`);
}

export const logger = {
  info: (msg: string) => writeLine('INFO', msg),
  warn: (msg: string) => writeLine('WARN', msg),
  error: (msg: string) => writeLine('ERROR', msg),
};
