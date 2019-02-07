/*
loader.js
variable 'app' is in global scope - i.e. a property of window.
app is our single global object literal - all other functions and properties of 
the game will be properties of app.
*/
"use strict";

// if app exists use the existing copy
// else create a new empty object literal
var app = app || {};


window.onload = function(){
	console.log("window.onload called");
    app.main.myKeys = app.myKeys;
    app.main.Emitter = app.Emitter;
    app.sound.init();
    app.main.sound = app.sound;
	app.main.init();
};

window.onblur = function(){
    console.log("blur at " + Date());
    app.main.pauseGame();
};

window.onfocus = function(){
    console.log("focus at " + Date());
    app.main.resumeGame();
};