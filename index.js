const webSocketServer = require('websocket').server;
const http = require('http');

const webSocketsServerPort = 8000;

const server = http.createServer();
server.listen(webSocketsServerPort);
const wsServer = new webSocketServer({
    httpServer: server
});

const clients = {};
const messages = [];

const getUniqueID = () => {
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return s4() + s4() + '-' + s4();
};

const buildMessage  = (type, message) => JSON.stringify({type, message});

wsServer.on('request', function(request) {
    const userID = getUniqueID();
    console.log((new Date()) + ' Received a new connection from origin ' + request.origin + '.');
    const connection = request.accept(null, request.origin);
    connection.send(buildMessage('allUsers', Object.keys(clients)));
    clients[userID] = connection;

    const loginMessage = {user: null, message: `User ${userID} entered the chat`};
    connection.send(buildMessage('oldMessages', messages));

    wsServer.broadcast(buildMessage('connectUser', userID))
    wsServer.broadcast(buildMessage('newMessage', loginMessage));

    messages.push(loginMessage);

    connection.addListener('message', (message) => {
        const {type, message: m} = JSON.parse(message.utf8Data);
        switch(type) {
            case 'newMessage':
                const messageObject = {message: m, user: userID};
                wsServer.broadcast(buildMessage('newMessage', messageObject));
                messages.push(messageObject);
                break;
        }
    });

    connection.on('close', function(_connection) {
        console.log((new Date()) + " Peer " + userID + " disconnected.");
        const logoutMessage = {user: null, message: `User ${userID} left the chat`};
        messages.push(logoutMessage);
        wsServer.broadcast(buildMessage('disconnectUser', userID));
        wsServer.broadcast(buildMessage('newMessage', logoutMessage));
        delete clients[userID];
    });
});

