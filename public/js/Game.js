function Game() {

    var ROUND_DURATION = 75;
    var LOBBY_DURATION = 41;

    var currentFrameRequest = 0;
    var flyers = [];
    var asteroids = [];
    var droppers = [];
    var stageDiv = {};
    var stageBounds = {};
    var roundCountdown = -LOBBY_DURATION;
    var winCallback;
    var loseCallback;
    var pointsCallback;
    var stunCallback;
    var trackCallback;

    /* ============== */
    /* PUBLIC METHODS */
    /* ============== */

    this.init = function(_stageDiv) {

        stageDiv = _stageDiv;
        this.start();

    };

    this.setCallbacks = function(win, lose, points, stun, track){
        winCallback = win;
        loseCallback = lose;
        pointsCallback = points;
        stunCallback = stun;
        trackCallback = track;
    };

    this.start = function() {

        //Start game loop
        currentFrameRequest = window.requestAnimationFrame(gameLoop);

        //Begin releasing asteroids
        setInterval(function(){

            if (flyers.length > 0 && roundCountdown > 0) {
                releaseAsteroid();

                //Extra asteroids for more players
                for (var i = 0; i < Math.floor(flyers.length/3); i++) {

                    releaseAsteroid();

                }

            }

        }, 4500);

        //Begin updating scoreboard & round countdowns
        setInterval(function(){

            if (flyers.length > 0) updateScoreboard();

            if (roundCountdown < 0) {

                roundCountdown ++;

                $("#round-countdown").text(Math.abs(roundCountdown));

                if (roundCountdown === 0) {

                    startRound();

                }

            } else if (roundCountdown > 0) {

                roundCountdown--;

                //Only display countdown below 15 seconds
                if (roundCountdown <= 15) {
                    $("#game-countdown").text(Math.abs(roundCountdown));
                }

                if (roundCountdown === 0) {

                    endRound();

                }
            }

        }, 1000);

    };

    this.stop = function() {

        //Stop game loop
        window.cancelAnimationFrame(currentFrameRequest);

        //TODO: If this ever gets used, stop all timers

    };

    this.setBounds = function(x,y,w,h) {

        stageBounds = {left:x, ceil:y, floor:h, right:w};
        stageBounds.floor -= 46; //padding for flyer height

    };

    this.addPlayer = function(data){

        console.log('Game.addPlayer: ' + data.nickname );

        //Add new flyer div to stage
        $(stageDiv).append('<div id="flyer_'+data.userid+'" class="flyer" ><p style="color:'+data.usercolor+';">'+data.nickname+'</p><img id="fist" src="img/hero_fist.png"/><img id="idle" src="img/hero_idle.png"/><img id="fly" src="img/hero_fly.png"/></div>');
        var flyerDiv = $( '#flyer_'+data.userid );

        //Pop in
        var startX = Math.random()*(stageBounds.right-100) + 50;
        var startY = Math.random()*(stageBounds.floor-300) + 50;
        TweenLite.set( $( flyerDiv ), { css: { left:startX, top:startY } } );
        TweenLite.from( $( flyerDiv ), 1, { css: { scale:0 }, ease:Elastic.easeOut } );

        //Flash colored ring around new player for a few seconds
        var highlightRing = $('<div class="highlightRing" style="color:'+data.usercolor+';"></div>');
        $(flyerDiv).append(highlightRing);
        TweenMax.set( $( highlightRing ), { css: { opacity:0.0 } } );
        TweenMax.to( $( highlightRing ), 0.2, { css: { opacity:1, scale:0.9 }, ease:Power1.easeOut, delay:0.3, repeat:11, yoyo:true, onComplete: removeElement, onCompleteParams:[highlightRing] } );

        //Add to game loop
        var newFlyer = {    'userid':data.userid,
                            'socketid':data.socketid,
                            'div':flyerDiv,
                            'flyDiv':$(flyerDiv).children("#fly"),
                            'idleDiv':$(flyerDiv).children("#idle"),
                            'nickname':data.nickname,
                            'color':data.usercolor,
                            'score':0,
                            'stunned':false,
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

    };

    this.removePlayer = function(data){

        console.log('Game.removePlayer: ' + data.nickname );

        //Remove flyer from both stage and game loop
        var flyer = lookupFlyer(data.userid);
        if (flyer !== undefined) $(flyer.div).remove();

        for( i=flyers.length-1; i>=0; i--) {
            if( flyers[i].userid == data.userid ) flyers.splice(i,1);
        }

    };

    this.controlVector = function(data) {

        // console.log('Game.controlVector by player: ' + data.nickname + ". Angle: " + data.angle + ". Magnitude: " + data.magnitude );

        var f = lookupFlyer(data.userid);
        if (f === undefined) return;

        if (data.magnitude === 0) {
            //No acceleration
            f.gas = false;
            f.ax = f.ay = 0;
        } else {
            //Apply acceleration
            f.gas = true;
            f.ax = data.magnitude * Math.cos(data.angle) * 0.8;
            f.ay = data.magnitude * Math.sin(data.angle) * 0.8;
        }

    };

    this.controlTap = function(data) {

        var f = lookupFlyer(data.userid);
        if (f === undefined) return;
        if (f.stunned) return;

        //Swing fist
        TweenLite.set( $( f.div ).children('#fist'), { css: { rotation: -60 * f.dir, opacity: 1, transformOrigin:"50% 100% 0" } });
        TweenMax.to( $( f.div ).children('#fist'), 0.4, { css: { rotation: 330 * f.dir, opacity: 0 }, ease: Power3.easeOut });

        //Destroy asteroids
        var pnts = smashAsteroids(f.x+17, f.y+25, f.dir);
        if(pnts > 0) {
            f.score += pnts;
            //Emit points event to scorer
            if(pointsCallback){
                pointsCallback.call(undefined, f.socketid);
            }
        }

        //Stun others
        var didStun = attemptStun(f);

    };

    /* =============== */
    /* PRIVATE METHODS */
    /* =============== */

    function gameLoop() {

        //Update game objects here...
        flyers.forEach(function(flyer){

            if (flyer.stunned === true) {
                //stunned flyer remains still
                flyer.vx = 0;
                flyer.vy = 0;
                return; //skip to next flyer
            }

            if (flyer.gas === true){

                flyer.flyDiv.show();
                flyer.idleDiv.hide();

            } else {

                flyer.flyDiv.hide();
                flyer.idleDiv.show();

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
            if (flyer.y >= stageBounds.floor + 30) {
                flyer.y = stageBounds.ceil - 70;
            } else if (flyer.y <= stageBounds.ceil - 70) {
                flyer.y = stageBounds.floor + 30;
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

    function smashAsteroids(mineX, mineY, smashDir) {

        var damageDealt = 0;

        for( a=asteroids.length-1; a>=0; a--) {

            var ast = asteroids[a];
            var aL = parseInt( $(ast.div).css('left'), 10) + (ast.diam * 0.5);
            var aT = parseInt( $(ast.div).css('top'), 10) + (ast.diam * 0.5);

            if ( dist( aL, aT, mineX, mineY ) < ast.diam * 1.15 ) {

                //Successful strike

                if (ast.diam < 200) {

                    //Normal asteroid requires one hit
                    damageDealt = ast.health;
                    ast.health = 0;
                    releasePoints(damageDealt, '#eee21c', aL - 10, aT - (ast.diam * 0.5) + 3, smashDir);

                } else {

                    //Monster asteroid requires multiple swings
                    damageDealt = 10 + Math.ceil(Math.random()*15);
                    ast.health -= damageDealt;
                    releasePoints(damageDealt, '#eee21c', aL - 10, aT - (ast.diam * 0.5) - 10, 0);

                }

                if (ast.health <= 0) {

                    //remove from stage
                    TweenLite.to( $( ast.div ), 0.3, { css: { opacity:0 }, onComplete: removeElement, onCompleteParams:[ast.div] } );

                    //remove from game loop
                    asteroids.splice(a,1);

                    //animate explosion
                    explodeAsteroid(aL - (ast.diam * 0.5), aT - (ast.diam * 0.25), ast.diam, smashDir);

                }

                return damageDealt;

            }
        }

        return damageDealt;

    }

    function attemptStun(attackingFlyer) {

        var didStun = false;
        var stunRadius = 70;

        var of;
        var oX;
        var oY;

        for( i=flyers.length-1; i>=0; i--) {

            //skip attacking flyer and stunned flyers
            if (flyers[i].userid == attackingFlyer.userid || flyers[i].stunned === true){
                continue;
            }

            of = flyers[i];
            oX = parseInt( $(of.div).css('left'), 10);
            oY = parseInt( $(of.div).css('top'), 10);

            if ( dist( oX, oY, attackingFlyer.x, attackingFlyer.y ) < stunRadius ) {

                //Successful stun!
                of.stunned = true;
                TweenMax.to( $( of.div ), 0.2, { css: { opacity:0.5 }, ease:Power2.easeInOut, repeat:12, yoyo:true, onComplete: liftStun, onCompleteParams:[of] } );

                if(stunCallback){
                    stunCallback.call(undefined, of.socketid);
                }

            }

        }

        return didStun;

    }

    function liftStun(flyer){
        flyer.stunned = false;
        TweenLite.set( $( flyer.div ), { css: { opacity:1 } } );
    }

    function startRound() {

        //Hide new-round screen
        $("#new-round").hide();
        roundCountdown = ROUND_DURATION;

        //Reset everyone's score
        resetScoreboard();

        //Dispatch game data for tracking
        if(trackCallback){
            var eventProps = {
                numPlayers: flyers.length,
                roundDuration: ROUND_DURATION
            };
            trackCallback.call(undefined, 'round-begin', eventProps);
        }

    }

    function endRound() {

        //Clear gameplay
        //Show new-round screen
        $("#new-round").show();
        roundCountdown = -LOBBY_DURATION;
        clearAsteroids();
        updateScoreboard();
        $("#game-countdown").text(" ");

        //Emit win event to top-scorer
        if(winCallback){
            winCallback.call(undefined, flyers[0].socketid);
        }

        //Emit lose event to every other player
        if(loseCallback){
            for (var i = 1; i < flyers.length; i++) {
                loseCallback.call(undefined, flyers[i].socketid);
            }
        }

        //Dispatch game data for tracking
        if(trackCallback){
            var eventProps = {
                numPlayers: flyers.length,
                winnerName: flyers[0].nickname,
                highScore: flyers[0].score,
                lowScore: flyers[flyers.length-1].score
            };
            trackCallback.call(undefined, 'round-complete', eventProps);
        }

    }

    function updateScoreboard() {

        //Sort by score
        flyers.sort(function(a,b) { return parseFloat(b.score) - parseFloat(a.score); } );

        if (roundCountdown > 0) {
            //OPTION: Could update in-game leaderboard here...
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
        var pDiv = $('<div class="puff-ring" style="color:'+flyer.color+'; background-color:'+flyer.color+';"></div>');
        $(stageDiv).append(pDiv);

        var p = polarity(flyer.ax);
        var tX = flyer.x + (p*-12) + 15;
        var tY = flyer.y + 55;

        //Starting point
        TweenLite.set( $( pDiv ), { css: { opacity: 0.35, left:tX, top:tY} } );

        tX += Math.random() * 16 - 8;
        tY += Math.random() * 10 - 5 + 10;

        //Scale and fade
        TweenLite.to( $( pDiv ), 0.15, { css: { left:tX, top:tY }, ease:Power3.easeOut } );
        TweenLite.to( $( pDiv ), 0.2, { css: { opacity:0.0 }, ease:Power3.easeIn, onComplete: removeElement, onCompleteParams:[pDiv] } );

    }

    function releasePoints(val, col, x, y, dir) {

        //add to stage
        var pDiv = $('<p class="points" style="color:'+col+';">+'+val+'</p>');

        $(stageDiv).append(pDiv);

        //Starting point
        TweenLite.set( $( pDiv ), { css: { left:x, top:y, scale:0.25 } } );

        //Target point
        x += Math.random()*80-40 + (dir * 115);
        y -= 45;

        //Scale and fade
        TweenLite.to( $( pDiv ), 0.35, { css: { scale:1, left:x, top:y }, ease:Power3.easeOut } );
        TweenLite.to( $( pDiv ), 0.5, { css: { opacity:0 }, delay:0.35, ease:Power1.easeIn, onComplete: removeElement, onCompleteParams:[pDiv] } );

    }

    function releaseAsteroid() {

        //Add new asteroid to stage
        var astType = '';
        var diam = 0;
        var healthNum = 1;
        var r = Math.random();

        if (r<0.5) {
            astType = 'c';
            healthNum = Math.ceil(Math.random()*3);
            diam = 160;
        } else if (r<0.85) {
            astType = 'b';
            diam = 150;
        } else if (r<0.975) {
            astType = 'd';
            diam = 165;
        } else {
            astType = 'a';
            diam = 490;
        }

        var aDiv = $('<div class="asteroid" style=""><img src="img/asteroids/'+astType+'-asteroid-dark.png"/></div>');

        $(stageDiv).append(aDiv);

        //Scale asteroids between 50-100% orig size
        var scale = 0.5 + (Math.random() * 0.5);
        diam *= scale;

        //Release point
        var startX = Math.random() * (stageBounds.right-60) + 30;
        var startY = Math.random() * (stageBounds.floor-60) + 30;
        TweenLite.set( $( aDiv ), { css: {scale:scale, left:startX, top:startY } } );

        var health = roundToNearest(diam/2, 5);

        //Pop in
        TweenLite.from( $( aDiv ), 1.5, { css: { scale:0, opacity:0 }, ease:Elastic.easeOut } );
        TweenLite.from( $( aDiv ), 10, { css: { left:startX + (Math.random()*200-100), top:startY + (Math.random()*200-100), rotation:Math.random()*90-45 } } );

        var ast = {"div":aDiv, "x":startX, "y":startY, "diam":diam, "health":health };
        asteroids.push(ast);

    }

    function explodeAsteroid(x, y, diam, dir) {

        //Replace with chunks of asteroid dispersing
        for (var i = 0; i < 5; i++) {
            var astNum = Math.ceil(Math.random()*6);

            var aDiv = $('<div class="asteroid" style=""><img src="img/asteroids/a'+astNum+'.png"/></div>');

            $(stageDiv).append(aDiv);

            //Starting point
            var scale = Math.random() * 0.15 + 0.2;
            if (diam > 300) scale *= 2;
            TweenLite.set( $( aDiv ), { css: { left:x, top:y, scale:scale } } );

            //Tween from center
            TweenLite.to( $( aDiv ), 0.4, { css: { left:(x + Math.random()*200-100) + (dir*100), top:(y + Math.random()*240-120), rotation:Math.random()*250-125}, ease:Power2.easeOut } );

            //Fade out and remove chunk
            TweenLite.to( $( aDiv ), 0.4, { css: { opacity:0 }, delay:0.1, onComplete: removeElement, onCompleteParams:[aDiv] } );

        }

    }

    function clearAsteroids() {

        for( a=asteroids.length-1; a>=0; a--) {
            var ast = asteroids[a];
            //Fade out
            TweenLite.to( $( ast.div ), 0.5, { css: { opacity:0 }, delay:Math.random() * 0.5, onComplete: removeElement, onCompleteParams:[ast.div] } );
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
    }
    function clamp(val, min, max) {
      return Math.min(Math.max(val, min), max);
    }
    function roundToNearest(val, n){
        return n * Math.round(val/n);
    }
    function polarity(x) {
        x = +x; // convert to a number
        if (x === 0 || isNaN(x)) {
            return x;
        }
        return x > 0 ? 1 : -1;
    }

}
