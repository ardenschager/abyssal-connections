const YUKA = require("./yuka.js");
const PointOctree = require("./sparse-octree.js").PointOctree;
const {Vector3} = require("three");
const CreatureBehavior = require('./creature-behavior.js'); 

const {SIM, CTR, MIN, MAX, WIDTH, HEIGHT, DEPTH} = require("./constants.js");
const {randomRange} = require("./utils.js");

// Uniquely identified entities that inherit YUKA's simulation capabilities
class SynchronizedEntity extends YUKA.Vehicle {
    constructor(simulationState) {
        super();
        this.simulationState = simulationState;
        this.euler = new YUKA.Vector3();
    }

    randomizePosition({xOverwrite=null, yOverwrite=null, zOverwrite=null}) {
        this.position.x = xOverwrite != null ? xOverwrite : randomRange(MIN.x, MAX.x);
        this.position.y = yOverwrite != null ? yOverwrite : randomRange(MIN.y, MAX.y);
        this.position.z = zOverwrite != null ? zOverwrite : randomRange(MIN.z, MAX.z);
    }

    randomizeRotation({xOverwrite=null, yOverwrite=null, zOverwrite=null}) {
        this.euler.x = xOverwrite != null ? xOverwrite : randomRange(0, Math.PI);
        this.euler.y = yOverwrite != null ? yOverwrite : randomRange(0, Math.PI);
        this.euler.z = zOverwrite != null ? zOverwrite : randomRange(0, Math.PI);
        this.rotation.fromEuler(this.euler.x, this.euler.y, this.euler.z);
    }

    // Export data to synchronize
    exportData() {
        this.euler = this.rotation.toEuler(this.euler);
        return {
            active : this.active,
            uuid: this.uuid,
            position: {
                x: this.position.x, 
                y: this.position.y, 
                z: this.position.z, 
            },
            velocity: {
                x: this.velocity.x, 
                y: this.velocity.y, 
                z: this.velocity.z, 
            },
            speed: this.velocity.length(),
            quaternion: {
                x: this.rotation.x,
                y: this.rotation.y,
                z: this.rotation.z,
                w: this.rotation.w,
            },
        };
    }

    _clampPosition() {
        const position = this.position;
        if (position.x !== position.x || position.y !== position.y || position.z !== position.z) {
            console.warn("Found NaN position");
            this.randomizePosition({});
            return;
        }
        const bias = SIM.bounds.bias;
        const x = Math.min(Math.max(MIN.x + bias, position.x), MAX.x - bias);
        const y = Math.min(Math.max(MIN.y + bias, position.y), MAX.y - bias);
        const z = Math.min(Math.max(MIN.z + bias, position.z), MAX.z - bias);
        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
    }
}

class CreatureEntity extends SynchronizedEntity {
    constructor(simulationState) {
        super(simulationState);
        this.type = SIM.types.creature;
        this.isPlayer = false;
        this.socketId = null;
        this.maxSpeed = 1.5;
        this.maxTurnRate = Math.PI / 10;
        this.smoother = new YUKA.Smoother(30);
        // this.rotSmoother = new YUKA.Smoother(30);
        this.vision = new YUKA.Vision(this);
        this.vision.range = CTR.yuka.vision.range;
        this.vision.fieldOfView = CTR.yuka.vision.fieldOfView * Math.PI;
        this.boundingRadius = CTR.yuka.boundingRadius;
        this.updateNeighborhood = true;
        this.neighborhoodRadius = CTR.detectRadius.creature;
        this._behavior = new CreatureBehavior(this);
        this.randomizePosition({});
        this.randomizeRotation({});
        this._wanderBehavior = new YUKA.WanderBehavior(2);
        this.steering.add(this._wanderBehavior);
        this._eulerSmooth = new YUKA.Vector3();

    }

    get behaviorState() {
        return this._behavior.behaviorState;
    }

    get socialState() {
        return this._behavior.socialState;
    }

    receiveTopic(topic) {
        // console.log(topic);
        this._behavior.receiveTopic(topic);
    }

    respondToTopic(topic, fromHuman=false) {
        this._behavior.respondToTopic(topic, fromHuman);
    }

    exportData() {
        let data = super.exportData();
        data.receivedTopic = this._behavior.receivedTopic;
        data.topic = this._behavior.socialFsm.state.topic; // getter doesn't work? 
        data.desires = this._behavior.desires;
        data.isPlayer = this.isPlayer;
        data.socketId = this.socketId;
        data.behaviorState = this.behaviorState;
        data.socialState = this.socialState;
        return data;
    }

    assignPlayer(socketId) {
        this.isPlayer = true;
        this.socketId = socketId;
    }

    unassignPlayer(socketId) {
        this.isPlayer = false;
        this.socketId = null;
    }

    playerUpdate(newState) {
        if (newState.position != null && newState.euler != null) {
            const pos = newState.position;
            let rot = newState.euler;
            this.position = Vector3(pos.x, pos.y, pos.z);
            this.rotation = YUKA.Quaternion.fromEuler(rot.x, rot.y, rot.z);
        }
        this._clampPosition();
    }

    agentUpdate(dt) {
        this._behavior.update(dt);
        this._clampPosition();
        this._smoothMovement(dt);
    }

    _smoothMovement(dt) {
        if (this._previousRotation != null) {
            this._diff.copy(this.position);
            this._diff.sub(this._previousPosition);
            const length = this._diff.length();
            this._diff.add(this.position);
            this.rotateTo(this._diff, dt * length);
            this.rotation.slerp(this._previousRotation, 0.8);
        } else {
            this._previousPosition = new YUKA.Vector3();
            this._previousRotation = new YUKA.Quaternion();
            this._diff = new Vector3();
        }
        this._previousRotation.copy(this.rotation);
        this._previousPosition.copy(this.position);
    }

    canSee(entity) {
        const dist = this.position.distanceTo(entity.position);
        if (entity.type == SIM.types.snack && dist < CTR.detectRadius.snack) {
            return this.vision.visible(entity.position) === true;
        } else if (entity.type == SIM.types.creature && dist < CTR.detectRadius.creature) {
            return this.vision.visible(entity.position) === true;
        } else {
            return false;
        }
    }
}

// Food cannot be a player character
class SnackEntity extends SynchronizedEntity {
    constructor(simulationState) {
        super(simulationState);
        this.active = false;
        this.type = SIM.types.snack;
        this.simulationState = simulationState;
        this.randomizePosition({yOverwrite : MAX.y});
        this.randomizeRotation({});
    }

    updatePosition() {
        if (!this.active) return;
        this.position.y -= 0.025; // change me
        this._clampPosition();
    }

    get isExpired() {
        return this.position.y <= MIN.y + SIM.bounds.bias;
    }

    get isEdible() {
        return !this.isExpired && this.active;
    }
}

// Helper class for formatting the game state to send to clients
class SimulationState {

    constructor() {
        this._stateExport = {
            exportTimestamp: -1,
        };
        this._stateExport[SIM.types.creature] = {};
        this._stateExport[SIM.types.snack] = {};
        this._positions = {
            current : {},
            previous : {},
        };
        this.initOctree();
        this._dummyPosition = new Vector3(); // Three.js vector
    }

    get creatures() {
        return this._stateExport.creatures;
    }

    get snacks() {
        return this._stateExport.snacks;
    }

    updateStateFrom(entity) {
        const type = entity.type;
        const uuid = entity.uuid;
        const data = entity.exportData();
        this._stateExport[type][uuid] = data;
        // Move point in octree
        this._updateOctreePosition(entity);
    }

    getNearbyEntities(position, radius=5) {
        this._dummyPosition.copy(position); // YUKA to THREE Vector3
        const nearbyPointContainers = this._octree.findPoints(this._dummyPosition, radius, true);
        const nearbyEntities = [];
        for (let pointContainer of nearbyPointContainers) {
            if (pointContainer.data != null) {
                nearbyEntities.push(pointContainer.data);
            } else {
                this.reset("Octree search error, resetting...");
                break;
            }
        }
        return nearbyEntities;
    }

    getEntitiesOfType(type) {
        if (type == SIM.types.creature) {
            return this.creatures;
        } else if (type == SIM.types.snack) {
            return this.snacks;
        } else {
            return {};
        }
    }

    reset(message) {
        if (message) console.warn(message);
        this.initOctree();
        this._positions.previous = {};
    }

    export() {
        this._stateExport.time = Date.now();
        return this._stateExport;
    }

    exportJSON() {
        return JSON.stringify(this.export());
    }

    initOctree() {
        const min = SIM.bounds.min;
        const max = SIM.bounds.max;
        const minVec = new YUKA.Vector3(min.x, min.y, min.z);
        const maxVec = new YUKA.Vector3(max.x, max.y, max.z);
        const bias = SIM.octreeBias; 
        this._octree = new PointOctree(minVec, maxVec, bias);
    }

    _updateOctreePosition(entity) {
        const uuid = entity.uuid;
        if (this._positions.current[uuid] == null) {
            this._positions.current[uuid] = new Vector3();
        }
        this._positions.current[uuid].copy(entity.position);
        const position = this._positions.current[uuid];
        const prevPosition = this._positions.previous[uuid];
        if (prevPosition != null) {
            const data = this._octree.move(prevPosition, position);
            if (data == null) {
                this.reset("Octree move error, resetting...");
                this.initOctree();
                return;
            }
        } else {
            this._positions.previous[uuid] = new Vector3(); // initialize
            this._octree.set(position, entity);
        }
        this._positions.previous[uuid].copy(position);
    }
}

class Simulation {
    constructor() {
        // Settings
        this._debug = SIM.debug;
        // Time
        this._time = new YUKA.Time();
        this._timeSinceLastSnack = 0;
        // Entities
        this._entityManager = new YUKA.EntityManager();
        const x = SIM.bounds.cells.x;
        const y = SIM.bounds.cells.y;
        const z = SIM.bounds.cells.z;
        const cellPartition = new YUKA.CellSpacePartitioning(WIDTH, HEIGHT, DEPTH, x, y, z);
        this._entityManager.spatialIndex = cellPartition;
        this._simState = new SimulationState();
        this._generateCreatures();
        this._generateSnacks();
    }

    get state() {
        return this._simState.export();
    }

    get stateJSON() {
        return this._simState.exportJSON();
    }

    update() {
        const dt = this._time.update().getDelta();
        this._updateCreatures(dt);
        this._updateSnacks(dt);
        this._entityManager.update(dt);
        this.timeSinceLastDisperse += dt;
    }

    playerUpdate(socketId, creatureState) {
        let creature = this._playerCreatures.get(socketId);
        if (creature != null) {
            creature.playerUpdate(creatureState);
        } else {
            this.assignCreature(socketId); // Attempt to assign creature
        }
    }
    
    // Loop through creatures and see if one is available
    assignCreature(socketId) {
        for(let uuid of this._creatures.keys()) {
            const creature = this._creatures.get(uuid);
            if (!creature.isPlayer) {
                creature.steering.clear(); // remove simulation
                creature.assignPlayer(socketId);
                this._playerCreatures.set(socketId, creature);
                break;
            }
        }
    }

    unassignCreature(socketId) {
        const creature = this._playerCreatures.get(socketId);
        creature.unassignPlayer(socketId);
        this.log("creature " + creature.uuid + " unassigned from " + socketId);
        this._playerCreatures.delete(socketId);
    }

    // called from outside. send topic to nearest creatures
    disperseTopic(id, topic) {
        // ORIGIN POSITION NOT USED ANYMORE
        // if (originPosition == null) {

        // }
        // const radius = SIM.language.disperseRadius;
        // const nearbyEntities = this._simState.getNearbyEntities(originPosition, radius);
        // for (let entity of nearbyEntities) {
        //     if (entity.type == SIM.types.creature) {
        //         entity.receiveTopic(topic);
        //     }
        // }
        let creatures = this._creatures.values();
        creatures = [ ...creatures ];
        let creature = creatures[Math.floor(hash(id) * creatures.length)];
        creature.respondToTopic(topic, true);
        this.timeSinceLastDisperse = 0;
    }

    log(message, origin="Simulation") {
        console.log(origin, message);
    }

    // Triggered from button or randomly
    addSnack() {
        const snack = this._snackPool.pop(); // use snack pool
        if (snack != null) {
            console.log("snack added");
            snack.active = true;
            snack.randomizePosition({yOverwrite : MAX.y});
            snack.position.x *= 0.35;
            snack.position.y *= 0.45;
            // console.log("Snack spawned at: ", snack.position);
            this._activeSnacks.set(snack.uuid, snack);
            // this._entityManager.add(snack); // Add to YUKA simulation
            this._timeSinceLastSnack = 0;
        }
    }

    _generateCreatures() {
        this._creatures = new Map();
        this._playerCreatures = new Map();
        for (let i = 0; i < SIM.numCreatures; i++) {
            const creature = new CreatureEntity(this._simState);
            this._creatures.set(creature.uuid, creature);
            this._entityManager.add(creature); // Add to YUKA simulation
        }
    }

    _generateSnacks() {
        this._snacks = new Map();
        this._activeSnacks = new Map();
        this._snackPool = [];
        for (let i = 0; i < SIM.maxNumSnacks; i++) {
            const snack = new SnackEntity(this._simState);
            this._snackPool.push(snack);
            this._snacks.set(snack.uuid, snack);
        }
    }

    // Update NPC creatures
    _updateCreatures(dt) {
        for (const creatureId of this._creatures.keys()) {
            const creature = this._creatures.get(creatureId);
            if (!creature.isPlayer) {
                creature.agentUpdate(dt);
            }
            this._simState.updateStateFrom(creature);
        }
    }

    _updateSnacks(dt) {
        for (const snackId of this._snacks.keys()) {
            const snack = this._snacks.get(snackId);
            if ((!snack.active || snack.isExpired) && this._activeSnacks.has(snackId)) {
                snack.active = false;
                this._activeSnacks.delete(snackId);
                this._snackPool.push(snack);
            } else {
                snack.updatePosition();
            }
            this._simState.updateStateFrom(snack);
        }
        if (this._timeSinceLastSnack > SIM.snacks.timeout) {
            if (Math.random() < SIM.snacks.appearChance) {
                this.addSnack();
            }
        } else {
            this._timeSinceLastSnack += dt;
        }
    }
}

module.exports = Simulation;