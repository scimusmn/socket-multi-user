function Game() {

    var currentFrameRequest = 0;
    var flyers = [];
    var stageDiv = {};
    var stageBounds = {};

    /* ============== */
    /* PUBLIC METHODS */
    /* ============== */

    this.init = function(_stageDiv) {

        stageDiv = _stageDiv;
        this.start();

    }

    this.start = function() {

        //Start game loop
        currentFrameRequest = window.requestAnimationFrame(gameLoop);

    }

    this.stop = function() {

        //Start game loop
        window.cancelAnimationFrame(currentFrameRequest);

    }

    this.setBounds = function(x,y,w,h) {

        stageBounds = {left:x, ceil:y, floor:h, right:w};
        stageBounds.floor -= 46; //padding for flyer height

    }

    this.addPlayer = function(data){

        console.log('Game.addPlayer: ' + data.nickname );

        //Add new flyer div to stage
        $(stageDiv).append('<div id="flyer_'+data.userid+'" class="flyer" ><p style="color:'+data.usercolor+';">'+data.nickname+'</p><img id="pick" src="img/pick-small.png"/><img src="img/astro-small.png"/></div>');
        var flyerDiv = $( '#flyer_'+data.userid );

        //Pop in
        var startX = Math.random()*(stageBounds.right-100) + 50;
        var startY = Math.random()*(stageBounds.floor-300) + 50;
        TweenLite.set( $( flyerDiv ), { css: { left:startX, top:startY } } );
        TweenLite.from( $( flyerDiv ), 1, { css: { scale:0 }, ease:Elastic.easeOut } );

        //Add to game loop
        var newFlyer = {    'userid':data.userid,
                            'div':flyerDiv,
                            'nickname':data.nickname,
                            'color':data.usercolor,
                            'count':0,
                            'gas':false,
                            'dir':1,
                            'x':startX,
                            'y':startY,
                            'ax':0,
                            'ay':0,
                            'vx':0,
                            'vy':-0.1
                        };

        flyers.push(newFlyer);

    }

    this.removePlayer = function(data){

        console.log('Game.removePlayer: ' + data.nickname );

        //Remove flyer from both stage and game loop
        var flyer = lookupFlyer(data.userid);
        $(flyer.div).remove();

        for( i=flyers.length-1; i>=0; i--) {
            if( flyers[i].userid == data.userid ) flyers.splice(i,1);
        }

    }

    this.controlVector = function(data) {

        // console.log('Game.controlVector by player: ' + data.nickname + ". Angle: " + data.angle + ". Magnitude: " + data.magnitude );

        var f = lookupFlyer(data.userid);

        if (data.magnitude == 0) {
            //No acceleration
            f.gas = false;
            f.ax = f.ay = 0;
        } else {
            //Apply acceleration
            f.gas = true;
            f.ax = data.magnitude * Math.cos(data.angle) * 0.5;
            f.ay = data.magnitude * Math.sin(data.angle) * 0.5;
        }

    }

    this.controlTap = function(data) {

        console.log('Game.controlTap by player: ' + data.nickname );

        var f = lookupFlyer(data.userid);

        //Swing pick-ax
        TweenLite.set( $( f.div ).children('#pick'), { css: { rotation: -60 * f.dir, opacity: 1, transformOrigin:"50% 100% 0" } });
        TweenMax.to( $( f.div ).children('#pick'), 0.4, { css: { rotation: 330 * f.dir, opacity: 0 }, ease: Power3.easeOut });

    }

    /* =============== */
    /* PRIVATE METHODS */
    /* =============== */

    function gameLoop() {

        //Update game objects here...
        flyers.forEach(function(flyer){

            if (flyer.gas == true){

                flyer.count ++;
                if (flyer.count%4 == 1) {
                    releasePuff(flyer);
                }

            } else {

                // Friction
                flyer.vx *= 0.99;

            }

            //Apply acceleration
            flyer.vx += flyer.ax;
            flyer.vy += flyer.ay;

            //Apply Gravity
            flyer.vy += 0.025;

            //Govern speed
            flyer.vx = clamp(flyer.vx, -6.5, 6.5);
            flyer.vy = clamp(flyer.vy, -6.5, 6.5);

            //Move based on velocity
            flyer.x += flyer.vx;
            flyer.y += flyer.vy;

            //Keep on stage
            if (flyer.y >= stageBounds.floor) {
                flyer.y = stageBounds.floor;
                flyer.vx *= 0.65;
                flyer.vy *= -0.3;
            } else if (flyer.y <= stageBounds.ceil) {
                flyer.y = stageBounds.ceil;
                flyer.vy = 0;
            }
            if (flyer.x >= stageBounds.right) {
                flyer.x = stageBounds.left;
            } else if (flyer.x <= stageBounds.left) {
                flyer.x = stageBounds.right;
            }

            //Direction
            if (flyer.ax<0){
                flyer.dir = -1;
            } else if (flyer.ax>0) {
                flyer.dir = 1;
            }

            //Update position
            TweenLite.set( $( flyer.div ), { css: { left:flyer.x, top:flyer.y } } );
            TweenLite.set( $( flyer.div ).children('img'), { css: { scaleX:flyer.dir } } );

        });

        //Wait for next frame
        currentFrameRequest = window.requestAnimationFrame(gameLoop);

    }

    function releasePuff(flyer) {

        //Add to stage
        var pDiv = $('<img class="puff" src="img/puff-small.png">');
        $('#stage').append(pDiv);

        var tX = flyer.x - (flyer.vx * 2.5);
        var tY = flyer.y + 30 - (flyer.vy * 2.5);

        //Starting point
        TweenLite.set( $( pDiv ), { css: { left:tX, top:tY, scale:0.5 } } );

        //Target point
        tX = tX - (flyer.vx * 1.5) + (Math.random()*12 - 6);
        tY = tY - (flyer.vy * 1.5) + (Math.random()*20);

        //Scale and fade
        TweenLite.set( $( pDiv ), { css: { transformOrigin:"8px 8px 0" } } );
        TweenLite.to( $( pDiv ), 0.3, { css: { scale:0.5 + Math.random()*0.5, left:tX, top:tY}, ease:Power2.easeOut, onComplete: removeElement, onCompleteParams:[pDiv] } );
        TweenLite.to( $( pDiv ), 0.25, { css: { opacity:0 }, ease:Power2.easeIn } );

    }

    //UTILS
    function lookupFlyer(id){
        for (var i = 0; i < flyers.length; i++) {
            if (flyers[i].userid == id) return flyers[i];
        }
    }
    function removeElement(el){
        $(el).remove();
    }
    function map_range(value, low1, high1, low2, high2) {
        return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
    }
    function dist(x, y, x0, y0){
        return Math.sqrt((x -= x0) * x + (y -= y0) * y);
    };
    function clamp(val, min, max) {
      return Math.min(Math.max(val, min), max);
    };
    function roundToNearest(val, n){
        return n * Math.round(val/n);
    }

}
