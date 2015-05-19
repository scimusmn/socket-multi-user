//Imports
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var uaParser = require('ua-parser');
var Puid = require('puid');
var puid = new Puid(true);

var CLIENT_CONTROLLER = 'client_controller';
var CLIENT_SHARED_SCREEN = 'client_shared_screen';
var DEVICE_STORAGE_KEY = 'smm_player_profile';
var clients = {};
var sharedScreenSID;
var sharedScreenConnected = false;

var portNumber = 3000;
app.set('port', portNumber);
app.use(express.static(path.join(__dirname, 'public')));

//Serve client files
app.get('/', function (request, response){

    var userAgent = request.headers['user-agent'];
    var os = uaParser.parseOS(userAgent).toString();
    //TODO: Serve warning to any user on unsupported OS, browser, or device.

    console.log('Serving controller.html to: ', os);
    response.sendFile(__dirname + '/controller.html');

});
app.get('/screen', function (request, response){

    console.log('Serving screen.html');
    response.sendFile(__dirname + '/screen.html');

});

//Socket.io connections
io.on('connection', function(socket){

    //Variables unique to this client
    var userid;
    var socketid;
    var usertype;
    var nickname;
    var usercolor;

    console.log('User has connected. Connection:', socket.request.connection._peername);

    //User registered
    socket.on('register', function(data) {

        console.log('User has registered:', data.usertype, data.nickname, data.userid);

        socketid = socket.id;
        usertype = data.usertype;
        nickname = data.nickname;
        usercolor = data.usercolor;

        if (usertype == CLIENT_SHARED_SCREEN) {

            sharedScreenSID =  socket.id;
            sharedScreenConnected = true;

        } else if (usertype == CLIENT_CONTROLLER && sharedScreenConnected) {

            /**
             * If returning user, use
             * existing userid found on
             * device. If new user, perfom
             * initial data store to device
             * using generated unique id.
             */
            if (data.firstTime === false){
                //Returning user
                userid = data.userid;
                /**
                 * Ensure no other clients
                 * have the same userid. If
                 * they do, it's most likely
                 * two tabs open on the same
                 * browser/device, so we disconnect
                 * the previous connection.
                 */
                 console.log('registered returning user '+ userid);
                 var prevConnected = clients[userid];
                 console.log('prevConnected: '+ prevConnected);
                 if (prevConnected && prevConnected !== socket.id) {
                    //TODO: Display "Disconnected" message on previous tab.
                    console.log('Disconnecting redundant user socket: '+clients[userid]);
                    prevConnected.emit('alert-message', {'msg': 'Whoops you disconnected! Reload page to join.'} );
                    clients[userid].disconnect();
                    delete clients[userid];
                 }

            } else {
                console.log('registered first time'+ userid);
                //New user
                userid = puid.generate();
                var userData = createUserData();
                socket.emit('store-local-data', {'key': DEVICE_STORAGE_KEY, 'dataString': userData});
            }

            //Track clients' sockets so we can ensure only one socket per device.
            clients[userid] = socket;

            //Alert shared screen of new player
            io.sockets.connected[sharedScreenSID].emit('add-player', {  'nickname' : nickname,
                                                                        'userid' : userid,
                                                                        'socketid' : socketid,
                                                                        'usercolor' : usercolor
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

        //Stop tracking this socket
        delete clients[userid];

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

    //Forward events to specific controllers
    socket.on('controller-event', function (data){

        console.log('Forwarding controller-event of type: ' + data.type + ' to: ' + data.socketid);
        io.sockets.connected[data.socketid].emit('controller-event', data );

    });

    function createUserData() {

        var dataObj = { 'userid' : userid,
                        'nickname' : nickname,
                        'usercolor' : usercolor
                        };

        return JSON.stringify(dataObj);

    }

});


//Listen for http requests on port <portNumber>
http.listen(portNumber, function(){

    console.log('Listening to Node server on port ' + portNumber + '...');

});