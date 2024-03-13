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

class Particle {
    constructor(x, y, note) {
        this.x = x;
        this.y = y;
        this.note = note;
        this.color = color(random(255), random(255), random(255));
        this.radius = 5;
        this.velocityX = random(-1, 1);
        this.velocityY = random(-5, -1);
    }

    update() {
        this.x += this.velocityX;
        this.y += this.velocityY;
        this.alpha -= 5;
    }

    finished() {
        return this.alpha < 0;
    }

    show() {
        noStroke();
        fill(this.color[0], this.color[1], this.color[2], this.alpha);
        ellipse(this.x, this.y, this.radius * 2);
    }
}

let particles = [];

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

    // Spawning particles when a certain note is heard
    if(abs(diff) < threshold){
        let color = [random(255), random(255), random(255)];
        for (let i = 0; i < 10; i++) {
            let particle = new Particle(random(width), height, closestNote.note);  // or 'color'
            particles.push(particle);
        }
    }

    //Update and show particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].show();
        if (particles[i].finished()) {
            particles.splice(i, 1);
        }
    }
};

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
