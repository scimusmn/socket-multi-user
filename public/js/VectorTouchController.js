function VectorTouchController(socket) {

    var tx
    var ty;
    var angle;
    var dist;
    var magnitude;
    var halfWidth = parseInt($("body").width()/2);
    var halfHeight = parseInt($("body").height()/2);
    var shortest = Math.min(halfWidth, halfHeight);

    this.enable = function(){

        document.addEventListener( 'touchstart', touchEvent, false );
        document.addEventListener( 'touchend', touchEvent, false );
        document.addEventListener( 'touchcancel', touchEvent, false );
        document.addEventListener( 'touchmove', touchEvent, false );

    }

    this.disable = function(){

        document.removeEventListener( 'touchstart', touchEvent, false );
        document.removeEventListener( 'touchend', touchEvent, false );
        document.removeEventListener( 'touchcancel', touchEvent, false );
        document.removeEventListener( 'touchmove', touchEvent, false );

    }

    function touchEvent ( event ) {

        if (event.type == 'touchmove') {

            tx = event.touches[0].pageX;
            ty = event.touches[0].pageY;

            inputMove(tx, ty);

        } else if ( event.touches.length == 0 ) {

            inputUp();

        }

        event.preventDefault();
        event.stopPropagation();

    }

    function inputMove(inputX, inputY) {

        //Angle from center of screen
        angle = Math.atan2(inputY - halfHeight, inputX - halfWidth);

        //Distance from center in pixels
        dist = Math.sqrt( (inputX -= halfWidth) * inputX + (inputY -= halfHeight) * inputY );

        //Normalized magnitude (0-1) based on shortest screen side.
        magnitude = map(dist, 0, shortest, 0, 1);

        //Dispatch updated control vector
        socket.emit('control-vector', {     'angle': angle,
                                            'magnitude': magnitude
                                        });

    }

    function inputUp() {

        if (magnitude == 0) {

          //Touch never moved. Was tap.
          socket.emit('control-tap', {});

        } else {

          //Touch finished. Set vectors to 0;
          socket.emit('control-vector', {   'angle': 0,
                                            'magnitude': 0
                                        });
          magnitude = angle = 0;

        }

    }

    function map(value, low1, high1, low2, high2) {

      return low2 + (high2 - low2) * (value - low1) / (high1 - low1);

    }

};
