import { createInterface } from 'readline';
import { Socket } from 'net';
import { config } from '../configs/client.js';
import { Logger } from '../lib/logger.js';
import { stringify, parse } from '../lib/protocol.js';

const socket = new Socket();
socket.setEncoding('utf8');
let username = '';

const write = message => socket.write(stringify(message), 'utf8');

class CLI {
  #cli;

  constructor() {
    this.#cli = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    this.logger = new Logger();

    this.commands = {
      ['/help']: () => {
        this.displayMessage(
          'Commands: ' + Object.keys(this.commands).join(', ')
        );
      },
      ['/username']: newUsername => {
        if (newUsername === username) return undefined;
        write({ type: 'changeUsername', username, newUsername });
        username = newUsername;
      },
      ['/exit']: () => {
        this.#cli.close();
      },
    };

    this.#cli.on('line', line => {
      const trimmedLine = line.trim();
      const commandNames = Object.keys(this.commands);
      if (commandNames.some(c => trimmedLine.startsWith(c))) {
        const [command, ...args] = trimmedLine.split(' ');
        this.commands[command](...args);
        return this.#cli.prompt();
      }
      write({ type: 'chat', username, data: line });
      this.#cli.prompt();
    });

    this.#cli.on('close', () => {
      this.displayMessage('Good bye! Have a nice day :)');
      write({ type: 'disconnect', username });
      socket.destroy();
      process.exit(0);
    });
  }

  askQuestion(...args) {
    const callback = args.pop();
    this.#cli.question(...args, (...answers) => {
      this.#cli.prompt();
      callback(...answers);
    });
  }

  displayChatMessage(username, message) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    this.logger.chat(username, message);
    this.#cli.prompt(true);
  }

  displayMessage(message, type = 'info') {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    this.logger[type](message);
    this.#cli.prompt(true);
  }
}

const cli = new CLI();

const connect = () =>
  socket.connect({ host: config.host, port: config.port }, () => {
    write({ type: 'connect', username });
  });

const changeUsername = () =>
  cli.askQuestion('Choose your username: ', newUsername => {
    username = newUsername;
    connect();
  });

const handlers = {
  chat(req) {
    cli.displayChatMessage(req.username, req.data);
  },
  connect(req) {
    cli.displayMessage(`${req.username} joined the chat!`);
  },
  disconnect(req) {
    cli.displayMessage(`${req.username} left the chat!`);
  },
  changeUsername(req) {
    cli.displayMessage(
      `${req.username} changed username to ${req.newUsername}!`
    );
  },
  ['bad-connect-username'](req) {
    cli.displayMessage(`Username ${req.username} is already used`);
    changeUsername();
  },
  ['bad-username'](req) {
    cli.displayMessage(`Username ${req.username} is already used`);
    cli.displayMessage('Change username using command /username');
  },
};

changeUsername();

socket.on('data', data => {
  const req = parse(data);
  const handler = handlers[req.type];
  handler(req);
});
