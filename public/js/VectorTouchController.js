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

    //TEMP - TOUCGHLOW AND ARROW
    var $arrow = $("#arrow");
    $arrow.css('left',halfWidth + 'px');
    $arrow.css('top',halfHeight + 'px');

    $('body').touchglow({

            touchColor: "#fff",
            fadeInDuration: 25,
            fadeOutDuration: 250,

        onUpdatePosition: function(x,y){

            var angle = Math.atan2(x - halfWidth, - (y - halfHeight) )*(180/Math.PI);
            $arrow.css({ "-webkit-transform": 'rotate(' + angle + 'deg)'});
            $arrow.css({ '-moz-transform': 'rotate(' + angle + 'deg)'});

            //Temp
            $arrow.css('left', x + 'px');
            $arrow.css('top', y + 'px');

            //Temp
            $("#startx").css('left', halfWidth + 'px');
            $("#startx").css('top', halfHeight + 'px');

        },
        onFadeIn: function(fadeDur){
            $arrow.stop().fadeTo(fadeDur, 1);
            $('#instruct').stop().fadeTo(fadeDur, 0.2);
        },
        onFadeOut: function(fadeDur){
            $arrow.stop().fadeTo(fadeDur, 0.01);
            $('#instruct').stop().fadeTo(fadeDur, 1);
        }

    });
    //End TEMP

    //TEMP
    var context = document.getElementById('canvas').getContext('2d');
    function drawLine(x,y) {

        clearLine();

        context.beginPath();
        context.moveTo(halfWidth, halfHeight);
        context.lineTo(x, y, 3);
        context.strokeStyle = '#cccccc';
        context.stroke();

        context.beginPath();
        context.arc(halfWidth,halfHeight,8,0,2*Math.PI);
        context.stroke();

      };
      function clearLine() {
        context.clearRect ( 0 , 0 , document.getElementById('canvas').width, document.getElementById('canvas').height );
      }
      //END TEMP

    function touchEvent ( event ) {

        if (event.type == 'touchmove') {

            tx = event.touches[0].pageX;
            ty = event.touches[0].pageY;

            inputMove(tx, ty);

            //Temp
            drawLine(tx,ty);

        } else if ( event.type == 'touchstart' ) {

            halfWidth = event.touches[0].pageX;
            halfHeight = event.touches[0].pageY;

            clearLine();//temp

        } else if ( event.touches.length == 0 ) {

            inputUp();

            clearLine();//temp

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

    function map(value, low1, high1, low2, high2) {

      return low2 + (high2 - low2) * (value - low1) / (high1 - low1);

    }

};
