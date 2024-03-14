const audioContext = new AudioContext();    
const canvasWidth = window.innerWidth;
const canvasHeight = window.innerHeight;
console.log('ml5 version:', ml5.version);
const modelURL = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/'
let pitch;
let mic;
let freq = 0;
let threshold = 1;

const notes = [
    // Guitar standard tuning
    {note: 'E2', freq: 82.41},
    {note: 'A2', freq: 110},
    {note: 'D3', freq: 146.83},
    {note: 'G3', freq: 196},
    {note: 'B3', freq: 246.94},
    {note: 'E4', freq: 329.63},

    // Original notes
    {note: 'A4', freq: 440},
    {note: 'A#4', freq: 466.164 },
    {note: 'B4', freq: 493.883 },
    {note: 'C5', freq: 523.251 },
    {note: 'C#5', freq: 523.251},
    {note: 'D5', freq: 587.330 },
    {note: 'D#5', freq: 622.254},
    {note: 'E5', freq: 659.255},
    {note: 'F5', freq: 698.456},
    {note: 'F#5', freq: 739.989},
    {note: 'G5', freq: 783.991},
    {note: 'G#5', freq: 830.609},
];

// Define a particle class
class Particle {
    constructor(x, y, color) {
        this.pos = createVector(x, y);
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.color = color;
        this.maxSpeed = 4;
        this.maxForce = 0.1;
        this.alpha = 255;
    }

    applyForce(force) {
        this.acc.add(force);
    }

    update() {
        this.vel.add(this.acc);
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel);
        this.acc.mult(0);
        this.alpha -= 1;
    }

    finished() {
        return this.alpha < 0;
    }

    show() {
        noStroke();
        fill(this.color[0], this.color[1], this.color[2], this.alpha);
        ellipse(this.pos.x, this.pos.y, 5);
    }
}

let particles = [];
let flowField = [];

const startButton = document.getElementById('startButton');
    startButton.addEventListener('click', setup);


    function setup(){
        createCanvas(canvasWidth, canvasHeight);
        audioContext.resume();
        navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function (stream) {
            mic = new p5.AudioIn();
            mic.start(listeningForPitch);
        })
        .catch(function (err) {
            console.error('Error accessing microphone:', err);
      });

  // Create flow field grid
  for (let x = 0; x < canvasWidth; x += 20) {
    flowField[x] = [];
    for (let y = 0; y < canvasHeight; y += 20) {
      let angle = map(noise(x * 0.01, y * 0.01), 0, 1, 0, TWO_PI * 2);
      flowField[x][y] = createVector(cos(angle), sin(angle));
    }
  }
};

function listeningForPitch() {
    console.log('listening');
    pitch = ml5.pitchDetection(
        modelURL,
        audioContext,
        mic.stream,
        modelLoaded,
    );
};

function draw() {
    background(200);
    textAlign(CENTER, CENTER);
    fill(255);
    textSize(32);
    text(freq.toFixed(2), width / 2, height - 150);

    let closestNote = -1;
    let recordDiff = Infinity;
    for (let i = 0; i < notes.length; i++) {
        let diff = freq - notes[i].freq;
        if (abs(diff) < abs(recordDiff)) {
            closestNote = notes[i];
            recordDiff = diff;
        }
    }

    textSize(64);
    text(closestNote.note, width / 2, height - 50);

    let diff = recordDiff;
    let alpha = map(abs(diff), 0, 100, 255, 0);
    rectMode(CENTER);
    fill(255, alpha);
    stroke(255);
    strokeWeight(1);
    if (abs(diff) < threshold) {
        fill(0, 255, 0);
    }
    rect(200, 100, 200, 50);

    stroke(255);
    strokeWeight(4);
    line(200, 0, 200, 200);

    noStroke();
    fill(255, 0, 0);
    if (abs(diff) < threshold) {
        fill(0, 255, 0);
    }
    rect(200 + diff / 2, 100, 10, 75);

    // Spawn particles when a certain note is heard
    if (abs(diff) < threshold) {
        let color = [random(255), random(255), random(255)]; // Random color for the particle
        for (let i = 0; i < 10; i++) { // Spawn 10 particles
            let particle = new Particle(random(width), random(height), color);
            particles.push(particle);
        }
    }

    // Create a flow field using Perlin noise
    let cols = 10;
    let rows = 10;
    let scl = 50;
    let flowField = new Array(cols * rows);
    let xoff = 0;
    for (let i = 0; i < cols; i++) {
        let yoff = 0;
        for (let j = 0; j < rows; j++) {
            let index = i + j * cols;
            let angle = noise(xoff, yoff, frameCount * 0.01) * TWO_PI * 4;
            let v = p5.Vector.fromAngle(angle);
            v.setMag(1);
            flowField[index] = v;
            yoff += 0.1;
        }
        xoff += 0.1;
    }

    // Apply flow field to particles
    for (let i = 0; i < particles.length; i++) {
        let particle = particles[i];
        let x = floor(particle.pos.x / scl);
        let y = floor(particle.pos.y / scl);
        let index = x + y * cols;
        let force = flowField[index];
        particle.applyForce(force);
        particle.update();
        particle.show();
        if (particle.finished()) {
            particles.splice(i, 1);
        }
    }
}

function modelLoaded() {
    console.log('Model Loaded');
    pitch.getPitch(gotPitch);
};

function gotPitch(error, frequency) {
    if (error) {
        console.error(error);
    } else {
        if (frequency) {
            freq = frequency;
        }
        pitch.getPitch(gotPitch);
    }
};
