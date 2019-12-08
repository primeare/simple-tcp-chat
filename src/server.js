import net from 'net';
import { inspect } from 'util';
import { config } from '../configs/server.js';
import { Logger } from '../lib/logger.js';
import * as protocol from '../lib/protocol.js';

const clients = new Map();
const logger = new Logger();

const isUsernameExist = newUsername => {
  clients.forEach(({ username }) => {
    if (newUsername === username) return true;
  });

  return false;
};

const handlers = {
  connect(req, client) {
    const { username } = req;

    if (isUsernameExist(username)) {
      return { type: 'bad-connect-username', username };
    }

    logger.info(
      `Client connected: ${client.ip}:${client.port}. Username: ${username}.`
    );

    clients.set(client.socket, { username });
    return { ...req, broadcast: true };
  },
  changeUsername(req, client) {
    const { newUsername } = req;
    const actualClient = clients.get(client.socket);

    if (actualClient.username === newUsername) {
      return undefined;
    }

    if (isUsernameExist(newUsername)) {
      return { type: 'bad-username', username: newUsername };
    }

    actualClient.username = newUsername;
    return { ...req, broadcast: true };
  },
  default(req) {
    return { ...req, broadcast: true };
  },
};

const respondToClient = (data, client) => {
  client.write(protocol.stringify(data), 'utf8');
};

const broadcast = (data, ...exceptions) => {
  for (const client of clients.keys()) {
    if (exceptions.includes(client)) continue;
    respondToClient(data, client);
  }
};

const server = net.createServer(socket => {
  socket.setEncoding('utf8');

  socket.on('data', data => {
    const request = protocol.parse(data);
    const handler = handlers[request.type] ?? handlers.default;
    const client = {
      ip: socket.remoteAddress,
      port: socket.remotePort,
      socket,
    };
    const response = handler(request, client);
    if (response) {
      if (response.broadcast) {
        return broadcast(response, socket);
      }
      respondToClient(response, socket);
    }
  });

  socket.on('close', () => {
    logger.info(
      `Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`
    );
    clients.delete(socket);
  });

  socket.on('error', err => {
    logger.error('CLIENT: ' + inspect(err));
    socket.destroy();
  });
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    logger.error('Server address/port is already in use');
  }

  logger.error(inspect(err));
});

const gracefulShutdown = () =>
  server.close(() => {
    logger.info('Server closed. Have a nice day :)');
    process.exit(0);
  });

server.listen({ host: config.host, port: config.port }, () =>
  logger.info(`Server listening on: ${config.host}:${config.port}`)
);

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
