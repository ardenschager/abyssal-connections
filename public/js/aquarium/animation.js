const Tween = createjs.Tween;
const Ease = createjs.Ease;

const TIME_LIMIT = 200000;

// Animation constants
const NUM_STROKE_FRAMES = 6;
const STROKE_FRAMES = {
	0: {
		target: {
			Stroke0: 0,
			Stroke1: 0,
			Stroke2: 0,
			Eat0: 0,
			zOffset: 0.25,
		},
		time: 700,
		easing: Ease.cubicOut,
	},
	1: {
		target: {
			Stroke0: 1,
			Stroke1: 0,
			Stroke2: 0,
			Eat0: 0.3,
			zOffset: -0.1,
		},
		time: 500,
		easing: Ease.cubicOut,
	},
	2: {
		target: {
			Stroke0: 1,
			Stroke1: 0.8,
			Stroke2: 0,
			Eat0: 0.2,
			zOffset: -0.3,
		},
		time: 500,
		easing: Ease.cubicOut,
	},
	3: {
		target: {
			Stroke0: 0,
			Stroke1: 0.8,
			Stroke2: 0,
			Eat0: 0.3,
			zOffset: 0,
		},
		time: 185,
		easing: Ease.cubicOut,
	},
	4: {
		target: {
			Stroke0: 0,
			Stroke1: 0.8,
			Stroke2: 1,
			Eat0: 0.4,
			zOffset: 0.25,
		},
		time: 125,
		easing: Ease.cubicOut,
	},
	5: {
		target: {
			Stroke0: 0,
			Stroke1: 0,
			Stroke2: 1,
			Eat0: 0.75,
			zOffset: 0.5,
		},
		time: 250,
		easing: Ease.elasticOut,
	}
}

const EAT_FRAMES = {
	0: {
		target: {
			Eat0: 1,
		},
		time: 700,
		easing: Ease.cubicOut,
	},
	1: {
		target: {
			Eat0: 0,
		},
		time: 500,
		easing: Ease.cubicOut,
	},
}

class MorphAnimator {
	constructor() {
		this._morphMap = {
			Stroke0: 0,
			Stroke1: 0, 
			Stroke2: 0,
			Eat0: 0,
			zOffset: 0,
		}
		this._state = 0;
		this._t = Math.random() * 5000;
		this.speed = 0.5
	}

	init() {
		const waitTime = Math.floor(Math.random() * 5000); // number ms
		this.animateStroke(0, waitTime);
	}

	animateStroke(n, waitTime=0) {
		const stroke = STROKE_FRAMES[n];
		Tween.get(this._morphMap)
			.wait(waitTime)
			.to(stroke.target, stroke.time / this.speed)
			// .easing()
			.call(() => {
				this.animateStroke((n + 1) % NUM_STROKE_FRAMES);
			}
		);
	}

	animateEat() {
		const eat0 = EAT_FRAMES[0];
		const eat1 = EAT_FRAMES[1];
		Tween.get(this._morphMap)
			.to(eat0.target, eat0.time)
			// .easing()
			.call(() => {
				Tween.get(this._morphMap)
				.to(eat1.target, eat1.time);
			}
		);
	}

	setMorphsToNode(node) {
		for (let [name, value] of Object.entries(this._morphMap)) {
			var pos = node.userData.targetNames.indexOf(name);
			if (pos != null) {
				node.morphTargetInfluences[pos] = value;
			}
		}
	}

	setZOffset(position) {
		position.z = this._morphMap.zOffset;
	}
}

function lerp (start, end, amt){
	return (1-amt)*start+amt*end
}

String.prototype.hashCode = function() {
	var hash = 0, i, chr;
	if (this.length === 0) return hash;
	for (i = 0; i < this.length; i++) {
	  chr   = this.charCodeAt(i);
	  hash  = ((hash << 5) - hash) + chr;
	  hash |= 0; // Convert to 32bit integer
	}
	return hash;
};

const defaultUniforms = {
	uGlowBrightness: {value: 0},
	uSignalTint: {value: new THREE.Vector3(1, 1, 1)},
	uSignalUniformity: {value: 0},
	uNoiseRescale: {value: 0},
}

class MaterialAnimator {
	constructor(creature) {
		this._creature = creature;
        this._generateTopicUniformMap();
		this._cameraObject = document.querySelector('a-scene').camera.el.object3D; 
		this._prev = {

		};
	}

	flash(material) {
		Tween.get(material.uniforms.uInnerGlow)
		.to({value: 1}, 0.765 * 1000)
		// .easing(Ease.cubicOut)
		.call(() => {
			Tween.get(material.uniforms.uInnerGlow)
				.wait(0.2 * 1000)
				.to({value: 0}, 0.35 * 1000);
		});
		
	}

	emitTopic(material, topic) {
		if (material?.uniforms?.uGlowBrightness == null) return;
		if (this.topicUniformMap == null) return;

		// translate topic to properties
		// add Tween.js animation
		const uniformTarget = this.topicUniformMap.get(topic);

		Tween.get(material.uniforms.uGlowBrightness)
			.to(uniformTarget.uGlowBrightness, uniformTarget.attackTime)
			// .easing(Ease.cubicOut)
			.call(() => {
				// console.log(material.uniforms.uGlowBrightness);
				Tween.get(material.uniforms.uGlowBrightness)
					.wait(uniformTarget.sustainTime)
					.to(defaultUniforms.uGlowBrightness, uniformTarget.releaseTime);
			});

		if (material.uniforms.uSignalOn.value > 0) {
			Tween.get(material.uniforms.uSignalTint.value)
			.to(uniformTarget.uSignalTint.value, uniformTarget.attackTime * 0.5);
		} else {
	    	material.uniforms.uSignalTint.value.copy(uniformTarget.uSignalTint.value);
		}

		// console.log(material.uniforms.uSignalOn);


		Tween.get(material.uniforms.uSignalOn)
			.to({value: 1}, uniformTarget.attackTime)
			// .easing(Ease.cubicOut)
			.call(() => {
				Tween.get(material.uniforms.uSignalOn)
					.wait(uniformTarget.sustainTime)
					.to({value: 0}, uniformTarget.releaseTime);
			});

		material.uniforms.uSignalUniformity.value = uniformTarget.uSignalUniformity.value;
		material.uniforms.uSignalNoiseOffset.value = uniformTarget.uSignalNoiseOffset.value;
		material.uniforms.uSignalSpeed.value = uniformTarget.uSignalSpeed.value;

		// material.uniforms.uSignalSpeed.value = uniformTarget.uSignalSpeed.value;
		material.uniforms.uSignalTime.value = 0;

	}

	animateMaterial(material, creatureData, t, dt) {
		if (material == null || creatureData == null) return; 
		if (this._uniqueNumber == null) {
			this._uniqueNumber = Math.sin(this._creature.uuid.hashCode()) * 0.5 + 0.5;
		}
		// Time
		// material.uniforms.uTime.value = (material.uniforms.uTime.value + dt) % TIME_LIMIT;
		material.uniforms.uTime.value = (material.uniforms.uTime.value + dt);
		material.uniforms.uSignalTime.value += dt;
		material.uniforms.uCameraPos.value.copy(this._cameraObject.position);
		material.uniforms.uUniqueNumber.value = this._uniqueNumber;
		// material.uniforms.uCameraMatrix.value.copy(this._cameraObject.matrixWorld);
		// console.log(material.uniforms.uCameraMatrix.value.toArray());
		// Stomach glow
		let stomachGlow = Math.max(Math.min(-0.25 + 1 / (creatureData.desires.eat + 0.001), 1), 0);
		if (this._prev.stomachGlow != null) {
			stomachGlow = lerp(this._prev.stomachGlow, stomachGlow, 0.003); // smooth signal
		} 
		this._prev.stomachGlow = stomachGlow;
		material.uniforms.uStomachGlow.value = stomachGlow;

		// console.log(material.uniforms.uGlowBrightness);
		
	}

	// magic numbers everywhere
	// generates shader uniforms from topic number using language seed
	_generateTopicUniformMap() {
		if (settings == null) return;
		if (this.topicUniformMap == null) {
			// Get seeded random function from setting seed
			const seed = cyrb128(settings.CTR.language.model.seed);
			const prototype = Object.getPrototypeOf(this)
			prototype.rand = sfc32(seed[0], seed[1], seed[2], seed[3]);
			prototype.topicUniformMap = new Map();
			const numTopics = settings.CTR.language.model.numWords;
			for (let i = 0; i < numTopics; i++) {
				const uniformTargets = {
					uGlowBrightness: {value: this._seededBoxMuller(2.0, 0.25)},
					uSignalTint: {value: this._getRandomTint()},
					uSignalUniformity: {value: 0.5 + 0.5 * this.rand()},
					uSignalNoiseOffset: {value: this.rand() * 10},
					uSignalSpeed: {value: this.rand() * 10},
					uNoiseRescale: {value: this.rand() - 0.5},
					uSignalSpeed: {value: this._seededBoxMuller(1, 0.3)},
					attackTime: this._seededBoxMuller(1200, 300),
					sustainTime: this._seededBoxMuller(2000, 650),
					releaseTime: this._seededBoxMuller(1200, 300),
				}
				prototype.topicUniformMap.set(i, uniformTargets);
			}
	    }
    }

	_seededBoxMuller(mean, stdDev) {
		if (this.rand == null) return;
		return boxMuller(mean, stdDev, this.rand);
	}
		

	_getRandomTint() {
		let r1 = this._seededBoxMuller(1.025, 0.325);
		let r2 = this._seededBoxMuller(1.025, 0.325);
		let r3 = this._seededBoxMuller(1.025, 0.325);
		return new THREE.Color(r1, r2, r3);
	}
}