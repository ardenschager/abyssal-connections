const YUKA = require("./yuka.js");
const {SIM, CTR, MIN, MAX} = require("./constants.js");
const {boxMuller, randomRange, getRandomPosition} = require("./utils.js");
const {SimpleLanguageModel} = require("./language.js");

const languageModel = (new SimpleLanguageModel()).init();
const foodTopic = languageModel.randomIndex(false);
const greetTopic = languageModel.randomIndex(false);

// Abstract, don't use this
// All states inherit from this one. Adds base time increases to all states
class BaseState {
    constructor() {
        this.type = CTR.states.abstract;
        this.reset();
    }

    reset() {
        this._t = 0;
    }

    // Interface
    enter(fsm, dt) { /* enter state logic here*/ }

    update(fsm, dt) {
        this._t += dt;
    }

    _getNeighbors(fsm) {
        return fsm.behavior.neighbors;
    }
}

// Language states for language FSM

// Abstract class
class LangState extends BaseState {
    constructor(topic) {
        super();
        this.type = "AbstractLang";
        this._aloneTimer = 0;
        if (topic == null) {
            this._topic = languageModel.randomIndex();
        } else {
            this._topic = topic;
        }
    }

    update(fsm, dt) {
        super.update(fsm,dt);
        this._aloneTimer += dt;
        this._neighbors = this._getNeighbors(fsm);
        if (this.type != CTR.socialStates.await) {
            if (this._neighbors == 0) {
                if (this._aloneTimer > CTR.language.timeout) {
                    fsm.changeState(AwaitTopicState);
                }
            } else {
                this._aloneTimer = 0; // if not alone, don't start timer
            }
        }
    }

    get topic() {
        return this._topic;
    }
}

class AwaitTopicState extends LangState {
    constructor(topic) {
        super(topic);
        this.type = CTR.socialStates.await;
    }

    enter(fsm, dt) {
        const thinkParams = CTR.language.behavior.think;
        this._thinkTime = boxMuller(thinkParams.average, thinkParams.stdDev);
        this._greetChance = CTR.language.behavior.greetChance;
        // Chance to forget topic and just greet someone next time
        this._forgetTopicChance = CTR.language.behavior.forgetChance;
        if (this._forgetTopicChance > Math.random() || this._topic == null) {
            this._topic = greetTopic;
        }
    }

    update(fsm, dt) {
        super.update(fsm, dt);
        const nearbyCreatures = fsm.behavior.getNearbyCreatures();
        for (let creature of nearbyCreatures) {
            if (creature.socialState == "await" && this._greetChance > Math.random()) {
                fsm.changeState(EmitTopicState, this._topic);
                break;
            }
        }
    }
}

class ReceiveTopicState extends LangState {
    constructor(topic) {
        super();
        this.type = CTR.socialStates.receive;
        if (CTR.language.behavior.hearChance > Math.random()) {
            this._topic = topic;
        } else {
            this._topic = languageModel.randomIndex();;
        }
    }

    enter(fsm, dt) {
        const thinkParams = CTR.language.behavior.think;
        this._thinkTime = boxMuller(thinkParams.average, thinkParams.stdDev);
    }

    update(fsm, dt) {
        super.update(fsm, dt);
        if (this._t > this._thinkTime) {
            fsm.changeState(EmitTopicState, this._topic);
        }
    }
}

class EmitTopicState extends LangState {
    constructor(topic) {
        super(topic);
        this.type = CTR.socialStates.emit;
        // if (topic != null) {
        //     this._topic = topic;
        // } else {
        //     this._topic = languageModel.randomIndex(); // pick a topic if none provided
        // }
        const emitParams = CTR.language.behavior.emit;
        this._emitTimeout = boxMuller(emitParams.average, emitParams.stdDev);
    }

    enter(fsm, dt) {
        const nearbyCreatures = fsm.behavior.getNearbyCreatures();
        for (let creature of nearbyCreatures) {
            if (creature == fsm.entity) continue;
            const response = languageModel.sample(this._topic);
            creature.receiveTopic(response);
            this._topic = response;
        }
    }

    update(fsm, dt) {
        super.update(fsm, dt);
        if (this._t > this._emitTimeout) {
            fsm.changeState(AwaitTopicState);
        }
    }
}


// Behavior states for behavior FSM
class BehaviorState extends BaseState {
    constructor() {
        super();
    }

    // Interface
    enter(fsm, dt) {
        super.enter(fsm, dt);
        fsm.entity.active = true;
        fsm.entity.steering.clear();
        fsm.entity.updateNeighborhood = false;
        fsm.entity.smoothOrientation = true;
        fsm.entity.maxSpeed = fsm.behavior.speed;
        // Store these from randomized values in behavior module. Can be changed
        this._eatRate = fsm.behavior.rates.decay.eat;
        this._mateRate = fsm.behavior.rates.decay.mate;
        this._playRate = fsm.behavior.rates.decay.play;
        this._restRate = fsm.behavior.rates.decay.rest;
    }

    update(fsm, dt) {
        // No matter what, needs will increase. 
        // If subclasses change the rate, then needs can also recover
        super.update(fsm, dt);
        fsm.behavior.desires.eat += this._eatRate * dt;
        fsm.behavior.desires.mate += this._mateRate * dt;
        fsm.behavior.desires.play += this._playRate * dt;
        fsm.behavior.desires.rest += this._restRate * dt;
    }
}

// Inheritance injection for most state behavior, also don't use this
// If a child class inherits from this, it will freely transition to most other states
class DefaultBehaviorState extends BehaviorState {
    constructor() {
        super();
    }

    reset() {
        super.reset();
    }

    // Doesn't move
    enter(fsm, dt) {
        super.enter(fsm, dt);
    }

    update(fsm, dt) {
        super.update(fsm, dt);
        if (fsm.behavior.desires.eat > fsm.behavior.thresh.eat) {
            // If hungry, look for food
            const nearbyFood = fsm.behavior.getNearbyFood();
            if (nearbyFood.length > 0) {
                fsm.pushState(PursueFoodState, nearbyFood[0]);
            }
        } 
        
        // temporarily remove other states... 
        // else if (fsm.behavior.desires.rest > fsm.behavior.thresh.rest) {
        //     // If tired, rest
        //     fsm.changeState(IdleState);
        // } else if (fsm.behavior.desires.fun > fsm.behavior.thresh.bored) {
        //     // If bored, go play
        //     fsm.changeState(FlockingState);
        // } else if (fsm.behavior.desires.mate > fsm.behavior.thresh.mate) {
        //     // If frisky, go mate
        //     // fsm.changeState(FlockingState);
        // } 
    }
}

// temporary, delete me
YUKA.Vector3.prototype.lerp = function(v, alpha) {
    this.x += ( v.x - this.x ) * alpha;
    this.y += ( v.y - this.y ) * alpha;
    this.z += ( v.z - this.z ) * alpha;
    return this;
}

// Don't move, float in one place until some other decision is made
class IdleState extends DefaultBehaviorState {
    constructor() {
        super();
        this.type = CTR.states.idle;
        this.reset();
    }

    reset() {
        super.reset();
    }

    enter(fsm, dt) {
        super.enter(fsm, dt);
        // fsm.entity.active = true;
        this._initialY = fsm.entity.position.y;
        this._restRate = -fsm.behavior.rates.recover.rest; // negative -> recover to 0
        // this._target = getRandomPosition(); 
        // this._target = this._target.lerp(fsm.entity.position, 0.3);
        // this._seek = new YUKA.SeekBehavior();
        // this._arrive = new YUKA.ArriveBehavior(this._target , 2.5, 0.1 );
        this._separation = new YUKA.SeparationBehavior();
        this._separation.weight = 0.25;
        // fsm.entity.steering.add(this._arrive);
        fsm.entity.steering.add(this._separation);
    }

    update(fsm, dt) {
        super.update(fsm, dt);
        fsm.entity.position.y = this._initialY + Math.sin(this._t * CTR.bobble.frequency) * CTR.bobble.height;
        // if (fsm.entity.position.distanceTo(this._target) < 4) {
        //     fsm.entity.steering.clear(); // just clear the target
        //     fsm.entity.active = false;
        // } else {
        //     fsm.entity.rotation.slerp(this._lastRotation, 0.9);
        // }
        if (fsm.behavior.desires.rest <= 0) {
            fsm.changeState(SeekState);
        }
    }
}

class WanderState extends DefaultBehaviorState  {
    constructor() {
        super();
        this.type = CTR.states.wander;
        this.reset();
    }

    reset() {
        super.reset();
        this._wander = new YUKA.WanderBehavior(2);
    }

    enter(fsm, dt) {
        super.enter(fsm, dt);
        fsm.entity.steering.add(this._wander);
    }

    update(fsm, dt) {
        super.update(fsm, dt);
    }
}

// Wander around aimlessly 
class SeekState extends DefaultBehaviorState {
    constructor() {
        super();
        this.type = CTR.states.seek;
        this.reset();
    }

    reset() {
        super.reset();
        this._seek = new YUKA.SeekBehavior();
        this._separation = new YUKA.SeparationBehavior();
        this._timeout = boxMuller(CTR.yuka.wanderTime.average, CTR.yuka.wanderTime.stdDev);

        this._alignment = new YUKA.AlignmentBehavior();
        this._cohesion = new YUKA.CohesionBehavior();
    }

    enter(fsm, dt) {
        super.enter(fsm, dt);
        this._seek.target = getRandomPosition();
        this._seek.weight = 1.0;
        this._separation.weight = CTR.yuka.flocking.separation;
        this._alignment.weight = CTR.yuka.flocking.alignment;
        this._cohesion.weight = CTR.yuka.flocking.cohesion;

        // console.log(this._target);
        fsm.entity.steering.add(this._seek);

        fsm.entity.steering.add(this._alignment);
        fsm.entity.steering.add(this._cohesion);
        fsm.entity.steering.add(this._separation);
    }

    update(fsm, dt) {
        super.update(fsm, dt);
        
        if (this._t > this._timeout || this._seek.target.distanceTo(fsm.entity.position) < 0.5) {
            this._seek.target = getRandomPosition();
            this._t = 0;
        } 
    }
}

// Flock with others
class FlockingState extends SeekState {
    constructor() {
        super();
        this.type = CTR.states.flock;
        this.reset();
    }

    reset() {
        super.reset();
        this._cohesion = new YUKA.CohesionBehavior();
        this._alignment = new YUKA.AlignmentBehavior();
        this._separation = new YUKA.SeparationBehavior();
        
        this._seek.weight = CTR.yuka.flocking.wander;
        this._alignment.weight = CTR.yuka.flocking.alignment;
        this._cohesion.weight = CTR.yuka.flocking.cohesion;
        this._separation.weight = CTR.yuka.flocking.separation;
    }

    enter(fsm, dt) {
        super.enter(fsm, dt);
        fsm.entity.updateNeighborhood = true;
        fsm.entity.smoothOrientation = true;
        fsm.entity.maxSpeed = CTR.yuka.flocking.speed;
        fsm.entity.steering.add(this._alignment);
        fsm.entity.steering.add(this._cohesion);
        fsm.entity.steering.add(this._separation);
        this._playRate = -fsm.behavior.rates.recover.play;
    }

    update(fsm, dt) {
        super.update(fsm, dt);
    }
}

// Pursue a moving target entity (food, other creature)
class PursueState extends BehaviorState {

    constructor(target) {
        super();
        this.target = target;
        this._pursuit = new YUKA.PursuitBehavior(target, 1);
    }

    reset() {
        super.reset();
    }

    enter(fsm, dt) {
        super.enter(fsm, dt);
        fsm.entity.steering.add(this._pursuit);
    }

    update(fsm, dt) {
        super.update(fsm, dt);
        if (this.target == null) {
            fsm.entity.steering.clear(); // can't pursue nothing. prevent bugs
            fsm.changeState(SeekState);
            fsm.behavior.socialFsm.changeState(EmitTopicState, foodTopic);
        }
    }

}

class PursueFoodState extends PursueState {

    constructor(target) {
        super(target);
        this.type = CTR.states.pursueFood;
    }

    reset() {
        super.reset();
    }

    enter(fsm, dt) {
        super.enter(fsm, dt);
    }

    update(fsm, dt) {
        const distance = fsm.entity.position.distanceTo(this.target.position);
        if (!this.target.active) {
            fsm.popState();
        }
        if (distance < CTR.yuka.eatDistance) { // Change to distance later
            fsm.behavior.desires.eat = 0;
            this.target.active = false;
            fsm.popState();
            // fsm.changeState(WanderState);
        }
    }
}

// Pushdown Automata FSM
class PushdownFSM {

    constructor(behavior, stateClass) {
        this.entity = behavior.entity;
        this.behavior = behavior;
        // this.nearby = creatureBehavior.nearby;
        this.states = []; // Pushdown stack
        this._initialClass = stateClass;
        this.pushState(this._initialClass)
    }

    get topIndex() {
        return this.states.length - 1;
    };

    // Get topmost state
    get state() {
        return this.states[this.topIndex];
    }

    // Use a method below to change state externally
    set state(value) {
        this.states[this.topIndex] = value;
    }

    update(dt) {
        if (!this._shouldEnter) {
            this.state.update(this, dt);
        } else {
            this.state.enter(this, dt);
            this._shouldEnter = false;
        }
    }

    changeState(stateClass, target=null) {
        this.state = new stateClass(target);
        this._shouldEnter = true;
    }

    pushState(stateClass, target=null) {
        this.states.push(new stateClass(target));
        this._shouldEnter = true;
    }

    popState() {
        if (this.topIndex > 0) {
            this.states.pop();
            this.state.reset();
            this._shouldEnter = true;
        } else {
            this.changeState(this._initialClass);
        }
    }
}

class CreatureBehavior {

    constructor(entity) {
        this.entity = entity;

        // Creature traits! :)
        this.speed = boxMuller(CTR.yuka.speed.average, CTR.yuka.speed.stdDev);
        // initialize starting levels at random
        this.desires = {
            eat: boxMuller(CTR.starting.eat.average, CTR.starting.eat.stdDev),
            mate: boxMuller(CTR.starting.eat.average, CTR.starting.eat.stdDev),
            play: boxMuller(CTR.starting.eat.average, CTR.starting.eat.stdDev),
            rest: boxMuller(CTR.starting.eat.average, CTR.starting.eat.stdDev)
        };

        this.rates = {
            // Different creatures have different rates of decay for their needs
            decay: {
                eat: boxMuller(CTR.rates.decay.eat.average, CTR.rates.decay.eat.stdDev),
                mate: boxMuller(CTR.rates.decay.mate.average, CTR.rates.decay.mate.stdDev),
                play: boxMuller(CTR.rates.decay.play.average, CTR.rates.decay.play.stdDev),
                rest: boxMuller(CTR.rates.decay.rest.average, CTR.rates.decay.rest.stdDev),
            },
            recover: {
                play: boxMuller(CTR.rates.recover.play.average, CTR.rates.recover.play.stdDev),
                rest: boxMuller(CTR.rates.recover.rest.average, CTR.rates.recover.rest.stdDev)
            }
        };

        this.thresh = {
            eat: boxMuller(CTR.thresh.eat.average, CTR.thresh.eat.stdDev),
            mate: boxMuller(CTR.thresh.mate.average, CTR.thresh.mate.stdDev),
            play: boxMuller(CTR.thresh.play.average, CTR.thresh.play.stdDev),
            rest: boxMuller(CTR.thresh.rest.average, CTR.thresh.rest.stdDev),
        }
        
        this._simulationState = entity.simulationState;
        this.visibleNearby = [];
        this.behaviorFsm = new PushdownFSM(this, SeekState);
        this.socialFsm = new PushdownFSM(this, AwaitTopicState);
        this.receivedTopic = false;
    }

    update(dt) {
        this._detectNearbyEntities();
        this.behaviorFsm.update(dt);
        this.socialFsm.update(dt);
        if (this.receivedTopic && this.topicTimer > 0.5) {
            this.receivedTopic = false;
        }
        this.topicTimer += dt;
    }

    receiveTopic(topic, fromHuman=false) {
        this.socialFsm.changeState(ReceiveTopicState, topic);
        this.receivedTopic = fromHuman;
    }

    respondToTopic(topic, fromHuman=false) {
        this.socialFsm.changeState(EmitTopicState, topic);
        this.receivedTopic = fromHuman;
        this.topicTimer = 0;
    }

    get topic() {
        this.socialFsm.state.topic;
    }

    get behaviorState() {
        return this.behaviorFsm.state.type;
    }

    get socialState() {
        return this.socialFsm.state.type;
    }

    getNearbyFood() {
        const nearbyFood = [];
        for (let neighbor of this.visibleNearby) {
            if (neighbor.type == SIM.types.snack && 
                neighbor.isEdible && 
                this.entity.canSee(neighbor)) {
                nearbyFood.push(neighbor);
            }
        }
        return nearbyFood;
    }

    getNearbyCreatures() {
        const creatures = [];
        for (let neighbor of this.visibleNearby) {
            if (neighbor.type == SIM.types.creature /* && 
                this.entity.canSee(neighbor)*/ ) {
                creatures.push(neighbor);
            }
        }
        return creatures;
    }

    _detectNearbyEntities() {
        const simState = this.entity.simulationState;
        const position = this.entity.position;
        this.visibleNearby.length = 0; // empty the array
        const dist = Math.max(CTR.detectRadius.creature, CTR.detectRadius.snack);
        const neighbors = simState.getNearbyEntities(position, dist);
        for (let neighbor of neighbors) {
            if (this.entity.canSee(neighbor)) {
                this.visibleNearby.push(neighbor);
            }
        }
    }
}

module.exports = CreatureBehavior;