function VectorTouchController(socket) {

    var tx
    var ty;
    var angle;
    var dist;
    var magnitude;
    var screenWidth = parseInt($("body").width());
    var screenHeight = parseInt($("body").height());
    var halfWidth = parseInt(screenWidth/2);
    var halfHeight = parseInt(screenHeight/2);
    var shortest = Math.min(halfWidth, halfHeight);
    var ctx = document.getElementById('canvas').getContext('2d');
    $("#canvas").attr('width', screenWidth);
    $("#canvas").attr('height', screenHeight);

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
            drawUI(tx,ty);

        } else if ( event.type == 'touchstart' ) {

            halfWidth = event.touches[0].pageX;
            halfHeight = event.touches[0].pageY;
            clearCanvas();

        } else if ( event.touches.length == 0 ) {

            inputUp();
            clearCanvas();

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

    //Canvas drawing
    function drawUI(x,y) {

        clearCanvas();

        ctx.beginPath();
        ctx.moveTo(halfWidth, halfHeight);
        ctx.lineTo(x, y, 3);
        ctx.strokeStyle = '#ccc';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(halfWidth,halfHeight,8,0,2*Math.PI);
        ctx.stroke();

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        var fingyOffset = 95;

        ctx.fillStyle="#ddd";
        ctx.beginPath();
        ctx.moveTo(0+fingyOffset, 0);
        ctx.lineTo(-24+fingyOffset, -20);
        ctx.lineTo(-20+fingyOffset, 0);
        ctx.lineTo(-24+fingyOffset, 20);
        ctx.fill();

        ctx.restore();

    };

    function clearCanvas() {
        ctx.clearRect ( 0 , 0 , screenWidth, screenHeight );
    }

    this.simulateUserInput = function() {

        var simInputX = 0;
        var simInputY = 0;
        var simInputVX = 0;
        var simInputVY = 0;

        setInterval(function () {

            simInputX = (Math.random() * screenWidth)*.25 + (screenWidth*.375);
            simInputY = (Math.random() * screenHeight)*.25 + (screenHeight*.375);
            simInputVX = Math.random() * 10 - 5;
            simInputVY = Math.random() * 10 - 6; //slightly favor upwards

        }, 3000);

        setInterval(function () {

            simInputX += simInputVX;
            simInputY += simInputVY;

            if (Math.random()>0.25){
                //touchmove
                inputMove(simInputX, simInputY);
            }else {

                if (Math.random()<0.5) {
                    //touchstart
                    halfWidth = Math.random() * screenWidth;
                    halfHeight = Math.random() * screenHeight + 20;
                } else {
                    //touchend
                    inputUp();
                }

            }

        }, 20);

    }

    //Touchglow effect
    $('body').touchglow({

            touchColor: "#fff",
            fadeInDuration: 25,
            fadeOutDuration: 250,

        onUpdatePosition: function(x,y){

        },
        onFadeIn: function(fadeDur){
            $('#instruct').stop().fadeTo(fadeDur, 0.2);
        },
        onFadeOut: function(fadeDur){
            $('#instruct').stop().fadeTo(fadeDur, 1);
        }

    });

    function map(value, low1, high1, low2, high2) {

      return low2 + (high2 - low2) * (value - low1) / (high1 - low1);

    }

};
