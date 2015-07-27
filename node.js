//Imports
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var uaParser = require('ua-parser');
var Puid = require('puid');
var puid = new Puid(true);
var profanity = require('profanity-util');

var CLIENT_CONTROLLER = 'client_controller';
var CLIENT_SHARED_SCREEN = 'client_shared_screen';
var DEVICE_STORAGE_KEY = 'smm_player_profile';
var clients = {};
var sharedScreenSID;
var sharedScreenConnected = false;

//Search for '-port' flag
//via command line, otherwise
//default to port 3000.
var portNumber = 3000;
if(process.argv.indexOf("--port") != -1){
    portNumber = process.argv[process.argv.indexOf("--port") + 1];
}
app.set('port', portNumber);
app.use(express.static(path.join(__dirname, 'public')));

//Serve client files
app.get('/', function (request, response){

    var userAgent = request.headers['user-agent'];
    var ua = uaParser.parseUA(userAgent).toString();// -> "Safari 5.0.1"
    var os = uaParser.parseOS(userAgent).toString();// -> "iOS 5.1"
    var device = uaParser.parseDevice(userAgent).toString();// -> "iPhone"

    //TODO: Serve warning to any user on unsupported OS, browser, or device.

    console.log('Serving controller.html to: ', device, ' running ', ua, ' on ', os);
    response.sendFile(__dirname + '/controller.html');

    //Send tracking event
    sendKeenEvent('node-serve-controller', { 'userAgent': ua, 'operatingSystem': os, 'device': device} );

});
app.get('/screen', function (request, response){

    console.log('Serving screen.html');
    response.sendFile(__dirname + '/screen.html');

    var userAgent = request.headers['user-agent'];
    var ua = uaParser.parseUA(userAgent).toString();// -> "Safari 5.0.1"
    var os = uaParser.parseOS(userAgent).toString();// -> "iOS 5.1"
    var device = uaParser.parseDevice(userAgent).toString();// -> "iPhone"

    //Send tracking event
    sendKeenEvent('node-serve-screen', { 'userAgent': ua, 'operatingSystem': os, 'device': device} );

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
        nickname = purifyName(data.nickname);
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
                    prevConnected.emit('alert-message', {'message': 'Whoops you disconnected! Reload to play.'} );
                    clients[userid].disconnect();
                    delete clients[userid];
                 }

            } else {
                console.log('registered first time'+ userid);
                //New user
                userid = puid.generate();
                var userData = newUserData();
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

        console.log('Forwarding controller-event: ' + data.type + ', to socket: ' + data.socketid);
        io.sockets.connected[data.socketid].emit('controller-event', data );

    });

    function purifyName(nameStr) {

        // check that string is not empty or full of spaces
        if (/\S/.test(nameStr) && nameStr !== undefined) {
            nameStr = profanity.purify(nameStr, { replace: 'true', replacementsList: [ 'PottyMouth', 'GutterMind', 'Turdington', 'DullMind', 'Blue' ] })[0];
        } else {
            nameStr = "Hero_" + Math.round(Math.random()*999);
        }

        return nameStr;
    }

    function newUserData() {

        var dataObj = { 'userid' : userid,
                        'nickname' : nickname,
                        'usercolor' : usercolor
                        };

        //Send tracking event
        sendKeenEvent('node-new-user', dataObj );

        return JSON.stringify(dataObj);

    }

});


//Listen for http requests on port <portNumber>
http.listen(portNumber, function(){

    console.log('Listening to Node server on port ' + portNumber + '...');

});


//Keen.io tracking
var Keen = require('keen-js');
var keenKeys = require('./public/js/keen.js').getKeys();
var keenClient = new Keen({
    projectId: keenKeys.projectId,
    writeKey: keenKeys.writeKey
});

/**
* Track an event with keen.io
*/
function sendKeenEvent(eventType, eventObj) {

    // Add a timestamp to event parameters
    eventObj.keen = {
        timestamp: new Date().toISOString()
    };

    // Send data, with some basic error reporting
    if (typeof keenClient !== 'undefined') {

      keenClient.addEvent(eventType, eventObj, function(err, res){
        if (err) {
          console.log('Keen - ' + eventObj + ' submission failed');
        }
        else {
          console.log('Keen - ' + eventObj + ' event sent successfully');
        }
      });

    } else {

      console.log('WARNING: Keen unavailable.\nMake sure you have included the keen.js file.');

    }

}
