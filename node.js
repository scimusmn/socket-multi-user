//Imports
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var uaParser = require('ua-parser');
var Puid = require('puid');
var puid = new Puid();

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

        //TODO: Detect IP address of server and use to create QR code.
        //see http://goo.gl/q4eDo

    }

});

//Handle Socket.io connections
io.on('connection', function(socket){

    //Set variables for this client
    var userid = puid.generate();
    console.log('new userid: ' + userid + '.');

});

//Listen for http requests on port <portNumber>
http.listen(portNumber, function(){

    console.log('Listening to Node server on port ' + portNumber + '...');

});