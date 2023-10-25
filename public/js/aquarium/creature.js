

// Load textures once for all creatures
const loader = new THREE.TextureLoader();
const albedoTex = loader.load( '../../assets/textures/creatureAlbedo.png', (texture) => {
	texture.flipY = false;
});
const emissiveTex = loader.load( '../../assets/textures/creatureEmissiveRgb.png', (texture) => {
	texture.flipY = false;
});

AFRAME.registerComponent('creature', {

	init: function () {
		this._displayEl = document.createElement('a-entity'); 
		this._displayEl.setAttribute('gltf-model', '/assets/models/creature2.glb');
        this._displayEl.addEventListener('object3dset', this._initGltf.bind(this)); 
		this._displayEl.object3D.rotation.set(HALF_PI, 0, 0);
		this.el.appendChild(this._displayEl);
		this._morphAnimator = new MorphAnimator();
		this._morphAnimator.init();
		this._materialAnimator = new MaterialAnimator(this);
		// transform smoothing
		this._serverTransform = {
			pos : new THREE.Vector3(0, 0, 0),
			quat : new THREE.Quaternion(0, 0, 0, 0),
		};
	},

	tick: function (t, dt) {
		const mesh = this._displayEl.getObject3D('mesh');
        if (!mesh) return;
        mesh.traverse((node) => {
			// morph targets
			if (node.morphTargetInfluences && node.userData.targetNames){
				this._morphAnimator.setMorphsToNode(node);
			}
			// uniforms
            if (node.material != null) {
				this._material = node.material;
				this._setMaterialFromSocial(node.material, this._creatureData);
				this._materialAnimator.animateMaterial(node.material, this._creatureData, t, dt);
            }
        });
		this._morphAnimator.setZOffset(this._displayEl.object3D.position);
		this._interpolateTransform();
	},

	receiveData: function(creatureData) {
		if (settings == null || this._displayEl == null) return;
		this.uuid = creatureData.uuid;
		// if (creatureData.timeData != null && this._material != null) {
			// console.log(creatureData.timeData);
			// this._material.uniforms.uInnerGlow.value = creatureData.timeData[0] / 1500;
		// }
		this._morphAnimator.speed = creatureData.speed * 0.5;
		this._handleBehaviorState(creatureData);
		this._setTransform(creatureData);
		this._creatureData = creatureData;
	}, 

	_initGltf() {
		const mesh = this._displayEl.getObject3D('mesh');
        if (!mesh) return;
        mesh.traverse(function (node) {
            if (node.material) {
				// each creature gets a sperate materials since the animations will be different
				let creatureMaterial = new THREE.ShaderMaterial( {
					uniforms: THREE.UniformsUtils.merge([
						THREE.UniformsLib.common,
						{
							uInnerGlow: { type: 'f', value: 0.0 },
							uTime: { type: 'f', value: Math.random() * 100 }, // start randomly to 
							uStomachGlow: { type: 'f', value: 0.0 },
							uAlbedo: { type: 't', value: null },
							uEmissiveRgb: { type: 't', value: null },
							uCameraPos: { value: new THREE.Vector3() },
							uFogColor: { value: new THREE.Color(0, 0.035, 0.05) },
							uFogDensity: { type: 'f', value: 0.06  },
							uGlowBrightness: { type: 'f', value: 0.0 },
							uSignalOn: { type: 'f', value: 1.0 },
							uSignalTime: { type: 'f', value: 0.0 },
							uSignalTint: { value: new THREE.Color(1, 1, 1) },
							uSignalUniformity: { type: 'f', value: 0.0 },
							uSignalNoiseOffset: { type: 'f', value: 0.0 },
							uSignalSpeed: { type: 'f', value: 0.0 },
							uUniqueNumber: { type: 'f', value: Math.random() }, // overwrite with hash later
						},
					]),
					vertexShader: creatureVert,
					fragmentShader: creatureFrag,
					transparent: true,
					depthTest: true,
					depthWrite: true,
				});
				creatureMaterial.uniforms.uAlbedo.value = albedoTex;
				creatureMaterial.uniforms.uEmissiveRgb.value = emissiveTex;
				// set material to node
				node.material = creatureMaterial;
                node.material.side = THREE.DoubleSide;
				this._material = creatureMaterial;
            }
        });
	},

	// Improve this later...
	_interpolateTransform() {
		this.el.object3D.position.lerp(this._serverTransform.pos, 0.05);
		this.el.object3D.quaternion.slerp(this._serverTransform.quat, 0.05);
	},

	_handleBehaviorState(creatureData) {
		if (creatureData.state != this._previousState) {
			if (this._previousState = settings.CTR.states.pursueFood) {
				this._morphAnimator.animateEat();
			}
			this._previousState = creatureData.state;
		}
	},

	_setMaterialFromSocial(material, creatureData) {
		if (material == null || creatureData == null) return; // social events -> shader
		const socialState = creatureData.socialState;
		if (this.socialState != socialState) {
			if (creatureData.socialState == settings.CTR.socialStates.emit) {
				this._materialAnimator.emitTopic(material, creatureData.topic);
			}
		}
		if (creatureData.receivedTopic && this._prevReceivedTopic != creatureData.receivedTopic)
		{
			this._materialAnimator.flash(material);
		}
		this._prevReceivedTopic = creatureData.receivedTopic;
		this.socialState = socialState;
		this.topic = creatureData.topic;
	},

	_setTransform(creatureData) {
		const pos = creatureData.position;
		const quat = creatureData.quaternion;
		// init first time
		this._serverTransform.pos.copy(pos);
		this._serverTransform.quat.copy(quat);
	},

	_setMaterialProps: function() {
		const mesh = this._displayEl.getObject3D('mesh');
        if (!mesh) return;
        mesh.traverse(function (node) {
            if (node.material) {
				node.material = creatureMaterial.clone();
                node.material.side = THREE.DoubleSide;
            }
        });
    },
});