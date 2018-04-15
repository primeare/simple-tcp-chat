'use strict';

const net = require('net');
const readline = require('readline');
const socket = new net.Socket();
socket.setEncoding('utf8');
let username = '';
let password = '';

function displayMessage(rl, msg) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  console.log(msg);
  rl.prompt(true);
}

function xorEncryption(str, key) {
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    out += String.fromCharCode(charCode);
  }
  return out;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> '
});

const commands = {
  '/help': () => {
    displayMessage(rl, 'Commands: ' + Object.keys(commands).join(', '));
  },

  '/username': (command) => {
    const oldUsername = username;
    username = command.split(' ')[1];
    socket.write(JSON.stringify({
      type: 'username',
      username: oldUsername,
      data: username
    }), 'utf8');
  },

  '/password': (command) => {
    password = command.split(' ')[1];
    displayMessage(rl, 'Password is changed');
  },

  '/exit': () => rl.close(),
};

rl.question('Choose your username: ', (answer) => {
  console.log(`  Username set to: ${answer}`);
  username = answer;
  rl.question('Type password for encryption: ', (pass) => {
    console.log(`  Password set to: ${pass}`);
    password = pass;
    socket.connect({
      port: 3333,
      host: 'localhost',
    }, () => socket.write(JSON.stringify({
      type: 'connect',
      username
    }), 'utf8'));
    console.log('  Connected to server on localhost:3333');
    rl.prompt(true);
  });
});

socket.on('data', (data) => {
  const msg = JSON.parse(data);
  switch (msg.type) {
    case 'public-chat':
      displayMessage(
        rl,
        `<${msg.username}> ${xorEncryption(msg.data, password)}`
      );
      break;
    case 'connect':
      displayMessage(rl, `${msg.username} joined chat!`);
      break;
    case 'disconnect':
      displayMessage(rl, `${msg.username} leaved chat!`);
      break;
    case 'username':
      displayMessage(rl, `${msg.username} changed username to ${msg.data}`);
      break;
    case 'bad-connect-username':
      displayMessage(rl, `Username ${msg.username} is already used`);
      rl.question('Choose your username: ', (answer) => {
        console.log(`  Username set to: ${answer}`);
        username = answer;
        socket.write(JSON.stringify({
          type: 'connect',
          username
        }), 'utf8');
        rl.prompt(true);
      });
      break;
    case 'bad-username':
      displayMessage(rl, `Username ${msg.username} is already used`);
      displayMessage(rl, 'Change username using command /username');
      break;
    default:
      break;
  }
});

rl.on('line', (line) => {
  line = line.trim();
  const command = commands[line.split(' ')[0]];
  if (command) {
    command(line);
  } else {
    socket.write(JSON.stringify({
      type: 'public-chat',
      username,
      data: xorEncryption(line, password)
    }), 'utf8');
  }
  rl.prompt();
});

rl.on('close', () => {
  displayMessage(rl, 'Thank you for choosing Flexare chat!');
  socket.write(JSON.stringify({
    type: 'disconnect',
    username
  }), 'utf8');
  socket.destroy();
  process.exit(0);
});
