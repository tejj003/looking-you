let eyes = [];

let h_amt;
let v_amt;

let spacing;
let hs3 = Math.sqrt(3)/2; //half sqrt 3

let video;
let targetColor;
let trackedX = 0;
let trackedY = 0;
let smoothTrackedX = 0;
let smoothTrackedY = 0;
let showVideo = true; // Toggle with 'v' key

// Add variables for better tracking
let prevFrame;
let colorThreshold = 50;
let lastValidX = 0;
let lastValidY = 0;

// Motion detection variables
let motionX = 0;
let motionY = 0;
let motionAmount = 0;

// Tracking history for smoothing
let trackingHistory = [];
let historySize = 10; // Increased for better smoothing

// Velocity tracking for prediction
let velocityX = 0;
let velocityY = 0;
let accelerationX = 0;
let accelerationY = 0;

// Advanced tracking parameters
let trackingQuality = 0;
let lostFrames = 0;
let searchRadius = 50;

function setup() {
	createCanvas(windowWidth, windowHeight);
	background("#8B0000"); // Changed from blue to dark red
	noStroke();
	
	// Setup video capture
	video = createCapture(VIDEO);
	video.size(320, 240);
	video.hide(); // Hide the video element
	
	// Initialize previous frame for motion detection
	prevFrame = createImage(video.width, video.height);
	prevFrame.loadPixels();
	
	// Initialize target color (red by default - look for something red)
	targetColor = color(255, 0, 0);
	
	// Initialize smoothed tracking position to center
	smoothTrackedX = width / 2;
	smoothTrackedY = height / 2;
	trackedX = width / 2;
	trackedY = height / 2;
	lastValidX = width / 2;
	lastValidY = height / 2;
	
	// Initialize tracking history with more sophisticated structure
	for (let i = 0; i < historySize; i++) {
		trackingHistory.push({
			x: width / 2, 
			y: height / 2,
			confidence: 1.0,
			timestamp: millis()
		});
	}
	
	// Calculate grid size with larger spacing for bigger eyes
	spacing = min(width, height) / 6; // Keep the same eye size
	h_amt = ceil(width / spacing) + 1; // Use ceil to ensure full coverage
	v_amt = ceil(height / spacing) + 1;
	
	// Create eyes to fill entire screen with centered grid
	eyes = [];
	let offsetX = (width - (h_amt - 1) * spacing) / 2;
	let offsetY = (height - (v_amt - 1) * spacing) / 2;
	
	for(let x = 0; x < h_amt; x++){
		let col = [];
		for(let y = 0; y < v_amt; y++){
			col.push(new Eye(x, y, offsetX, offsetY));
		}
		eyes.push(col);
	}
}

function draw() {
	background("#8B0000"); // Changed to dark red
	
	// Load video pixels
	video.loadPixels();
	prevFrame.loadPixels();
	
	// Predict next position based on velocity and acceleration
	let predictedX = smoothTrackedX + velocityX + accelerationX * 0.5;
	let predictedY = smoothTrackedY + velocityY + accelerationY * 0.5;
	
	// Motion detection
	let motionSumX = 0;
	let motionSumY = 0;
	let motionPixels = 0;
	
	// Color tracking with motion assistance
	let sumX = 0;
	let sumY = 0;
	let sumWeight = 0;
	let count = 0;
	
	// Region of Interest (ROI) based tracking
	let roiX = map(predictedX, 0, width, 0, video.width);
	let roiY = map(predictedY, 0, height, 0, video.height);
	let currentSearchRadius = searchRadius * (1 + lostFrames * 0.1); // Expand search when lost
	
	// Combined motion and color detection with ROI
	for (let y = 0; y < video.height; y += 2) {
		for (let x = 0; x < video.width; x += 2) {
			let index = (x + y * video.width) * 4;
			
			// Current pixel color
			let r = video.pixels[index];
			let g = video.pixels[index + 1];
			let b = video.pixels[index + 2];
			
			// Previous frame pixel color
			let pr = prevFrame.pixels[index];
			let pg = prevFrame.pixels[index + 1];
			let pb = prevFrame.pixels[index + 2];
			
			// Motion detection
			let motionDiff = abs(r - pr) + abs(g - pg) + abs(b - pb);
			if (motionDiff > 30) { // Motion threshold
				motionSumX += x;
				motionSumY += y;
				motionPixels++;
			}
			
			// Calculate distance from predicted position
			let distFromPrediction = dist(x, y, roiX, roiY);
			let inROI = distFromPrediction < currentSearchRadius;
			
			// Color tracking with spatial weighting
			let colorDist = dist(r, g, b, red(targetColor), green(targetColor), blue(targetColor));
			
			if (colorDist < colorThreshold) {
				// Combine color matching with motion and spatial weighting
				let weight = 1.0 - (colorDist / colorThreshold);
				weight = weight * weight;
				
				// Spatial weighting - closer to prediction gets higher weight
				if (inROI) {
					let spatialWeight = 1.0 - (distFromPrediction / currentSearchRadius);
					weight *= (1 + spatialWeight);
				}
				
				// Boost weight if there's motion at this pixel
				if (motionDiff > 20) {
					weight *= 1.5;
				}
				
				sumX += x * weight;
				sumY += y * weight;
				sumWeight += weight;
				count++;
			}
		}
	}
	
	// Calculate motion center
	if (motionPixels > 50) {
		motionX = motionSumX / motionPixels;
		motionY = motionSumY / motionPixels;
		motionAmount = motionPixels;
	}
	
	// Update tracked position with advanced filtering
	let newTrackedX = smoothTrackedX;
	let newTrackedY = smoothTrackedY;
	let currentConfidence = 0;
	
	if (count > 10 && sumWeight > 0) {
		// Calculate weighted centroid
		let centroidX = sumX / sumWeight;
		let centroidY = sumY / sumWeight;
		
		// Map video coordinates to canvas coordinates with MIRROR effect
		newTrackedX = map(centroidX, 0, video.width, width, 0);
		newTrackedY = map(centroidY, 0, video.height, 0, height);
		
		// Calculate confidence based on pixel count and weight
		currentConfidence = min(1.0, (count / 100) * (sumWeight / count / 2));
		
		// Reset lost frames counter
		lostFrames = 0;
		searchRadius = max(30, searchRadius * 0.95); // Shrink search radius when tracking well
		
		// Add to tracking history with timestamp
		trackingHistory.shift();
		trackingHistory.push({
			x: newTrackedX, 
			y: newTrackedY,
			confidence: currentConfidence,
			timestamp: millis()
		});
		
		// Calculate weighted average with confidence and time decay
		let avgX = 0;
		let avgY = 0;
		let totalWeight = 0;
		let currentTime = millis();
		
		for (let i = 0; i < trackingHistory.length; i++) {
			let age = (currentTime - trackingHistory[i].timestamp) / 1000; // Age in seconds
			let timeWeight = exp(-age * 0.5); // Exponential decay
			let positionWeight = (i / trackingHistory.length) * trackingHistory[i].confidence * timeWeight;
			
			avgX += trackingHistory[i].x * positionWeight;
			avgY += trackingHistory[i].y * positionWeight;
			totalWeight += positionWeight;
		}
		
		if (totalWeight > 0) {
			avgX /= totalWeight;
			avgY /= totalWeight;
		}
		
		// Update velocity and acceleration
		let newVelocityX = (avgX - smoothTrackedX) * 0.1;
		let newVelocityY = (avgY - smoothTrackedY) * 0.1;
		
		accelerationX = (newVelocityX - velocityX) * 0.5;
		accelerationY = (newVelocityY - velocityY) * 0.5;
		
		velocityX = newVelocityX;
		velocityY = newVelocityY;
		
		// Validate movement
		let moveDist = dist(avgX, avgY, lastValidX, lastValidY);
		if (moveDist < width * 0.5) {
			// Adaptive smoothing based on confidence and movement speed
			let smoothFactor = map(currentConfidence, 0, 1, 0.05, 0.2);
			smoothFactor *= map(moveDist, 0, 100, 0.8, 1.2);
			
			smoothTrackedX = lerp(smoothTrackedX, avgX, smoothFactor);
			smoothTrackedY = lerp(smoothTrackedY, avgY, smoothFactor);
			
			lastValidX = avgX;
			lastValidY = avgY;
		}
		
		// Update global tracking variables
		trackedX = smoothTrackedX;
		trackedY = smoothTrackedY;
		trackingQuality = currentConfidence;
		
		// Adaptive threshold
		if (count > 100 && currentConfidence > 0.7) {
			colorThreshold = max(30, colorThreshold - 0.5);
		}
	} else {
		// Tracking lost - use prediction
		lostFrames++;
		searchRadius = min(100, searchRadius * 1.1); // Expand search radius
		
		if (lostFrames < 10) {
			// Use velocity prediction for a few frames
			smoothTrackedX += velocityX * 0.8;
			smoothTrackedY += velocityY * 0.8;
			
			// Decay velocity
			velocityX *= 0.9;
			velocityY *= 0.9;
			
			trackedX = smoothTrackedX;
			trackedY = smoothTrackedY;
		} else if (motionAmount > 100) {
			// Fall back to motion tracking
			let motionTrackedX = map(motionX, 0, video.width, width, 0);
			let motionTrackedY = map(motionY, 0, video.height, 0, height);
			
			smoothTrackedX = lerp(smoothTrackedX, motionTrackedX, 0.02);
			smoothTrackedY = lerp(smoothTrackedY, motionTrackedY, 0.02);
			
			trackedX = smoothTrackedX;
			trackedY = smoothTrackedY;
		}
		
		// Loosen threshold when tracking is lost
		colorThreshold = min(90, colorThreshold + 0.3);
		trackingQuality = max(0, trackingQuality - 0.1);
	}
	
	// Store current frame
	prevFrame.copy(video, 0, 0, video.width, video.height, 0, 0, video.width, video.height);
	
	for(let x of eyes){
		for(let y of x){
			y.process();
			y.render();
		}
	}
	
	// Show video feed in corner for debugging
	if (showVideo) {
		push();
		// Calculate position for bottom-right corner
		let videoX = width - 170;
		let videoY = height - 200;
		
		// Draw video WITH flip for mirror view
		push();
		translate(videoX + 160, videoY);
		scale(-1, 1);
		image(video, 0, 0, 160, 120);
		pop();
		
		// Draw search region
		if (lostFrames > 0) {
			noFill();
			stroke(255, 255, 0, 100);
			strokeWeight(1);
			let miniSearchX = map(predictedX, 0, width, 160, 0);
			let miniSearchY = map(predictedY, 0, height, 0, 120);
			let miniRadius = map(currentSearchRadius, 0, video.width, 0, 160);
			circle(videoX + miniSearchX, videoY + miniSearchY, miniRadius * 2);
		}
		
		// Draw tracking overlay on video
		if (count > 10 && sumWeight > 0) {
			// Show tracked region with flipped X coordinate
			fill(255, 0, 0, 50);
			noStroke();
			let miniTrackedX = map(lastValidX, 0, width, 160, 0); // Flipped for mirror effect
			let miniTrackedY = map(lastValidY, 0, height, 0, 120);
			circle(videoX + miniTrackedX, videoY + miniTrackedY, 20);
		}
		
		// Show motion areas
		if (motionAmount > 100) {
			fill(0, 255, 0, 30);
			noStroke();
			let miniMotionX = map(motionX, 0, video.width, 160, 0);
			let miniMotionY = map(motionY, 0, video.height, 0, 120);
			circle(videoX + miniMotionX, videoY + miniMotionY, 30);
		}
		
		// Draw border
		noFill();
		stroke(255);
		strokeWeight(2);
		rect(videoX, videoY, 160, 120);
		// Show target color
		fill(targetColor);
		noStroke();
		rect(videoX, videoY + 130, 30, 30);
		// Show instructions
		fill(255);
		textAlign(LEFT);
		text("Click video to track color", videoX + 40, videoY + 145);
		text("Press 'V' to hide video", videoX + 40, videoY + 160);
		text("Tracking: " + (trackingQuality > 0.1 ? "Active (" + (trackingQuality * 100).toFixed(0) + "%)" : "Lost"), videoX + 40, videoY + 175);
		text("Search: " + searchRadius.toFixed(0) + "px", videoX + 40, videoY + 190);
		// Draw crosshair on tracked position with flipped X
		stroke(255, 0, 0);
		strokeWeight(2);
		let miniX = map(smoothTrackedX, 0, width, videoX + 160, videoX); // Flipped
		let miniY = map(smoothTrackedY, 0, height, videoY, videoY + 120);
		line(miniX - 5, miniY, miniX + 5, miniY);
		line(miniX, miniY - 5, miniX, miniY + 5);
		pop();
	}
	
	// Draw ultra-smooth tracking indicator
	push();
	noFill();
	// Animated rings
	let time = millis() * 0.001;
	for (let i = 3; i > 0; i--) {
		let alpha = 50 * i * trackingQuality;
		let size = 40 + i * 5 + sin(time * 2 + i) * 3;
		stroke(255, 255, 0, alpha);
		strokeWeight(i);
		circle(trackedX, trackedY, size);
	}
	// Quality indicator
	if (trackingQuality > 0.1) {
		stroke(0, 255, 0, 150 * trackingQuality);
		strokeWeight(2);
		arc(trackedX, trackedY, 60, 60, -HALF_PI, -HALF_PI + TWO_PI * trackingQuality);
	}
	pop();
}

// Add mouse click to set tracking color with improved sampling
function mousePressed() {
	// Calculate video preview position
	let videoX = width - 170;
	let videoY = height - 200;
	
	// Check if clicking on video preview
	if (showVideo && mouseX >= videoX && mouseX <= videoX + 160 && mouseY >= videoY && mouseY <= videoY + 120) {
		// Map click position to video coordinates (accounting for flip)
		let clickVideoX = floor(map(mouseX, videoX, videoX + 160, video.width, 0)); // Flipped
		let clickVideoY = floor(map(mouseY, videoY, videoY + 120, 0, video.height));
		
		// Sample a small region for better color selection
		video.loadPixels();
		let r = 0, g = 0, b = 0;
		let sampleCount = 0;
		
		for (let dx = -2; dx <= 2; dx++) {
			for (let dy = -2; dy <= 2; dy++) {
				let sx = constrain(clickVideoX + dx, 0, video.width - 1);
				let sy = constrain(clickVideoY + dy, 0, video.height - 1);
				let index = (sx + sy * video.width) * 4;
				r += video.pixels[index];
				g += video.pixels[index + 1];
				b += video.pixels[index + 2];
				sampleCount++;
			}
		}
		
		targetColor = color(r / sampleCount, g / sampleCount, b / sampleCount);
		console.log("New target color (averaged):", r / sampleCount, g / sampleCount, b / sampleCount);
		
		// Reset tracking parameters
		colorThreshold = 50;
		lastValidX = smoothTrackedX;
		lastValidY = smoothTrackedY;
		velocityX = 0;
		velocityY = 0;
		accelerationX = 0;
		accelerationY = 0;
		lostFrames = 0;
		searchRadius = 50;
		trackingQuality = 1.0;
		
		// Clear tracking history
		for (let i = 0; i < historySize; i++) {
			trackingHistory[i] = {
				x: smoothTrackedX, 
				y: smoothTrackedY,
				confidence: 1.0,
				timestamp: millis()
			};
		}
	}
}

// Toggle video display
function keyPressed() {
	if (key === 'v' || key === 'V') {
		showVideo = !showVideo;
	}
}

// Make canvas responsive
function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
	
	// Recalculate grid with same approach
	spacing = min(width, height) / 6;
	h_amt = ceil(width / spacing) + 1;
	v_amt = ceil(height / spacing) + 1;
	
	// Recreate eyes array with centered grid
	eyes = [];
	let offsetX = (width - (h_amt - 1) * spacing) / 2;
	let offsetY = (height - (v_amt - 1) * spacing) / 2;
	
	for(let x = 0; x < h_amt; x++){
		let col = [];
		for(let y = 0; y < v_amt; y++){
			col.push(new Eye(x, y, offsetX, offsetY));
		}
		eyes.push(col);
	}
}

class Eye{
	constructor(x, y, offsetX, offsetY, main=false){
		this.x = x;
		this.y = y;
		this.main = main;
		this.offsetX = offsetX;
		this.offsetY = offsetY;
		// Position eyes with offset for centering
		this.posx = x * spacing + offsetX;
		this.posy = y * spacing + offsetY;
		this.targetPosx = this.posx;
		this.targetPosy = this.posy;
	}
	
	isTarget(){
		if(dist(this.posx, this.posy, trackedX, trackedY)<spacing/2) return {x:this.x, y:this.y};
		else return false
	}
	
	process(){
	}
	
	render(){
		// Update target positions with offset
		this.targetPosx = this.x * spacing + this.offsetX;
		this.targetPosy = this.y * spacing + this.offsetY;
		
		// Smooth movement
		this.posx += (this.targetPosx - this.posx) * 0.3;
		this.posy += (this.targetPosy - this.posy) * 0.3;
		
		// Bigger eye size
		let eyeWidth = spacing * 0.9; // Increased from 0.7
		let eyeHeight = spacing * 0.35; // Increased from 0.25
		
		if(this.main){
			eye(this.posx, this.posy, eyeWidth, eyeHeight, "#00000000", "#f67e7d");
		}
		else{
			eye(this.posx, this.posy, eyeWidth, eyeHeight, "#8B0000", "#fffaf2");
		}
	}
}

function eye(x, y, w, h, c1, c2){
	push();
	fill(c2);
	translate(x, y);
	//eye shape from https://openprocessing.org/sketch/1279213
	beginShape();
	curveVertex(-w / 2, 0);
	curveVertex(0, -h);
	curveVertex(w / 2, 0);
	curveVertex(0, h);
	endShape(CLOSE);

	beginShape();
	curveVertex(w / 2, 0);
	curveVertex(0, -h);
	curveVertex(-w / 2, 0);
	curveVertex(0, h);
	endShape(CLOSE);
	
	// Calculate direction with proper normalization
	let dx = smoothTrackedX - x;
	let dy = smoothTrackedY - y;
	let distance = sqrt(dx * dx + dy * dy);
	
	// Prevent division by zero and normalize
	if (distance > 0) {
		dx = dx / distance;
		dy = dy / distance;
		
		// Scale pupil movement based on eye size
		let pupilX = dx * w * 0.3; // Increased from 0.25
		let pupilY = dy * h * 0.3;
		
		// Draw pupil - black color
		fill("#000000"); // Changed to black
		circle(pupilX, pupilY, h * 1.3); // Increased from 1.0
	} else {
		// Draw centered pupil if target is at eye position
		fill("#000000"); // Changed to black
		circle(0, 0, h * 1.3);
	}
	
	pop();
}