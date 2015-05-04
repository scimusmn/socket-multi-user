//Imports
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var uaParser = require('ua-parser');
var Puid = require('puid');
var puid = new Puid(true);

var CLIENT_CONTROLLER = "client_controller";
var CLIENT_SHARED_SCREEN = "client_shared_screen";
var sharedScreenSID;
var sharedScreenConnected = false;

var portNumber = 3000;
app.set('port', portNumber);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (request, response){

    /**
     * Serve 'controller' file to
     * mobile clients, and 'screen'
     * file to non-mobile clients.
     * Currently assuming either
     * iOS or Android for mobile.
     */

    var userAgent = request.headers['user-agent'];
    var os = uaParser.parseOS(userAgent).toString();

    console.log("Serving file to: ", os);

    if ( os.indexOf('iOS') != -1  || os.indexOf('Android') != -1) {

        response.sendFile(__dirname + '/controller.html');

    } else {

        response.sendFile(__dirname + '/screen.html');

    }

});

//Socket.io connections
io.on('connection', function(socket){

    //Set up variables unique to this client
    var userid = puid.generate();
    var usertype;
    var nickname;
    var usercolor;

    console.log('User has connected: ', userid);
    console.log('connection :', socket.request.connection._peername);

    //User registered
    socket.on("register", function(data) {

        console.log("User has registered:", data.usertype, data.nickname);

        usertype = data.usertype;
        nickname = data.nickname;
        usercolor = data.usercolor;

        if (usertype == CLIENT_SHARED_SCREEN) {

            sharedScreenSID =  socket.id;
            sharedScreenConnected = true;

        } else if (usertype == CLIENT_CONTROLLER && sharedScreenConnected) {

            io.sockets.connected[sharedScreenSID].emit('add-player', {  'nickname': nickname,
                                                                        'userid': userid,
                                                                        'usercolor': usercolor
                                                                    });

        }

    });

    //User disconnected
    socket.on('disconnect', function(){

        console.log('User has disconnected:', usertype, nickname, userid);

        if (usertype == CLIENT_CONTROLLER && sharedScreenConnected) {

            io.sockets.connected[sharedScreenSID].emit('remove-player', {   'nickname':nickname,
                                                                            'userid':userid
                                                                        });

        } else if (usertype == CLIENT_SHARED_SCREEN) {

            sharedScreenConnected = false;

        }

    });

    //Controller vector update
    socket.on('control-vector', function(data){

        if (!sharedScreenConnected) return;
        data.userid = userid;
        io.sockets.connected[sharedScreenSID].emit('control-vector', data );

    });

    //Controller tap
    socket.on('control-tap', function(data){

        if (!sharedScreenConnected) return;
        data.userid = userid;
        io.sockets.connected[sharedScreenSID].emit('control-tap', data );

    });

});

//Listen for http requests on port <portNumber>
http.listen(portNumber, function(){

    console.log('Listening to Node server on port ' + portNumber + '...');

});