'use strict';

const net = require('net');
const clients = [];

const server = net.createServer((socket) => {

  socket.setEncoding('utf8');
  socket.on('data', (data) => {
    const msg = JSON.parse(data);
    switch (msg.type) {
      case 'connect':
        for (const client of clients) {
          if (client.username === msg.username) {
            return socket.write(JSON.stringify({
              type: 'bad-connect-username',
              username: msg.username
            }), 'utf8');
          }
        }

        console.log(`[SERVER] Client connected: ${socket.remoteAddress}:${socket.remotePort}`);
        clients.push({ username: msg.username, socket });
        for (const client of clients) {
          if (client.socket !== socket) client.socket.write(data);
        }
        break;
      case 'username':
        if (msg.data === msg.username) break;
        for (const client of clients) {
          if (client.username === msg.data) {
            return socket.write(JSON.stringify({
              type: 'bad-username',
              username: msg.data
            }), 'utf8');
          }
        }

        for (const client of clients) {
          if (client.socket !== socket) client.socket.write(data);
          if (client.socket === socket) client.username = msg.data;
        }
        break;
      default:
        for (const client of clients) {
          if (client.socket !== socket) client.socket.write(data);
        }
        break;
    }
  });

  socket.on('close', () => {
    console.log(`[SERVER] Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`);
    let id = 0;
    for (const client of clients) {
      if (client.socket === socket) break;
      id++;
    }
    clients.splice(id, 1);
  });

});

server.listen({
  host: '0.0.0.0',
  port: 3333
}, () => console.log('Server listening on port: ' + 3333));
