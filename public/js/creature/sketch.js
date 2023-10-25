class ServerHelper {
  constructor(debug = false) {
    this._socket = io("/creature");
    this._debug = debug;
    this.init = false;
    this._socket.on("init", (settings) => {
      this.log("initialized with: " + settings);
      this.settings = settings;
      this.init = true;
    });

    this._socket.on("updateGameState", (state) => {
      this.previousState = this.currentState;
      this.currentState = state;
    });

    this._time = 0;
  }

  get id() {
    return this._socket.id;
  }

  update(deltaTime) {
    this._socket.emit("playerUpdate", 69);
    this._time += deltaTime;
  }

  log(message) {
    if (!this._debug) return;
    console.log("ServerHelper: ", message);
  }
}

class DrawHelper {
  constructor() { }

  drawFromState(state) {
    if (state == null) return;
    let creatures = state.creatures;
    for (let creature of Object.values(creatures)) {
      const position = creature.position;
      this.fillFromState(creature.state);
      noStroke();
      translate(position.x, position.y, position.x);
      push();
      sphere(10);
      pop();
    }
  }

  fillFromState(creatureState) {
    colorMode(RGB, 1);
    // stroke(0, 0, 0);
    normalMaterial();
    console.log(creatureState);
    if (creatureState == "idle") {
      fill(1, 0.8, 1);
    } else if (creatureState == "flock") {
      fill(0, 1, 1);
    } else if (creatureState == "wander") {
      fill(1, 1, 0);
    } else if (creatureState == "findFood") {
      fill(0.5, 0.5, 0.5);
    } else if (creatureState == "findMate") {
      fill(1, 0.5, 0.5);
    } else if (creatureState == "eating") {
      fill(0, 1, 0);
    } else if (creatureState == "mating") {
      fill(1, 0, 1);
    }
  }

  // _interpolate() {
  //   if (this._interpolatedState == null) {
  //     this._interpolatedState = {};
  //   }
  //   // Interpolate between states depending on time
  // }
}

let serverHelper = new ServerHelper(true);
let drawHelper; // init with p5

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  drawHelper = new DrawHelper();
}

function draw() {
  clear();
  if (!serverHelper.init) return;
  serverHelper.update(deltaTime);
  drawHelper.drawFromState(serverHelper.currentState);
}
