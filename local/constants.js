Simulation = {
    tick: 50,
    numCreatures : 85,
    maxNumSnacks : 25,
    bounds: {
        bias: 0.01,
        max: {
            x: 110,
            y: 40,
            z: 21.5,
        },
        min: {
            x: -110,
            y: -40,
            z: -45,
        },
        cells: {
            x: 10,
            y: 10,
            z: 10,
        }
    },
    snacks: {
        bounds: {
            max: {
                x: 50,
                y: 40,
                z: 21.5,
            },
            min: {
                x: -50,
                y: -40,
                z: -45,
            },
        },
        timeout: 0.2,
        appearChance: 0.005,
        dropSpeed: 0.0425,
    },
    debug : false,
    types: {
        creature: 'creature',
        snack: 'snack',
    },
    language: {
        disperseRadius: 65
    }
};
Creature = {
    language: {
        model: {
            seed: "snail",
            numWords: 300,
            initialProb: 0.005,
            numRuns: 2,
            connectAll: false,
            connectToSelf: true,
        },
        behavior: {
            timeout: 3, // end convo
            think: {
                average: 1.5,
                stdDev: 0.25,
            },
            emit: {
                average: 1.5,
                stdDev: 0.25,
            },
            greetChance: 0.000045, // shyness (per second)
            hearChance: 0.000765, // listening comprehension
            forgetChance: 0.1, // forgetfulness
            minTime: 3,
        }
    },
    states: { // enum
        idle: 'idle',
        seek: 'seek',
        flock: 'flock',
        pursueFood: 'pursueFood',
        eating: 'eating',
        pursueMate: 'pursueMate',
        mating: 'mating',
        abstract: 'abstract',
        test: 'test',
    },
    socialStates: {
        await: 'await',
        receive: 'receive',
        emit: 'emit',
        reply: 'reply',
    },
    yuka: {
        boundingRadius: 4.25,
        vision: {
            range: 10,
            fieldOfView: 1.2, // radians
        },
        speed: {
            average: 0.8,
            stdDev: 0.15,
        },
        idleTime: { // in seconds
            average: 15,
            stdDev: 5,
        },
        wanderTime: { // in seconds
            average: 25,
            stdDev: 5,
        },
        eatDistance: 1.4,
        flocking: {
            speed: 3.0,
            wander: 0.2,
            alignment: 1,
            cohesion: 1,
            separation: 2.5,
        },
    },
    starting: {
        eat: {
            average: 2,
            stdDev: 0.5,
        },
        mate: {
            average: 0.5,
            stdDev: 0.15,
        },
        play: {
            average: 0.5,
            stdDev: 0.15,
        },
        rest: {
            average: 0.5, 
            stdDev: 0.15,
        }
    },
    rates: {
        decay: {
            eat: {
                average: 0.015,
                stdDev: 0.0025,
            },
            mate: {
                average: 0.005,
                stdDev: 0.001,
            },
            play: {
                average: 0.01,
                stdDev: 0.002,
            },
            rest: {
                average: 0.0055, 
                stdDev: 0.001,
            },
        },
        recover: { // mating and eating simply reset to 0
            play: {
                average: 0.01,
                stdDev: 0.002,
            },
            rest: {
                average: 0.1, 
                stdDev: 0.01,
            },
        }
    },
    thresh: {
        eat: {
            average: 1,
            stdDev: 0.1,
        },
        mate: {
            average: 1,
            stdDev: 0.1,
        },
        play: {
            average: 1,
            stdDev: 0.1,
        },
        rest: {
            average: 1, 
            stdDev: 0.1,
        }
    },
    timeout: {
        eat: 5,
        mate: 5,
    },
    bobble: {
        frequency: 1.25,
        height: 0.5,
    },
    detectRadius: {
        creature: 25,
        snack: 10,
    }
};

const MIN = Simulation.bounds.min;
const MAX = Simulation.bounds.max;
const WIDTH = MAX.x - MIN.x;
const HEIGHT = MAX.y - MIN.y;
const DEPTH = MAX.z - MIN.z;

// export settings as module
module.exports = {
    SIM: Simulation,
    CTR: Creature,
    MIN: MIN,
    MAX: MAX,
    WIDTH: WIDTH,
    HEIGHT: HEIGHT,
    DEPTH: DEPTH,
}