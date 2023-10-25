// Constants
const HALF_PI = Math.PI * 0.5;

// Globals
let settings;

// Allow us to remove elements
Element.prototype.remove = function() {
    this.parentElement.removeChild(this);
}
NodeList.prototype.remove = HTMLCollection.prototype.remove = function() {
    for(var i = this.length - 1; i >= 0; i--) {
        if(this[i] && this[i].parentElement) {
            this[i].parentElement.removeChild(this[i]);
        }
    }
}

// TODO: move this

// let context;
// let analyser;
// let _timeData;

// function connectAudioAPI() {
//     try {
//         context = new AudioContext();
//         analyser = context.createAnalyser();
//         analyser.fftSize = 32;
//         navigator.mediaDevices
//             .getUserMedia({ audio: true, video: false })
//             .then(function (stream) {
//                 mediaSource = context.createMediaStreamSource(stream);
//                 mediaSource.connect(analyser);
//                 context.resume();
//             })
//             .catch(function (err) {
//                 alert(err)
//             });
//     } catch (e) {
//         alert(e)
//     }
// }

class ServerHelper {
	constructor(debug = true) {

		this._socket = io("/aquarium");
		this._debug = debug;
		this.init = false;
		this._socket.on("init", (_settings) => {
			this.log("initialized with: " + _settings);
			settings = _settings;
			this.init = true;
		});

		this._socket.on("updateGameState", (state) => {
			if (this.onReceiveUpdate != null) {
				this.onReceiveUpdate(state);
			}
		});

		this._time = 0;
	}

	get id() {
		return this._socket.id;
	}

	playerUpdate(dt, data) {
		this._socket.emit("playerUpdate", data);
		this._time += dt;
	}

	log(message) {
		if (!this._debug) return;
		console.log("ServerHelper: ", message);
	}

	addFood() {
		this._socket.emit("add-snack");
	}

	emitTopic(position, topic) {
		this._socket.emit("disperse-topic", position, topic);
	}

}

AFRAME.registerComponent('scene-manager', {

	init: function () {
		this._sceneEl = document.querySelector('a-scene');
		this._serverHelper = new ServerHelper();
		this._serverHelper.onReceiveUpdate = (state) => {
			this._receiveNewState(state);
		}
		this._scene = document.querySelector('a-scene');
		// document.body.addEventListener('click', () => {
		document.body.onmousedown = (event) => {
			this._onClick();
		}
		// });  
		postprocessingSystem.init(this._sceneEl);
		// connectAudioAPI();
	},

	tick: function (t, dt) {
		// console.log(this.settings);
		// let timeData = new Uint8Array(analyser.frequencyBinCount);
    	// analyser.getByteFrequencyData(timeData);
		// _timeData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
		// for (let i = 0; i < timeData.length; i++) { // consolidate frequencies
		// 	const idx = Math.floor(i / 2);
		// 	_timeData[idx] = timeData[i];
		// }
		// console.log(_timeData);
		this._sortEntities(); // change this arg later
	},

	_onClick: function() {
		console.log("emit");
		// this._serverHelper.emitTopic(this._scene.camera.el.object3D.position, Math.floor(Math.random() * 300));
		this._serverHelper.addFood();
	},

	// Sort entities to avoid transparency issues
	// (tried this, doesn't do shit...)
	_sortEntities: function () { // change this arg
		const entities = [];
		const cameraPos = this._scene.camera.el.object3D.position;
		if (this._creatures == null) return;
		for (let creature of Object.values(this._creatures)) {
			const creaturePos = creature.object3D.position;
			const dist = cameraPos.distanceTo(creaturePos);
			entities.push({
				dist: dist, 
				entity: creature
			});
		}
		entities.sort((a, b) => {
			return b.dist - a.dist;
		});
		// Apply sorted order
		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i].entity;
			entity.object3D.renderOrder = i;
			
		}
	},

	_receiveNewState: function (state) {
		if (this._previousState == null) {
			this._previousState = state;
		} else {
			const delta = state.time - this._previousState.time;
			if (!this._init) {
				this._spawnCreatures(state);
				this._spawnSnacks(state);
				this._init = true;
			}	
			this._applyStates(state);
		}
	},

	_spawnCreatures (state) {
		this._creatures = {};
		for (let uuid of Object.keys(state.creature)) {
			const scene = document.querySelector('a-scene');
			const creature = document.createElement('a-entity');
			creature.setAttribute('creature', true);
			scene.appendChild(creature);
			this._creatures[uuid] = creature;
		}
	},

	_spawnSnacks (state) {
		this._snacks = {};
		for (let uuid of Object.keys(state.snack)) {
			const scene = document.querySelector('a-scene');
			const snack = document.createElement('a-entity');
			snack.setAttribute('snack', true);
			scene.appendChild(snack);
			this._snacks[uuid] = snack;
		}
	},

	_applyStates (state) {
		for (let uuid of Object.keys(state.creature)) {
			const creatureData = state.creature[uuid];
			// creatureData.timeData = _timeData;
			const creature = this._creatures[uuid];
			if (creature != null) {
				const creatureComp = creature.components.creature;
				creatureComp.receiveData(creatureData);
			}
		}
		for (let uuid of Object.keys(state.snack)) {
			const snackData = state.snack[uuid];
			const snack = this._snacks[uuid];
			if (snack != null) {
				const snackComp = snack.components.snack;
				snackComp.receiveData(snackData);
			}
		}
	},

});