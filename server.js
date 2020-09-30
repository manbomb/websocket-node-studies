const WebSocketServer = require('websocket').server;
const http = require('http');
const jwt = require('jsonwebtoken');
const redis = require('redis');

const redisClient = redis.createClient({ // se conecta com o redis
  port: 6379
})

const server = http.createServer();
server.listen(8080, function() { });

wsServer = new WebSocketServer({ // cria um servidor websocket
  httpServer: server
});

const connections = []; // array de conexões

const verifyToken = (request) => { // função que recebe a request como parametro e verifica se o token no path esta correto
  const path = request.resourceURL.path;

  if (path.indexOf("token") < 0) return false; // se não estiver carregando token na url

  let token = path.split("token=")[1]; // verifica onde começa o token no path

  if (token.indexOf("&") >= 0) { // recorta o fim do token
    token = token.split("&")[0];
  }

  try {
    const verify = jwt.verify(token, '0cc175b9c0f1b6a831c399e269772661'); // tenta verificar o token
    return verify; // retorna o payload do token
  } catch(err) {
    return false; // retorna falso
  }
}

wsServer.on('request', function(request) {

  const verify = verifyToken(request); // verifica o token

  if (!verify || !verify.id) {
    request.reject(); // rejeita os não autorizados
    console.log("rejeitada");
    return;
  }

  const connection = request.accept(null, request.origin); // cria uma conexão com que é autorizado

  connection.key = request.key; // coloca como parametro da conexão a key da request
  connection.id = verify.id; // coloca como parametro da conexão o id do usuario (doo payload)

  connections.push(connection); // coloca esta conexão dentro do array de conexões

  console.log(connections.map(el => ({ id: el.id, key: el.key })))

  const ciclo = () => { // função que fica aguardando chaves  PUSH_* no redis com o valor a ser enviado
    redisClient.keys('PUSH_*', (err, keys) => {
      if (err) ciclo();
      keys.forEach(key => {
        const userId = parseInt(key.split("_")[1]); // id do usuario destinatário

        redisClient.get(key, (err, data) => { // qual dado a ser enviado
          if (err) ciclo();
          connections 
            .filter(conn => conn.id == userId)// filtra apenas as conexões com o id do usuario
            .forEach(conn => {
              conn.sendUTF(data); // envia o dado para a conexão
            });
        });

        redisClient.del(key); // deleta chave já enviada
      });
    });
    setTimeout(_ => ciclo(), 100); // da um intervalo de 100 ms a cada ciclo
  }

  ciclo(); // inicia ciclo

  connection.on('close', function() { // quando o usuario sair, romper a conexão
    const index = connections.indexOf(connection); // encontra o index da conexão caída
    if (index !== -1) {
      connections.splice(index, 1); // retira a conexão do array
    }
    console.log(connections.map(el => ({ id: el.id, key: el.key })))
  });
});