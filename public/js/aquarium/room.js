
let roomMaterial = new THREE.ShaderMaterial( {
    uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.common,
        {
            uTime: { type: 'f', value: 0.0 },
        },
    ]),
    vertexShader: roomVert,
    fragmentShader: roomFrag,
    transparent: false,
    depthTest: true,
    depthWrite: true,
});

AFRAME.registerComponent('room', {
  
    init: function () {
        // For changing the material for a gltf model, 
        // you have to add a callback to this event
        this.el.addEventListener('object3dset', this.setMaterialProps.bind(this));  
    },

    setMaterialProps: function() {
        const mesh = this.el.getObject3D('mesh');
        if (!mesh) return;
        mesh.traverse(function (node) {
            if (node.material) {
                node.material.side = THREE.DoubleSide;
                node.material = roomMaterial.clone();
                node.material.side = THREE.DoubleSide;
                this.material = node.material;
            }
        });
    },

    tick: function (t, dt) {
        const mesh = this.el.getObject3D('mesh');
        if (!mesh) return;
        mesh.traverse(function (node) {
            if (node.material) {
                node.material.uniforms.uTime.value = t;
            }
        });
    },
});