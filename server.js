// This is the node.js server application
const express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io')(server);
//var WebSocketServer = require('websocket').server;

var fs = require('fs');
var clients = [];
const path = require('path');

//Gestion template
const pug = require('pug');
const compiledFunction = pug.compileFile('views/view.pug');
app.set("view engine", "pug");

//Static assets
app.use(express.static(path.join(__dirname, 'public')));

// sets port 8080 to default or unless otherwise specified in the environment
app.set('port', process.env.PORT || 8080);

var clients = [];

io.on('connection', function (socket) {
    socket.on("disconnect", (data) => {
        console.log("Peer Disconnected");
    });

    socket.on("message", (data) => {
        broadcast(data, socket.id);
    });

    console.log("Peer Connected");
    clients.push(socket);
});

function broadcast(msg, senderId) {
    console.log("broadcast " + msg);
    for (let i = 0; i < clients.length; i++) {
        if (clients[i].id !== senderId) {
            clients[i].emit("message", msg);
        }
    }
}

// change key and cert if you have other ones you use with a different name
//var options = {
//    key: fs.readFileSync('webrtcwwsocket-key.pem'),
//    cert: fs.readFileSync('webrtcwwsocket-cert.pem'),
//};

//var server = http.createServer(function (request, response) {
//    fs.readFile(__dirname + '/index.html',
//        function (err, data) {
//            if (err) {
//                response.writeHead(500);
//                return response.end('Error loading index.html');
//            }
//            response.writeHead(200);
//            response.end(data);
//        });
//});



server.listen(8080, function () {
    console.log((new Date()) + " Server is listening on port 8080");
});

// create the server
//wsServer = new WebSocketServer({
//    httpServer: server
//});

//function sendCallback(err) {
//    if (err) console.error("send() error: " + err);
//}

// This callback function is called every time someone
// tries to connect to the WebSocket server
//wsServer.on('request', function (request) {
//    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
//    var connection = request.accept(null, request.origin);
//    console.log(' Connection ' + connection.remoteAddress);
//    clients.push(connection);

//    // This is the most important callback for us, we'll handle
//    // all messages from users here.
//    connection.on('message', function (message) {
//        if (message.type === 'utf8') {
//            // process WebSocket message
//            console.log((new Date()) + ' Received Message ' + message.utf8Data);
//            // broadcast message to all connected clients
//            clients.forEach(function (outputConnection) {
//                if (outputConnection != connection) {
//                    outputConnection.send(message.utf8Data, sendCallback);
//                }
//            });
//        }
//    });

//    connection.on('close', function (connection) {
//        // close user connection
//        console.log((new Date()) + " Peer disconnected.");
//    });
//});

app.get("/", (req, res) => {
    res.render("view.pug");
});