// Snack positioning and rendering script



const PI2 = Math.PI * 2;


// Enes
AFRAME.registerComponent('snack', {

	init: function () {
        // this.el.addEventListener('object3dset', this.setMaterialProps.bind(this)); 
		this._displayEl = document.createElement('a-entity'); 
		this._displayEl.setAttribute('gltf-model', '/assets/models/pellet.glb');
        this._displayEl.addEventListener('object3dset', this._initGltf.bind(this)); 
		// this._displayEl.material = new THREE.MeshStandardMaterial();
		// this._displayEl.setAttribute("material", "color : green");
		this._displayEl.object3D.scale.set(0.3, 0.3, 0.3);
		this._displayEl.object3D.visible = false;
		this.el.appendChild(this._displayEl);
		this._t = 0;
		this._displayEl.object3D.rotation.y = Math.random() * PI2;
		this._opacity = { // clean up later
			value: 0
		}
		this._serverTransform = {
			position: new THREE.Vector3(),
			quaternion: new THREE.Quaternion(),
		}
		this._isActive = false;
	},

	tick: function (t, dt) {
		if (!this._displayEl.object3D.visible) return;
		const mesh = this._displayEl.getObject3D('mesh');
        if (!mesh) return;
        mesh.traverse((node) => {
			// uniforms
            if (node.material != null) {
				node.material.uniforms.uTime.value = this._t % TIME_LIMIT;
				node.material.uniforms.uOpacity.value = this._opacity.value;
            }
        });
		if (this._isActive) {
			this._displayEl.object3D.rotation.x = PI2 * this._t * 0.00005;
			this._setTransform();
		}
		this._t += dt;
	},

	receiveData: function(snackData) {
		if (settings == null || this._displayEl == null) return;
		if (snackData.active) {
			if (!this._isActive) {
				this.fadeIn();
			} 
			this._isActive = true;
			this._displayEl.object3D.visible = true;
		} else if (this._isActive == true) {
			this._isActive = false;
			this.fadeOut();
		}
		this._serverTransform.position.copy(snackData.position);
		this._serverTransform.quaternion.copy(snackData.quaternion);
	}, 

	fadeIn: function() {
		Tween.get(this._opacity)
		.to({value: 1}, 2000);
	},

	fadeOut: function() {
		Tween.get(this._opacity)
		.to({value: 0}, 2000)
		.call(() => {
			this._displayEl.object3D.visible = false;
			this._t = 0;
		});
	},

	_setTransform() {
		this.el.object3D.position.copy(this._serverTransform.position, 0.01);
		this.el.object3D.quaternion.copy(this._serverTransform.quaternion, 0.01);
	},

	_initGltf() {
		const mesh = this._displayEl.getObject3D('mesh');
        if (!mesh) return;
        mesh.traverse(function (node) {
            if (node.material) {
				// each creature gets a sperate materials since the animations will be different
				const snackMaterial = new THREE.ShaderMaterial( {
					uniforms: THREE.UniformsUtils.merge([
						THREE.UniformsLib.common,
						{
							uTime: { type: 'f', value: 0.0 },
							uOpacity: { type: 'f', value: 0.0 },
						},
					]),
					vertexShader: snackVert,
					fragmentShader: snackFrag,
					transparent: true,
				});
				node.material = snackMaterial;
                node.material.side = THREE.DoubleSide;
				this._material = snackMaterial;
            }
        });
	},

});