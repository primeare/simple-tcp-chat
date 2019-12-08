const ESC = '\x1b[';
const log = console.log;

export class Logger {
  constructor(log = console.log) {
    this.log = log;
  }

  output(message) {
    if (this.log) {
      return void this.log(message);
    }

    return message;
  }

  info(message) {
    this.output(`${ESC}94m[INFO]\t${message}${ESC}39m`);
  }

  warn(message) {
    this.output(`${ESC}93m[WARNING]\t${message}${ESC}39m`);
  }

  error(message) {
    this.output(`${ESC}91m[ERROR]\t${message}${ESC}39m`);
  }

  chat(username, message) {
    this.output(`${ESC}97m<${username}>${ESC}39m ${message}`);
  }
}
