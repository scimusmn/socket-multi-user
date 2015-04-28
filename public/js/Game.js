function Game() {

    var currentFrameRequest = 0;

    /* ============== */
    /* PUBLIC METHODS */
    /* ============== */

    this.start = function() {

        //Start game loop
        currentFrameRequest = window.requestAnimationFrame(gameLoop);

    }

    this.stop = function() {

        //Start game loop
        window.cancelAnimationFrame(currentFrameRequest);

    }

    this.addPlayer = function(data){

        console.log('Game.addPlayer: ' + data.nickname );

    }

    this.removePlayer = function(data){

        console.log('Game.removePlayer: ' + data.nickname );

    }

    this.controlVector = function(data) {

        console.log('Game.controlVector by player: ' + data.nickname + ". Angle: " + data.angle + ". Magnitude: " + data.magnitude );

    }

    this.controlTap = function(data) {

        console.log('Game.controlTap by player: ' + data.nickname );

    }

    /* =============== */
    /* PRIVATE METHODS */
    /* =============== */

    function examplePrivateMethod() {

    }

    function gameLoop() {

        //Update game objects here...

        //Wait for next frame
        currentFrameRequest = window.requestAnimationFrame(gameLoop);

    }


}
