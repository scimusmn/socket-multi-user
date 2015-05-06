function Game() {

    var currentFrameRequest = 0;
    var flyers = [];
    var asteroids = [];
    var droppers = [];
    var stageDiv = {};
    var stageBounds = {};
    var roundCountdown = -45;

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

        //Begin releasing asteroids
        setInterval(function(){

            if (flyers.length>0 && roundCountdown > 0) releaseAsteroid();

        }, 4000);

        //Begin updating scoreboard
        setInterval(function(){

            if (flyers.length>0) updateScoreboard();

            if (roundCountdown < 0) {
                roundCountdown ++;
                $("#round-countdown").text(Math.abs(roundCountdown));
                if (roundCountdown == 0) {
                    $("#new-round").hide();
                    roundCountdown = 76;
                    resetScoreboard();
                }
            } else if (roundCountdown > 0) {
                roundCountdown --;
                if (roundCountdown <= 15) $("#game-countdown").text(Math.abs(roundCountdown));
                if (roundCountdown == 0) {
                    $("#new-round").show();
                    roundCountdown = -45;
                    clearAsteroids();
                    updateScoreboard();
                    $("#game-countdown").text(" ");
                }
            }

        }, 1000);

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
                            'score':0,
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
            f.ax = data.magnitude * Math.cos(data.angle) * 0.8;
            f.ay = data.magnitude * Math.sin(data.angle) * 0.8;
        }

    }

    this.controlTap = function(data) {

        console.log('Game.controlTap by player: ' + data.nickname );

        var f = lookupFlyer(data.userid);

        //Swing pick-ax
        TweenLite.set( $( f.div ).children('#pick'), { css: { rotation: -60 * f.dir, opacity: 1, transformOrigin:"50% 100% 0" } });
        TweenMax.to( $( f.div ).children('#pick'), 0.4, { css: { rotation: 330 * f.dir, opacity: 0 }, ease: Power3.easeOut });

        //Mine for gold
        f.score += mineForGold(f.x+10, f.y+25, f.color);

        //Drop mine
        // releaseDropper(f);

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
            if (flyer.vy < 0) {
                flyer.vy += 0.06;
            } else {
                flyer.vy += 0.006;
            }

            //Govern speed
            flyer.vx = clamp(flyer.vx, -3, 4);
            flyer.vy = clamp(flyer.vy, -4, 4);

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

    function mineForGold(mineX, mineY) {

        var goldMined = 0;

        for( a=asteroids.length-1; a>=0; a--) {

            var ast = asteroids[a];
            var aL = parseInt( $(ast.div).css('left') ) + (ast.diam*.5);
            var aT = parseInt( $(ast.div).css('top') ) + (ast.diam*.5);

            if ( dist( aL, aT, mineX, mineY ) < ast.diam * 1.25 ) {

                //Successful strike
                goldMined = ast.gold;

                //hide gold
                $( ast.goldDiv ).hide();

                //remove from stage
                TweenLite.to( $( ast.div ), 0.5, { css: { opacity:0 }, delay:2, onComplete: removeElement, onCompleteParams:[ast.div] } );

                //remove from game loop
                asteroids.splice(a,1);

                releasePoints(goldMined, '#eee21c', aL - 10, aT - 20);
                return goldMined;

            }
        }

        return goldMined;

    }

    function updateScoreboard() {

        //Sort by score
        flyers.sort(function(a,b) { return parseFloat(b.score) - parseFloat(a.score) } );

        if (roundCountdown > 0) {
            //TEMP (shouldn't reach outside game stage)
            // $('#messages').empty();
            // for (var i = 0; i < flyers.length; i++) {
            //     $('#messages').append($('<li>').html('<span style="color:'+flyers[i].color+';">' +flyers[i].nickname+ ' </span> &nbsp; ' + flyers[i].score));
            // }
        } else if (roundCountdown < 0) {
            //TEMP (shouldn't reach outside game stage)
            $('#player-list').empty();
            for (var i = 0; i < flyers.length; i++) {
                $('#player-list').append($('<li>').html('<span style="color:'+flyers[i].color+';">' +flyers[i].nickname+ ' </span> &nbsp; ' + flyers[i].score));
            }
        }

    }

    function resetScoreboard() {
        for (var i = 0; i < flyers.length; i++) {
            flyers[i].score = 0;
        }
    }

    function releasePuff(flyer) {

        //Add to stage
        var pDiv = $('<img class="puff" src="img/puff-small.png">');
        $(stageDiv).append(pDiv);

        var tX = flyer.x - (flyer.ax * 30);
        var tY = flyer.y + 30 - (flyer.ay * 15);

        //Starting point
        TweenLite.set( $( pDiv ), { css: { left:tX, top:tY, scale:0.5 } } );

        //Target point
        tX = tX - (flyer.ax * 160) + (Math.random() * 12 - 6);
        tY = tY - (flyer.ay * 160) + (Math.random() * 20);

        //Scale and fade
        TweenLite.set( $( pDiv ), { css: { transformOrigin:"8px 8px 0" } } );
        TweenLite.to( $( pDiv ), 0.3, { css: { scale:0.5 + Math.random()*0.5, left:tX, top:tY}, ease:Power2.easeOut, onComplete: removeElement, onCompleteParams:[pDiv] } );
        TweenLite.to( $( pDiv ), 0.25, { css: { opacity:0 }, ease:Power2.easeIn } );

    }

    function releaseDropper(flyer) {

        //Add to stage
        var dDiv = $('<img class="puff" src="img/drop-small.png">');
        $(stageDiv).append(dDiv);

        var tX = flyer.x;
        var tY = flyer.y;

        //Starting point
        TweenLite.set( $( dDiv ), { css: { left:tX, top:tY } } );

        //Target point
        tX = tX + (flyer.vx * 10);
        tY = tY + 400;

        //Scale and animated drop
        TweenLite.to( $( dDiv ), 0.75, { css: { left:tX, top:tY }, ease:Power3.easeIn, onComplete: removeElement, onCompleteParams:[dDiv] } );

    }

    function releasePoints(val, col, x, y) {

        //add to stage
        var pDiv = $('<p class="points" style="color:'+col+';">+'+val+'</p>');

        $(stageDiv).append(pDiv);

        //Starting point
        TweenLite.set( $( pDiv ), { css: { left:x, top:y, scale:0.25 } } );

        //Target point
        x += Math.random()*30-15;
        y -= 45;

        //Scale and fade
        TweenLite.to( $( pDiv ), 0.25, { css: { scale:1, left:x, top:y }, ease:Power3.easeOut } );
        TweenLite.to( $( pDiv ), 0.5, { css: { opacity:0 }, ease:Power2.easeIn, onComplete: removeElement, onCompleteParams:[pDiv] } );

    }

    function releaseAsteroid() {

        //add to stage
        var ra = Math.ceil(Math.random()*3);
        var aDiv = $('<div class="asteroid" style=""><img src="img/asteroid-dark.png"/><img src="img/a-gold-'+ra+'.png"/></div>');

        $(stageDiv).append(aDiv);

        //Release point
        var startX = Math.random()*(stageBounds.right-60)+30;
        var startY = Math.random()*(stageBounds.floor-60)+30;
        var startScale = Math.random()*0.5+0.5;
        if (Math.random() < 0.07) startScale = 3 + Math.random() * 2;//Monster asteroid!
        TweenLite.set( $( aDiv ), { css: { left:startX, top:startY, scale:startScale } } );

        var diam = Math.round(63 * startScale);
        var gold = roundToNearest(diam/2, 5);

        //Pop in
        TweenLite.from( $( aDiv ), 1, { css: { scale:0 }, ease:Elastic.easeOut } );
        TweenLite.from( $( aDiv ), 10, { css: { left:startX + (Math.random()*40-20), top:startY + (Math.random()*40-20), rotation:Math.random()*90-45 } } );

        var ast = {"div":aDiv, "goldDiv":aDiv.find('img').last(), "x":startX, "y":startY, "diam":diam, "gold":gold };
        asteroids.push(ast);

    }

    function clearAsteroids() {

        for( a=asteroids.length-1; a>=0; a--) {
            var ast = asteroids[a];
            //Fade out
            TweenLite.to( $( ast.div ), 0.5, { css: { opacity:0 }, delay:Math.random()*.5, onComplete: removeElement, onCompleteParams:[ast.div] } );
            //Remove from game loop
            asteroids.splice(a,1);
        }

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
