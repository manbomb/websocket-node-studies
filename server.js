const WebSocketServer = require('websocket').server;
const http = require('http');
const jwt = require('jsonwebtoken');
const redis = require('redis');

const redisClient = redis.createClient({
  port: 6379
})

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

  connections.push(connection); // TODO: trocar por redis set

  console.log(connections.map(el => ({ id: el.id, key: el.key })))

  const ciclo = () => {
    redisClient.keys('PUSH_*', (err, keys) => {
      if (err) ciclo();
      keys.forEach(key => {
        const userId = parseInt(key.split("_")[1]);

        redisClient.get(key, (err, data) => {
          if (err) ciclo();
          connections
            .filter(conn => conn.id == userId)
            .forEach(conn => {
              conn.sendUTF(data);
            });
        });

        redisClient.del(key);
      });
    });
    setTimeout(_ => ciclo(), 100);
  }

  ciclo();

  connection.on('close', function() {
    const index = connections.indexOf(connection);
    if (index !== -1) {
      connections.splice(index, 1);
    }
    console.log(connections.map(el => ({ id: el.id, key: el.key })))
  });
});