const WebSocketServer = require('websocket').server;
const http = require('http');
const jwt = require('jsonwebtoken');

const server = http.createServer();
server.listen(8080, function() { });

wsServer = new WebSocketServer({
  httpServer: server
});

const connections = [];

const verifyToken = (request) => {
  const path = request.resourceURL.path;

  if (path.indexOf("token") < 0) return false; // se não estiver carregando token na url

  let token = path.split("token=")[1];

  if (token.indexOf("&") >= 0) {
    token = token.split("&")[0];
  }

  try {
    const verify = jwt.verify(token, '0cc175b9c0f1b6a831c399e269772661');
    return verify;
  } catch(err) {
    return false;
  }
}

wsServer.on('request', function(request) {

  const verify = verifyToken(request);

  if (!verify || !verify.id) {
    request.reject();
    console.log("rejeitada");
    return;
  }

  const connection = request.accept(null, request.origin);

  connection.key = request.key;
  connection.id = verify.id;

  connections.push(connection);

  console.log(connections.map(el => ({ id: el.id, key: el.key })))

  connection.on('message', function(message) {
    if (message.type === 'utf8') {
      connections.forEach(conn => {
        conn.sendUTF(message.utf8Data)
      })
    }
  });

  connection.on('close', function() {
    const index = connections.indexOf(connection);
    if (index !== -1) {
      connections.splice(index, 1);
    }
    console.log(connections.map(el => ({ id: el.id, key: el.key })))
  });
});