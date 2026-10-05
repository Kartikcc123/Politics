const http = require('http');
const net = require('net');

const server = http.createServer((req, res) => {
  res.writeHead(400);
  res.end('Use CONNECT');
});

server.on('connect', (req, clientSocket, head) => {
  // Connect directly to GitHub IP 20.207.73.82:443
  const targetPort = 443;
  const targetHost = '20.207.73.82';

  const serverSocket = net.connect(targetPort, targetHost, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on('error', (err) => {
    clientSocket.destroy();
  });
  clientSocket.on('error', (err) => {
    serverSocket.destroy();
  });
});

server.listen(9999, '127.0.0.1', () => {
  console.log('GitHub proxy listening on 127.0.0.1:9999');
});
