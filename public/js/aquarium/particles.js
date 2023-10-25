// Snack positioning and rendering script



const PI2 = Math.PI * 2;

const NUM_PARTICLES = 5000;
const NUM_ATTRIBUTES = 3;

// Enes
AFRAME.registerComponent('snack', {

	init: function () {
		this.geometry = new THREE.BufferGeometry();
		this.positions = new Float32Array(NUM_PARTICLES);
		for (let i = 0; i < NUM_PARTICLES * NUM_ATTRIBUTES; i++) {
			this.positions[i] = Math.random();
		}
		particlesG
	},

	tick: function (t, dt) {

	},

});