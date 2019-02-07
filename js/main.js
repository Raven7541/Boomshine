// main.js
// Dependencies: 
// Description: singleton object
// This object will be our main "controller" class and will contain references
// to most of the other objects in the game.

"use strict";

// if app exists use the existing copy
// else create a new object literal
var app = app || {};

/*
 .main is an object literal that is a property of the app global
 This object literal has its own properties and methods (functions)
 
 */
app.main = {
	//  properties
    WIDTH : 640, 
    HEIGHT: 480,
    canvas: undefined,
    ctx: undefined,
   	lastTime: 0, // used by calculateDeltaTime() 
    debug: false,
    paused: false,
    animationID: 0,
    gameState: undefined,
    roundScore: 0,
    totalScore: 0,
    
    sound: undefined,  // don't need it (loaded by main.js), but good reminder
    myKeys: undefined,
    Emitter: undefined,  // required? - loaded by main.js
    pulsar: undefined,
    exhaust: undefined,
    
    // Circles
    CIRCLE: Object.freeze({
        NUM_CIRCLES_START: 5,
        //NUM_CIRCLES_END: 40,
        START_RADIUS: 8,
        MAX_RADIUS: 45,
        MIN_RADIUS: 2,
        MAX_LIFETIME: 2.5,
        MAX_SPEED: 80,  // px per sec
        EXPLOSION_SPEED: 60,
        IMPLOSION_SPEED: 84
    }),
    CIRCLE_STATE: Object.freeze({  // fake enum, actually obj literal
        NORMAL: 0,
        EXPLODING: 1,
        MAX_SIZE: 2,
        IMPLODING: 3,
        DONE: 4
    }),
    xSpeed: 200,
    ySpeed: 160,
    fillStyle: "red",
    circles: [],  // aka circles: new Array()
    numCircles: this.NUM_CIRCLES_START,
    targetNum: 1,
    colors: ["#FD5B78", "#FF6037", "#FF9966", "#FFFF66", "#66FF66", "#50BFE6", "#FF6EFF", "#EE34D2"],
    
    // Game
    GAME_STATE: Object.freeze({  // fake enum, actually obj literal
        BEGIN: 0,
        DEFAULT: 1,
        EXPLODING: 2,
        ROUND_OVER: 3,
        REPEAT_LEVEL: 4,
        END: 5
    }),
    
    // Levels
    currentLevel: 0,
    FINAL_LEVEL: 8,  // there are 8 levels
    levels: [
        // Level 1
        {
            targetNum: 1,  // level score need to progress
            numCircles: 5, // standard circles
            failMessage: "Oh c'mon, this is easy!",
            winMessage: "Great job!"
        },
        
        // Level 2
        {
            targetNum: 3,
            numCircles: 10,
            failMessage: "Really?",
            winMessage: "You're getting the hang of it!"
        },
    
        // Level 3
        {
            targetNum: 5,
            numCircles: 15,
            failMessage: "You almost had it!",
            winMessage: "Now it's for real!"
        },
    
        // Level 4
        {
            targetNum: 9,
            numCircles: 20,
            failMessage: "So close!",
            winMessage: "Get ready for the next round!"
        },
        
        // Level 5
        {
            targetNum: 17,
            numCircles: 25,
            failMessage: "Having fun yet?",
            winMessage: "Almost to the final level!"
        },
        
        // Level 6
        {
            targetNum: 23,
            numCircles: 30,
            failMessage: "Almost!",
            winMessage: "Think you'll get a high score?"
        },
    
        // Level 7
        {
            targetNum: 27,
            numCircles: 35,
            failMessage: "Keep trying!",
            winMessage: "Here comes the final level!"
        },
    
        // Level 8
        {
            targetNum: 35,
            numCircles: 40,
            failMessage: "Screw it, click everywhere!",
            winMessage: "You did it! It's over!"
        }
    ],
    
    
    // methods
	init : function() 
    {
		console.log("app.main.init() called");
		// initialize properties
		this.canvas = document.querySelector('canvas');
		this.canvas.width = this.WIDTH;
		this.canvas.height = this.HEIGHT;
		this.ctx = this.canvas.getContext('2d');
		
         // hook up events
        this.canvas.onmousedown = this.doMousedown.bind(this);
        
        // set up the game and circles
        this.gameState = this.GAME_STATE.BEGIN;
        
		// start the game loop
		this.update();
	},
    
    // Reset everything!
    reset: function()
    {
        if (this.gameState == this.GAME_STATE.REPEAT_LEVEL)
        {
            // Restart, you fool!
            this.roundScore = 0;
            this.loadLevel(this.currentLevel);
            this.gameState = this.GAME_STATE.DEFAULT;
        }
        else if (this.currentLevel == this.FINAL_LEVEL-1)
        {
            // End the game
            this.gameState = this.GAME_STATE.END;
        }
        else if (this.currentLevel < this.FINAL_LEVEL)
        {
            // Load the next level
            this.currentLevel++;
            this.roundScore = 0;
            this.loadLevel(this.currentLevel);
        }
    },
	
	update: function()
    {
		// 1) LOOP
		// schedule a call to update()
	 	this.animationID = requestAnimationFrame(this.update.bind(this));
	 	
	 	// 2) PAUSED?
	 	// if so, bail out of loop
	 	if (this.paused)
        {
            this.drawPauseScreen(this.ctx);
            return;
        }
        
	 	// 3) HOW MUCH TIME HAS GONE BY?
	 	var dt = this.calculateDeltaTime();
	 	 
	 	// 4) UPDATE
	 	// move circles
        this.moveCircles(dt);
        this.checkForCollisions();  // collision check

		// 5) DRAW	
		// i) draw background
		this.ctx.fillStyle = "#04725D"; 
		this.ctx.fillRect(0,0,this.WIDTH,this.HEIGHT); 
	
		// ii) draw circles
        this.ctx.globalAlpha = 0.9;  // semi-transparent
		this.drawCircles(this.ctx);
	
		// iii) draw HUD
		this.ctx.globalAlpha = 1.0;  // back to normal
        this.drawHUD(this.ctx);
		
		// iv) draw debug info
		if (this.debug)
        {
			// draw dt in bottom right corner
			this.fillText(this.ctx, "dt: " + dt.toFixed(3), this.WIDTH - 150, this.HEIGHT - 10, "18pt courier", "white");
		}
        
        // 6) YOU CHEATER
        // if we are on start screen or round over screen
        if (this.gameState == this.GAME_STATE.BEGIN || this.gameState == this.GAME_STATE.ROUND_OVER)
        {
            // Shift and up key are both down (true)?
            if (this.myKeys.keydown[this.myKeys.KEYBOARD.KEY_UP] && this.myKeys.keydown[this.myKeys.KEYBOARD.KEY_SHIFT])
            {
                this.totalScore++;
                this.sound.playEffect();
            }
        }
		
	},
	
    
    //-------------
    // Basic methods
    //-------------
	fillText: function(ctx, string, x, y, css, color) 
    {
		ctx.save();
		// https://developer.mozilla.org/en-US/docs/Web/CSS/font
		ctx.font = css;
		ctx.fillStyle = color;
		ctx.fillText(string, x, y);
		ctx.restore();
	},
	
	calculateDeltaTime: function()
    {
		var now,fps;
		now = performance.now(); 
		fps = 1000 / (now - this.lastTime);
		fps = clamp(fps, 12, 60);
		this.lastTime = now; 
		return 1/fps;
	},
    
    
    //--------------
    // Game methods
    //--------------
    loadLevel: function(levelNum)
    {
        this.targetNum = this.levels[levelNum].targetNum;
        this.numCircles = this.levels[levelNum].numCircles;
        this.circles = this.makeCircles(this.numCircles);
    },
    
    drawHUD: function(ctx)
    {
        ctx.save();
        
        // Check if you're playing the game
        if (this.gameState != this.GAME_STATE.BEGIN)
        {
            // Draw score
            this.fillText(this.ctx, "Round score: " + this.roundScore + "/" + this.targetNum + " of " + this.numCircles, 20, 20, "14pt courier", "#ddd");
            this.fillText(this.ctx, "Total score: " + this.totalScore, this.WIDTH-200, 20, "14pt courier", "#ddd");
        }
        
        // React to game states!
        // Start!
        if (this.gameState == this.GAME_STATE.BEGIN)
        {
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            this.fillText(this.ctx, "Welcome to Boomshine!", this.WIDTH/2, this.HEIGHT/2-80, "30pt courier", "black");
            this.fillText(this.ctx, "To play, click on a circle.", this.WIDTH/2, this.HEIGHT/2-40, "20pt courier", "black");
            this.fillText(this.ctx, "Earn enough points to get to the next level.", this.WIDTH/2, this.HEIGHT/2, "17pt courier", "black");
            this.fillText(this.ctx, "Get " + this.targetNum + " out of " + this.levels[0].numCircles + " in this round", this.WIDTH/2, this.HEIGHT/2+40, "20pt courier", "white");
            this.fillText(this.ctx, "Click to start!", this.WIDTH/2, this.HEIGHT/2+130, "30pt courier", "black");
        }
        // Game over!
        if (this.gameState == this.GAME_STATE.END)
        {
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            this.fillText(this.ctx, "Game over!", this.WIDTH/2, this.HEIGHT/2, "30pt courier", "red");
            this.fillText(this.ctx, "Your final score is: " + this.totalScore + " points", this.WIDTH/2, this.HEIGHT/2+40, "20pt courier", "white");
            this.fillText(this.ctx, "Click to play again!", this.WIDTH/2, this.HEIGHT/2+80, "30pt courier", "white");
        }
        // Round over!
        if (this.gameState == this.GAME_STATE.ROUND_OVER)
        {
            ctx.save();
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            this.fillText(this.ctx, this.levels[this.currentLevel].winMessage, this.WIDTH/2, this.HEIGHT/2-60, "20pt courier", "red");
            this.fillText(this.ctx, "Click to continue", this.WIDTH/2, this.HEIGHT/2, "30pt courier", "white");
            if (this.currentLevel != this.FINAL_LEVEL-1)
            {
                this.fillText(this.ctx, "Get " + this.levels[this.currentLevel+1].targetNum + " out of " + this.levels[this.currentLevel+1].numCircles + " in this round", this.WIDTH/2, this.HEIGHT/2+60, "20pt courier", "white");
            }
        }
        // Did you fail?!
        if (this.gameState == this.GAME_STATE.REPEAT_LEVEL)
        {
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            this.fillText(this.ctx, this.levels[this.currentLevel].failMessage, this.WIDTH/2, this.HEIGHT/2-60, "20pt courier", "red");
            this.fillText(this.ctx, "Click to try again!", this.WIDTH/2, this.HEIGHT/2, "30pt courier", "white");
        }
        
        ctx.restore();
    },
    
    drawPauseScreen: function(ctx)
    {
        ctx.save();
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        this.fillText(this.ctx, "...PAUSED...", this.WIDTH/2, this.HEIGHT/2, "40pt courier", "white");
        ctx.restore();
    },
    
    doMousedown: function(e)
    {
        // Play music!
        this.sound.playBGAudio();
        
        // Get mouse!
        var mouse = getMouse(e);
        
        // Unpause on click
        if (this.paused)
        {
            this.paused = false;
            this.update();
            return;
        }
        
        // Only one!!!
        if (this.gameState == this.GAME_STATE.EXPLODING) return;
        
        // Round over? Just reset and add more!
        if (this.gameState == this.GAME_STATE.ROUND_OVER)
        {
            this.gameState = this.GAME_STATE.DEFAULT;
            this.reset();
            return;
        }
        
        // Start the game!
        if (this.gameState == this.GAME_STATE.BEGIN)
        {
            this.loadLevel(this.currentLevel);
            this.gameState = this.GAME_STATE.DEFAULT;
            return;
        }
        
        // Did you fail?!
        if (this.gameState == this.GAME_STATE.REPEAT_LEVEL)
        {
            this.reset();
            return;
        }
        
        // Did you beat the game?
        if (this.gameState == this.GAME_STATE.END)
        {
            this.currentLevel = 0;
            this.roundScore = 0;
            this.totalScore = 0;
            this.numCircles = 0;
            this.targetNum = 0;
            this.gameState = this.GAME_STATE.DEFAULT;
            this.loadLevel(this.currentLevel);
            return;
        }
        
        // Check on mouse
        this.checkCircleClicked(mouse);
    },
    
    checkForCollisions: function()
    {
        if (this.gameState == this.GAME_STATE.EXPLODING)
        {
            // collision check
            for (var i=0; i<this.circles.length; i++)
            {
                var c1 = this.circles[i];
                
                // Only do so if c1 explodes!
                if (c1.state === this.CIRCLE_STATE.NORMAL) continue;
                if (c1.state === this.CIRCLE_STATE.DONE) continue;
                
                for (var j=0; j<this.circles.length; j++)
                {
                    var c2 = this.circles[j];
                    
                    // Don't check if c2 is c1!
                    if (c1 === c2) continue;
                    
                    // Don't check if c2 explodes!
                    if (c2.state != this.CIRCLE_STATE.NORMAL) continue;
                    if (c2.state === this.CIRCLE_STATE.DONE) continue;
                    
                    // Fine, go ahead and check...
                    if (circlesIntersect(c1, c2))
                    {
                        this.sound.playEffect();
                        c2.state = this.CIRCLE_STATE.EXPLODING;
                        c2.xSpeed = c2.ySpeed = 0;
                        this.roundScore++;
                    }
                }
            }
            
            // Is the round over?
            var isOver = true;
            for (var i=0; i<this.circles.length; i++)
            {
                var c = this.circles[i];
                if (c.state != this.CIRCLE_STATE.NORMAL && c.state != this.CIRCLE_STATE.DONE)
                {
                    isOver = false;
                    break;
                }
            }
            
            if (isOver)
            {
                this.stopBGAudio();
                if (this.roundScore >= this.targetNum)
                {
                    this.gameState = this.GAME_STATE.ROUND_OVER;
                    this.totalScore += this.roundScore;
                }
                else
                {
                    this.gameState = this.GAME_STATE.REPEAT_LEVEL;
                }
            }
        }
    },
    
    pauseGame: function()
    {
        this.paused = true;
        this.stopBGAudio();  // quiet!
        
        // Stop!
        cancelAnimationFrame(this.animationID);
        this.update();  // update!
    },
    
    resumeGame: function()
    {
        // Stop!
        cancelAnimationFrame(this.animationID);
        
        this.paused = false;
        this.sound.playBGAudio();  // play music!
        
        // Restart!
        this.update();
    },
    
    stopBGAudio: function()
    {
        this.sound.stopBGAudio();
    },
    
    toggleDebug: function()
    {
        if (this.debug) this.debug = false;
        else this.debug = true;
    },
    
    
    //------------
    // Circles
    //------------
    // Make circles!
    makeCircles: function(num)
    {
        // Make them draw themselves!
        var circleDraw = function(ctx){
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2, false);
            ctx.closePath();
            ctx.fillStyle = this.fillStyle;
            ctx.fill();
            ctx.restore();
        };
        
        // Make them move!
        var circleMove = function(dt){
            this.x += this.xSpeed * this.speed * dt;
            this.y += this.ySpeed * this.speed * dt;
        };
        
        var array = [];
        debugger;
        for (var i=0; i<num; i++)
        {
            // make new obj literal
            var c = {};
            
            // add .x and .y properties
            // .x and .y are somewhere on canvas, with a minimum margin of START_RADIUS
            c.x = getRandom(this.CIRCLE.START_RADIUS * 2, this.WIDTH - this.CIRCLE.START_RADIUS * 2);
            c.y = getRandom(this.CIRCLE.START_RADIUS * 2, this.HEIGHT - this.CIRCLE.START_RADIUS * 2);
            
            // add radius property
            c.radius = this.CIRCLE.START_RADIUS;
            
            // getRandomUnitVector() is from utilities.js
            var randomVector = getRandomUnitVector();
            c.xSpeed = randomVector.x;
            c.ySpeed = randomVector.y;
            
            // more properties!!!
            c.speed = this.CIRCLE.MAX_SPEED;
            c.fillStyle = this.colors[i % this.colors.length];
            c.state = this.CIRCLE_STATE.NORMAL;
            c.lifetime = 0;
            c.draw = circleDraw;
            c.move = circleMove;
            
            // particle trail!
            //var pulsar = new this.Emitter();
            //pulsar.red = 255;
            //pulsar.green = Math.floor(getRandom(0, 255));
            //pulsar.blue = Math.floor(getRandom(0, 255));
            //pulsar.minXspeed = pulsar.minYspeed = -0.25;
            //pulsar.maxXspeed = pulsar.maxXspeed = 0.25;
            //pulsar.lifetime = 500;
            //pulsar.expansionRate = 0.05;
            //pulsar.numParticles = 50;
            //pulsar.xRange = 1;
            //pulsar.yRange = 1;
            //pulsar.useCircles = true;
            //pulsar.useSquares = false;
            //pulsar.createParticles({x:540, y:100});
            //c.pulsar = pulsar;
            
            Object.defineProperty(c, "fillStyle", {writable: false});
            
            // no more properties
            Object.seal(c);
            array.push(c);
        }
        
        return array;
    },
    
    // Draw circles!
    drawCircles: function(ctx)
    {
        // Is the level done?
        if (this.gameState == this.GAME_STATE.ROUND_OVER || 
            this.gameState == this.GAME_STATE.REPEAT_LEVEL || this.gameState == this.GAME_STATE.END)
        {
            this.ctx.globalAlpha = 0.25;
        }
        
        for(var i=0; i<this.circles.length; i++)
        {
            var c = this.circles[i];
            if (c.state === this.CIRCLE_STATE.DONE) continue;
            //if (c.pulsar)
            //{
            //    c.pulsar.updateAndDraw(ctx, {x:c.x, y:c.y});
            //}
            c.draw(ctx);
        }
    },
    
    // Move circles!
    moveCircles: function(dt)
    {
        for(var i=0; i<this.circles.length; i++)
        {
            var c = this.circles[i];
            
            // Check every state!
            if (c.state === this.CIRCLE_STATE.DONE) continue;
            
            if (c.state === this.CIRCLE_STATE.EXPLODING)
            {
                c.radius += this.CIRCLE.EXPLOSION_SPEED * dt;
                if (c.radius >= this.CIRCLE.MAX_RADIUS)
                {
                    c.state = this.CIRCLE_STATE.MAX_SIZE;
                    //console.log("circle #" + i + " hit max radius");  // debug
                }
                continue;
            }
            
            if (c.state === this.CIRCLE_STATE.MAX_SIZE)
            {
                c.lifetime += dt;  // in seconds
                if (c.lifetime >= this.CIRCLE.MAX_LIFETIME)
                {
                    c.state = this.CIRCLE_STATE.IMPLODING;
                    //console.log("circle #" + i + " hit max lifetime");  // debug
                }
                continue;
            }
            
            if (c.state === this.CIRCLE_STATE.IMPLODING)
            {
                c.radius -= this.CIRCLE.IMPLOSION_SPEED * dt;
                if (c.radius <= this.CIRCLE.MIN_RADIUS)
                {
                    //console.log("circle #" + i + " hit min radius. Bye!");  // debug
                    c.state = this.CIRCLE_STATE.DONE;
                    continue;
                }
            }
            
            c.move(dt);
            
            // Boundary check!
            if (this.circleHitLeftRight(c))
            {
                c.xSpeed *= -1;
                c.move(dt);  // boop
            }
            if (this.circleHitTopBottom(c))
            {
                c.ySpeed *= -1;
                c.move(dt);  // boop
            }
        }
    },
    
    // Click click
    checkCircleClicked: function(mouse)
    {
        // loop through array backwards (wait, what?)
        for (var i=this.circles.length-1; i>=0; i--)
        {
            var c = this.circles[i];
            
            // Check check
            if (pointInsideCircle(mouse.x, mouse.y, c))
            {
                this.sound.playEffect();
                c.xSpeed = c.ySpeed = 0;
                c.state = this.CIRCLE_STATE.EXPLODING;
                this.gameState = this.GAME_STATE.EXPLODING;
                this.roundScore++;
                break;  // one only!
            }
        }
    },
        
    // Boundary check
    circleHitLeftRight: function(c)
    {
        if (c.x <= c.radius || c.x >= this.WIDTH-c.radius)
        {
            return true;
        }
    },
    
    circleHitTopBottom: function(c)
    {
        if (c.y < c.radius || c.y > this.HEIGHT-c.radius)
        {
            return true;
        }
    }
	
    
    
}; // end app.main