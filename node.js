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
var DEVICE_STORAGE_KEY = 'smm_player_data';
var sharedScreenSID;
var sharedScreenConnected = false;

var portNumber = 3000;
app.set('port', portNumber);
app.use(express.static(path.join(__dirname, 'public')));

//Serve client files
app.get('/', function (request, response){

    var userAgent = request.headers['user-agent'];
    var os = uaParser.parseOS(userAgent).toString();
    //TODO: Serve warning page to any user on unsupported OS, browser, or device.

    console.log("Serving controller.html to: ", os);
    response.sendFile(__dirname + '/controller.html');

});
app.get('/screen', function (request, response){

    console.log("Serving screen.html");
    response.sendFile(__dirname + '/screen.html');

});

//Socket.io connections
io.on('connection', function(socket){

    //Variables unique to this client
    var userid;
    var usertype;
    var nickname;
    var usercolor;

    console.log('User has connected. Connection:', socket.request.connection._peername);

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

            /**
             * If returning user, use
             * existing userid found on
             * device. If new user, perfom
             * initial data store to device
             * using generated unique id.
             */
            if (data.userid != undefined && data.userid != ''){
                //Returning user
                userid = data.userid;
            } else {
                //New user
                userid = puid.generate();
                var userData = createUserData();
                socket.emit('store-local-data', {'key': DEVICE_STORAGE_KEY, 'dataString': userData});
            }

            //Alert shared screen of new player
            io.sockets.connected[sharedScreenSID].emit('add-player', {  'nickname' : nickname,
                                                                        'userid' : userid,
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