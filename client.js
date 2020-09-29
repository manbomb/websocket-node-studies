var WebSocketClient = require('websocket').client;
var client = new WebSocketClient();
var jwt = require('jsonwebtoken');

var token = jwt.sign({
    id: 1
}, '0cc175b9c0f1b6a831c399e269772661');

client.connect(`ws://localhost:8080/?token=${token}`);

client.on('connect', function(connection) {
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log("Received: '" + message.utf8Data + "'");
        }
    });
    connection.sendUTF("mandei");
})