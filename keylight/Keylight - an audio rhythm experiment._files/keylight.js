/**
 * This experiment originally used HTML5 Audio for the sounds but
 * I changed this to be Flash since browser implementation of the
 * <audio> element are not very reliable. Especially problematic
 * is the fact that some browsers do not take cache headers into 
 * account and instead fetch the audio assets repeatedly from the 
 * server causing delayed playback and high bandwidth costs.
 * 
 * http://hakim.se/experiments/html5/keylight/03/#177x702_188x638_199x577_210x519_249x523_212x518_217x476_229x424_260x423_290x424_317x426_371x427_379x468_387x513_395x553_405x604_415x653_422x711_460x679_491x644_522x673_557x706_572x653_584x604_595x549_602x503_613x463_622x421_717x416_706x466_694x516_686x563_680x613_673x664_665x711_686x563_732x551_774x546_758x501_740x456_791x595_810x648_826x702_1
 */
var KeylightWorld = new function() {
	
	var NUMBER_OF_CHANNELS = 12;
	var NUMBER_OF_CHORDS = 30;
	
	var NUMBER_OF_ROWS = 3;
	var NUMBER_OF_COLS = 10;
	
	var PLAYHEAD_MIN_SPEED = 1;
	var PLAYHEAD_MAX_SPEED = 6;
	
	var usera = navigator.userAgent.toLowerCase();
	var isMobile = (usera.indexOf('android') != -1) || (usera.indexOf('iphone') != -1);
	
	var worldRect = { x: 0, y: 0, width: 900, height: 600 };
	var map = { x: 160, y: 0, width: 580, height: 600 };
	
	var canvas;
	var context;
	var player;
	var paused;
	var intro;
	
	var keys = [];
	
	var playhead;
	var playheadSpeed = 3;
	
	var audioFiles = [];
	
	var mouseX = (window.innerWidth - worldRect.width);
	var mouseY = (window.innerHeight - worldRect.height);
	var mouseIsDown = false;
	
	// This is used to keep track of the users last interaction to stop playing sounds after lack of input (save bandwidth)
	var lastMouseMoveTime = new Date().getTime();
	
	var isDragging = false;
	
	this.init = function() {
		
		canvas = document.getElementById( 'world' );
		paused = document.getElementById( 'paused' );
		intro = document.getElementById( 'intro' );
		
		if (canvas && canvas.getContext) {
			
			for( var i = 1; i <= NUMBER_OF_CHORDS; i++ ) {
				audioFiles.push( 'http://hakim.se/experiments/html5/keylight/03/assets/' + i + '.mp3' );
			}
			
			context = canvas.getContext('2d');
			
			// Mouse events
			document.addEventListener('mousemove', documentMouseMoveHandler, false);
			document.addEventListener('mousedown', documentMouseDownHandler, false);
			document.addEventListener('mouseup', documentMouseUpHandler, false);
			canvas.addEventListener('dblclick', documentDoubleClickHandler, false);
			
			// Touch events
			document.addEventListener('touchstart', documentTouchStartHandler, false);
			document.addEventListener('touchmove', documentTouchMoveHandler, false);
			document.addEventListener('touchend', documentTouchEndHandler, false);
			
			// Keyboard events
			document.addEventListener('keydown', documentKeyDownHandler, false);
			
			// UI events
			document.getElementById('increaseSpeed').addEventListener('click', increaseSpeedClickHandler, false);
			document.getElementById('decreaseSpeed').addEventListener('click', decreaseSpeedClickHandler, false);
			document.getElementById('reset').addEventListener('click', resetClickHandler, false);
			document.getElementById('randomize').addEventListener('click', randomizeClickHandler, false);
			
			// Other events
			window.addEventListener('resize', windowResizeHandler, false);
			
			playhead = new Playhead();
			
			embedFlash();
			
			// Update the speed with a zero offset, this will enforce the max/min limits
			updateSpeed(0);
			
			// Force a window resize to position all elements
			windowResizeHandler();
			
			// Try to create keys from a possible deep link
			createKeysFromHash();
			
			// If there are no keys, show a intro to explain the usage
			if( keys.length == 0 ) {
				intro.style.display = 'block';
			}
			
			setInterval( loop, 1000 / 50 );
		}
	};
	
	function embedFlash() {
		var flashvars = {};
		var params = { allowScriptAccess: "always" };
		var attributes = { id: "soundSWF" };
		
		swfobject.embedSWF("swf/sound.swf", "sound", "1", "1", "9.0.0", "", flashvars, params, attributes, embedFlashStatusHandler );
	}
	
	function embedFlashStatusHandler(event) {
		if( event.success ) {
			player = document.getElementById('soundSWF');
		}
		else {
			// redirect to HTML version
			window.location = '../03b';
		}
	}
 
	function documentMouseMoveHandler(event) {
		updateMousePosition( event );
		
		lastMouseMoveTime = new Date().getTime();
		
		if( mouseIsDown && !isDragging ) {
			startDragging();
		}
	}
	
	function documentMouseDownHandler(event) {
		event.preventDefault();
		
		mouseIsDown = true;
		updateMousePosition( event );
	}
	
	function documentDoubleClickHandler(event) {
		event.preventDefault();
		
		updateMousePosition( event );
		
		stopDragging();
		
		createKey( mouseX, mouseY );
		
		updateKeysInHash();
	}
	
	function documentMouseUpHandler(event) {
		mouseIsDown = false;
		
		stopDragging();
		
		updateKeysInHash();
	}
	
	function documentTouchStartHandler(event) {
		if(event.touches.length == 1) {
			event.preventDefault();
			
			mouseIsDown = true;
			
			updateMousePosition( event );
		}
	}
	
	function documentTouchMoveHandler(event) {
		if(event.touches.length == 1) {
			event.preventDefault();

			updateMousePosition( event );
		}
		
		lastMouseMoveTime = new Date().getTime();
	}
	
	function documentTouchEndHandler(event) {
		mouseIsDown = false;
	}
	
	function documentKeyDownHandler(event) {
		switch( event.keyCode ) {
			case 40:
				updateSpeed( -1 );
				event.preventDefault();
				break;
			case 38:
				updateSpeed( 1 );
				event.preventDefault();
				break;
		}
	}
	
	function windowResizeHandler() {
		canvas.width = worldRect.width;
		canvas.height = worldRect.height;
		
		canvas.style.position = 'absolute';
		canvas.style.left = (window.innerWidth - canvas.width) * .5 + 'px';
		canvas.style.top = (window.innerHeight - canvas.height) * .5 + 'px';
		
		paused.style.position = 'absolute';
		paused.style.top = (window.innerHeight - 60) * .5 + 'px';
		paused.style.left = (window.innerWidth - worldRect.width) * .5 + 'px';
		
		intro.style.position = 'absolute';
		intro.style.top = (window.innerHeight - 60) * .5 + 'px';
		intro.style.left = (window.innerWidth - worldRect.width) * .5 + 'px';
	}
	
	// Convenience method called from many mouse event handles to update the current mouse position
	function updateMousePosition(event) {
		mouseX = event.clientX - (window.innerWidth - worldRect.width) * .5;
		mouseY = event.clientY - (window.innerHeight - worldRect.height) * .5;
	}
	
	// Updates the keys in the hash (url suffix) to reflect the current state
	function updateKeysInHash() {
		var hash = '';
		
		for (var i = 0, len = keys.length; i < len; i++) {
			if( i > 0 ) {
				hash += '_';
			}
			
			// Scale the position to 0-1*100 and append to the hash.
			// (0-1 for scalabilty of the UI and *100 to avoid decimals in the hash)
			hash += Math.round((keys[i].position.x/worldRect.width)*1000) + 'x' + Math.round((keys[i].position.y/worldRect.height)*1000);
		}
		
		// If a valid hash has been generated, append the speed
		if( hash != '' ) {
			hash += '_'+playheadSpeed.toString();
		}
		
		document.location.href = '#' + hash;
	}
	
	function createKeysFromHash() {
		// Split the hash by its delimiter
		var rawKeys = document.location.href.slice(document.location.href.indexOf('#') + 1).split('_');
		
		var k, x, y;
		
		while( rawKeys && rawKeys.length ) {
			
			// Fetch the next key and split it by the delimiter resulting in [x,y]
			k = rawKeys.shift().split( 'x' );
			
			// If there's two values in this segment, we are looking at a key position
			if( k.length == 2 ) {
				// The position is in a 0-1*100 scale, revert that into pixels
				x = parseInt(k[0]) / 1000 * worldRect.width;
				y = parseInt(k[1]) / 1000 * worldRect.height;
				
				if( !isNaN(x) && !isNaN(y) ) {
					createKey( x, y );
				}
			}
			else {
				// Get the speed value if any
				if( !isNaN( parseInt( k[0] ) ) ) {
					playheadSpeed = parseInt( k[0] );
					updateSpeed(0); // Update with a zero offset to force bounds check
				}
			}
		}
	}
	
	function resetClickHandler(event) {
		event.preventDefault();
		keys = [];
		
		updateKeysInHash();
	}
	
	function randomizeClickHandler(event) {
		event.preventDefault();
		keys = [];
		
		intro.style.display = 'none';
		
		var q = Math.round( 4 + Math.random() * 8 );
		
		while( q-- ) {
			var key = new Key();
			
			key.position.x = 40 + (Math.random() * worldRect.width - 80);
			key.position.y = 40 + (Math.random() * worldRect.height - 80);
			
			keys.push( key );
		}
		
		playheadSpeed = PLAYHEAD_MIN_SPEED;
		
		updateSpeed( Math.round( Math.random() * (PLAYHEAD_MAX_SPEED-PLAYHEAD_MIN_SPEED) ) );
		
		updateKeysInHash();
	}
	
	function increaseSpeedClickHandler(event) {
		event.preventDefault();
		updateSpeed(1);
		
		updateKeysInHash();
	}
	function decreaseSpeedClickHandler(event) {
		event.preventDefault();
		updateSpeed(-1);
		
		updateKeysInHash();
	}
	
	// Updates the current speed while restricting to limits, also updates the UI to reflect the change
	function updateSpeed( offset ) {
		playheadSpeed += offset;
		playheadSpeed = Math.min( Math.max( playheadSpeed, PLAYHEAD_MIN_SPEED ), PLAYHEAD_MAX_SPEED );
		
		document.getElementById( 'speedDisplay' ).innerHTML = playheadSpeed + '/' + PLAYHEAD_MAX_SPEED;
	}
	
	function startDragging() {
		var closestDistance = 9999;
		var currentDistance = 9999;
		var closestIndex = -1;
		
		for( var i = 0, len = keys.length; i < len; i++ ) {
			var key = keys[i];
			
			currentDistance = key.distanceTo( { x: mouseX, y: mouseY } );
			
			if( currentDistance < closestDistance && currentDistance < 40 ) {
				closestDistance = currentDistance;
				closestIndex = i;
			}
		}
		
		if( keys[closestIndex] ) {
			keys[closestIndex].dragging = true;
			
			isDragging = true;
		}
	}
	
	function stopDragging() {
		for (var i = 0, len = keys.length; i < len; i++) {
			keys[i].dragging = false;
		}
		
		isDragging = false;
	}
	
	// Returns a cell from a point. This point must be within the worldRect
	function getCellFromPoint( p ) {
		var i, j;
		
		var cellW = worldRect.width / (NUMBER_OF_COLS-1);
		var cellH = worldRect.height / (NUMBER_OF_ROWS);
		
		exitLoop: for( i = 0; i < NUMBER_OF_ROWS; i++ ) {
			for( j = 0; j < NUMBER_OF_COLS-1; j++ ) {
				if( p.x > j * cellW && p.x < j * cellW + cellW && p.y > i * cellH && p.y < i * cellH + cellH ) {
					break exitLoop;
				}
			}
		}
		
		return { x: j, y: i };
	}
	
	function createKey( x, y ) {
		intro.style.display = 'none';
		
		var key = new Key();
		
		key.position.x = x;
		key.position.y = y;
		
		keys.push( key );
	}
	
	// Updates the color of a key to reflect a position [left = red, mid = green, right = blue]
	function updateKeyColor( key, x, y ) {
		var centerX = (worldRect.width / 2);
		
		key.color.r = 63 + Math.round( ( 1 - Math.min( x / centerX, 1 ) ) * 189 );
		key.color.g = 63 + Math.round( Math.abs( (x > centerX ? x-(centerX*2) : x) / centerX ) * 189 );
		key.color.b = 63 + Math.round( Math.max(( ( x - centerX ) / centerX ), 0 ) * 189 );
	}
	
	function playChord( index ) {
		//player.playSound(audioFiles[index]);
	}

	function loop() {
		
		if( new Date().getTime() - lastMouseMoveTime > 1000 * 50 && keys.length > 1 ) {
			paused.style.display = 'block';
			return;
		}
		else {
			paused.style.display = 'none';
		}
		
		context.clearRect(worldRect.x, worldRect.y, worldRect.width, worldRect.height);
		
		var key, particle, color, i, ilen, j, jlen;
		var deadKeys = [];
		
		for (i = 0, ilen = keys.length; i < ilen; i++) {
			key = keys[i];
			
			// Are there any particles we need to process for this key?
			if( key.particles.length > 0 ) {
				
				for (j = 0, jlen = key.particles.length; j < jlen; j++) {
					if( Math.random()>0.4) {
						particle = key.particles[j];
						
						particle.position.x += particle.velocity.x;
						particle.position.y += particle.velocity.y;
						
						particle.velocity.x *= 0.97;
						particle.velocity.y *= 0.97;
						
						particle.rotation += particle.velocity.r;
						
						var x = particle.position.x + Math.cos( particle.rotation ) * particle.rotationRadius;
						var y = particle.position.y + Math.sin( particle.rotation ) * particle.rotationRadius;
						
						context.beginPath();
						context.fillStyle = 'rgba('+key.color.r+','+key.color.g+','+key.color.b+','+(0.3+(Math.random()*0.7))+')';
						context.arc(x, y, Math.max(1*key.scale,0.5), 0, Math.PI*2, true);
						context.fill();
					}
				}
				
				if( Math.random() > 0.75 ) {
					key.particles.shift();
				}
				
				while( key.particles.length > 35 ) {
					key.particles.shift();
				}
				
				// TODO: There is a bug causing the next shape drawn after this point to flicker, 
				// resetting the fill to a full alpha color works for now
				context.fillStyle = "#ffffff";
			}
			
			key.scale = 0;
			key.scale += Math.max(Math.min((key.position.y/(map.y+map.height)),1),0);
			key.scale = Math.max(key.scale,0.2);
			
			var backHeight = 98;
			
			key.reflection.x = key.position.x;
			key.reflection.y = Math.max( key.position.y + (backHeight-(backHeight*key.scale)), backHeight );
			
			var sideScale = 1 - Math.max( ( (key.position.y-backHeight) / (worldRect.height-backHeight) ), 0 );
			var sideWidth = map.x * sideScale;
			
			var xs;
			
			if( key.position.x < sideWidth ) {
				xs = 1 - ( key.position.x/sideWidth );
				key.scale += xs;
				key.reflection.y += (worldRect.height-key.position.y)*key.scale*xs;
			}
			else if( key.position.x > worldRect.width - sideWidth ) {
				xs = ( key.position.x - worldRect.width + sideWidth ) / ( worldRect.width - worldRect.width + sideWidth );
				key.scale += xs;
				key.reflection.y += (worldRect.height-key.position.y)*key.scale*xs;
			}
			
			key.scale = Math.min( Math.max( key.scale, 0 ), 1 );
			
			sideScale = 1 - Math.max( ( (key.reflection.y-backHeight) / (worldRect.height-backHeight) ), 0 );
			sideWidth = map.x * sideScale;
			
			key.reflection.x = Math.max( Math.min( key.reflection.x, worldRect.width - sideWidth ), sideWidth );
			
			color = context.createRadialGradient(key.position.x, key.position.y, 0, key.position.x, key.position.y, key.size.current);
			color.addColorStop(0,'rgba('+key.color.r+','+key.color.g+','+key.color.b+','+key.color.a+')');
			color.addColorStop(1,'rgba('+key.color.r+','+key.color.g+','+key.color.b+','+key.color.a*0.7+')');
			
			context.beginPath();
			context.fillStyle = color;
			context.arc(key.position.x, key.position.y, key.size.current*key.scale, 0, Math.PI*2, true);
			context.fill();
			
			color = context.createRadialGradient(key.reflection.x, key.reflection.y, 0, key.reflection.x, key.reflection.y, key.size.current*key.scale*2);
			color.addColorStop(0,'rgba('+key.color.r+','+key.color.g+','+key.color.b+','+key.color.a*0.06+')');
			color.addColorStop(1,'rgba('+key.color.r+','+key.color.g+','+key.color.b+',0)');
			
			context.beginPath();
			context.fillStyle = color;
			context.arc(key.reflection.x, key.reflection.y, key.size.current*key.scale*2, 0, Math.PI*2, true);
			context.fill();
			
			if( key.dragging ) {
				key.position.x += ( mouseX - key.position.x ) * 0.2;
				key.position.y += ( mouseY - key.position.y ) * 0.2;
			}
			else if( key.position.x < worldRect.x || key.position.x > worldRect.width || key.position.y < worldRect.y || key.position.y > worldRect.height ) {
				deadKeys.push( i );
			}
			
			key.size.current += ( key.size.target - key.size.current ) * 0.2;
			
			// Sync the color of the key with the current position
			updateKeyColor( key, key.position.x, key.position.y );
		}
		
		while (deadKeys.length) {
			keys.splice( deadKeys.pop(), 1 );
		}
		
		// The playhead can only be rendered if there are at least two keys
		if( keys.length > 1 ) {
			if( playhead.index > keys.length - 1 ) {
				playhead.index = 0;
			}
			
			var attractor = keys[playhead.index];
			
			if( attractor.position.x < 0 || attractor.position.x > worldRect.width || attractor.position.y < 0 || attractor.position.y > worldRect.height ) {
				// Increment index by one but make sure its within bounds
				playhead.index = playhead.index + 1 > keys.length - 1 ? 0 : playhead.index + 1;
			}
			
			var point = { x: playhead.getPosition().x, y: playhead.getPosition().y, scale: attractor.scale, rx: playhead.getPosition().rx, ry: playhead.getPosition().ry };
			
			point.x += ( attractor.position.x - playhead.getPosition().x ) * playheadSpeed / 12;
			point.y += ( attractor.position.y - playhead.getPosition().y ) * playheadSpeed / 12;
			
			point.rx += ( attractor.reflection.x - playhead.getPosition().rx ) * playheadSpeed / 12;
			point.ry += ( attractor.reflection.y - playhead.getPosition().ry ) * playheadSpeed / 12;
			
			playhead.addPosition( point );
			
			if( playhead.distanceTo( attractor.position ) < Math.min( attractor.size.current * attractor.scale, 5 ) ) {
				// Increment index by one but make sure its within bounds
				playhead.index = playhead.index + 1 > keys.length - 1 ? 0 : playhead.index + 1;
				
				// Inherit color from the attractor
				playhead.color = attractor.color;
				
				// Emit any extra effects at collision
				attractor.emit( keys[playhead.index].position );
				
				// Determine the signal of this sound depending on position
				var signal = { x: attractor.position.x / worldRect.width, y: attractor.position.y / worldRect.height };
				
				// Make sure the signal is within bounds (0-1)
				signal.x = Math.max( Math.min( signal.x, 1 ), 0 );
				signal.y = Math.max( Math.min( signal.y, 1 ), 0 );
				
				// Play back the chord representing the cell that the attractor is in
				player.playSound( signal.x, signal.y );
			}
			
			// Set the color of the playhead
			color = 'rgba('+playhead.color.r+','+playhead.color.g+','+playhead.color.b+',1)';
			
			var cp = playhead.positions[ 0 ];
			var np = playhead.positions[ 1 ];
			
			if( cp && np ) {
				context.beginPath();
				context.strokeStyle = color;
				
				context.lineWidth = 2 * cp.scale;
				context.moveTo( cp.x + ( np.x - cp.x ) / 2, cp.y + ( np.y - cp.y ) / 2 );
				
				for( i = 1, len = playhead.positions.length-1; i < len; i++ ) {
					cp = playhead.positions[i];
					np = playhead.positions[i+1];
					
					context.quadraticCurveTo( cp.x, cp.y, cp.x + ( np.x - cp.x ) / 2, cp.y + ( np.y - cp.y ) / 2 );
				}
				
				context.stroke();
				
				cp = playhead.positions[ 0 ];
				np = playhead.positions[ 1 ];
				
				color = 'rgba('+playhead.color.r+','+playhead.color.g+','+playhead.color.b+',0.1)';
				
				context.beginPath();
				context.strokeStyle = color;
				
				context.lineWidth = 1.8 * cp.scale;
				context.moveTo( cp.rx + ( np.rx - cp.rx ) / 2, cp.ry + ( np.ry - cp.ry ) / 2 );
				
				for( i = 1, len = playhead.positions.length-1; i < len; i++ ) {
					cp = playhead.positions[i];
					np = playhead.positions[i+1];
					
					context.quadraticCurveTo( cp.rx, cp.ry, cp.rx + ( np.rx - cp.rx ) / 2, cp.ry + ( np.ry - cp.ry ) / 2 );
				}
				
				context.stroke();
			}
			
			context.lineTo(np.x,np.y);
		} 
		
	}
		
	
};

/**
 * 
 */
function Point() {
	this.position = { x: 0, y: 0 };
}
Point.prototype.distanceTo = function(p) {
	var dx = p.x-this.position.x;
	var dy = p.y-this.position.y;
	return Math.sqrt(dx*dx + dy*dy);
};
Point.prototype.clonePosition = function() {
	return { x: this.position.x, y: this.position.y };
};

/**
 * 
 */
function Key() {
	this.position = { x: 0, y: 0 };
	this.reflection = { x: 0, y: 0 };
	this.color = { r: 0, g: 0, b: 0, a: 1 };
	this.size = { current: 0, target: 16 };
	this.scale = 1;
	this.dragging = false;
	this.particles = [];
}
Key.prototype = new Point();
Key.prototype.emit = function( direction ) {
	
	this.size.current = 12;
	
	var q = 20 + Math.round( Math.random()*20 );
	var i, p, dx, dy;
	
	for( i = 0; i < q; i++ ) {
		p = new Particle();
		
		p.position = this.clonePosition();
		
		dx = direction.x - p.position.x;
		dy = direction.y - p.position.y;
		
		p.position.x += dx * (0.6*(i/q));
		p.position.y += dy * (0.6*(i/q));
		
		var rr = ((dx+dy)/500) * (i/q);
		
		p.position.x += -rr + Math.random() * (rr+rr);
		p.position.y += -rr + Math.random() * (rr+rr);
		
		p.velocity.x = dx/(100+(Math.random()*500));
		p.velocity.y = dy/(100+(Math.random()*500));
		p.velocity.r = -0.1 + Math.random() * 0.2;
		
		p.rotationRadius = Math.random() * 12;
		
		this.particles.push( p );
	}
};

/**
 * 
 */
function Particle() {
	this.position = { x: 0, y: 0 };
	this.velocity = { x: 0, y: 0, r: 0 };
	this.rotation = 0;
	this.rotationRadius = 0;
}
Particle.prototype = new Point();

/**
 * 
 */
function Playhead() {
	this.positions = [ {x: 0, y: 0, rx: 0, ry: 0, scale: 1} ]; // rx & ry = reflectionX/Y
	this.index = 0;
	this.size = 2;
	this.length = 5;
	this.color = { r: 0, g: 0, b: 0, a: 0.8 };
}
Playhead.prototype.distanceTo = function(p) {
	var position = this.getPosition();
	
	var dx = p.x-position.x;
	var dy = p.y-position.y;
	return Math.sqrt(dx*dx + dy*dy);
};
Playhead.prototype.addPosition = function(p) {
	while( this.positions.length > this.length ) {
		this.positions.shift();
	}
	
	this.positions.push( p );
};
Playhead.prototype.getPosition = function() {
	return this.positions[this.positions.length-1];
};



KeylightWorld.init();
	
	