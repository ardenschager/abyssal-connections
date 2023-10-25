const PP = POSTPROCESSING;

const BLOOM_PARAMS = {
  exposure: 1,
  bloomStrength: 1.5,
  bloomThreshold: 0.4,
  bloomRadius: 0.5
};

const postprocessingSystem = {

	assets: null,
	composer: null,
	originalRenderMethod: null,

	/**
	 * Sets the preloaded scene assets.
	 *
	 * @param {Map} assets - A collection of scene assets.
	 * @return {Object} This system.
	 */

	setAssets(assets) {

		this.assets = assets;
		return this;

  },

	/**
	 * Initializes this system.
	 */

	init(sceneEl) {

	const scene = sceneEl.object3D;
	const renderer = sceneEl.renderer;

    console.log(renderer);
	const render = renderer.render;
	const camera = sceneEl.camera;

	const assets = this.assets;
	const clock = new THREE.Clock();

    const renderScene = new THREE.RenderPass( scene, camera );

    const bloomPass = new THREE.UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
    bloomPass.threshold = BLOOM_PARAMS.bloomThreshold;
    bloomPass.strength = BLOOM_PARAMS.bloomStrength;
    bloomPass.radius = BLOOM_PARAMS.bloomRadius;

    const colorShader = {
      uniforms: {
        tDiffuse: { value: null },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
          vec4 previousPassColor = texture2D(tDiffuse, vUv);
          vec4 finalColor = previousPassColor;
          finalColor *= 1.21;
          finalColor -= 0.015;
          gl_FragColor = finalColor;
        }
      `,
    };

	// let smaaPass = new THREE.SMAAPass(window.innerWidth, window.innerHeight)

	// var fxaaPass = new THREE.ShaderPass( THREE.FXAAShader );
	// var pixelRatio = renderer.getPixelRatio();
	// var uniforms = fxaaPass.material.uniforms;
	// uniforms[ 'resolution' ].value.x = 1 / ( window.innerWidth * pixelRatio );
	// uniforms[ 'resolution' ].value.y = 1 / ( window.innerHeight * pixelRatio );
  
    const colorPass = new THREE.ShaderPass(colorShader);
    colorPass.renderToScreen = true;

    composer = new THREE.EffectComposer( renderer );
    composer.addPass( renderScene );
    // composer.addPass( smaaPass );
    composer.addPass( bloomPass );
    composer.addPass( colorPass );

		// const composer = new PP.EffectComposer(renderer);
    // composer.addPass(new PP.RenderPass(scene, camera));

    // // const bloomEffect = new PP.SelectiveBloomEffect(scene, camera, {
		// // 	blendFunction: PP.BlendFunction.ADD,
		// // 	mipmapBlur: true,
		// // 	luminanceThreshold: 0.01,
		// // 	luminanceSmoothing: 0.1,
		// // 	intensity: 500.0
		// // });

    // // let bloomPass = new PP.UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 )
    // // bloomPass.threshold = 0.21
    // // bloomPass.strength = 1.2
    // // bloomPass.radius = 0.55
    // // bloomPass.renderToScreen = true

    // const bloomEffect = new PP.BloomEffect({
    //   blendFunction : PP.BlendFunction.ADD,
    //   luminanceThreshold : 0.2,
    //   luminanceSmoothing : 0.025,
    //   mipmapBlur : false,
    //   intensity : 100.0,
    //   radius : 5.85,
    //   levels : 8,
    //   kernelSize : PP.KernelSize.LARGE,
    //   resolutionScale : 0.5,
    // });

    // const noiseEffect = new PP.NoiseEffect();

    // const effectPass = new PP.EffectPass(camera, bloomEffect);
    // effectPass.renderToScreen = true;
    // // composer.addPass(effectPass);
    // // composer.addPass(bloomPass);

    // // // camera.aspect = canvas.clientWidth / canvas.clientHeight;
    // // // camera.updateProjectionMatrix();
    // effectPass.setSize(window.width, window.height);

    // renderer.setPixelRatio( window.devicePixelRatio );
    // renderer.setSize( window.innerWidth, window.innerHeight );

    composer.setSize( window.innerWidth, window.innerHeight );


		let calledByComposer = false;

		renderer.render = function() {

			if(calledByComposer) {

				render.apply(renderer, arguments);

			} else {

				calledByComposer = true;
				composer.render(clock.getDelta());
				calledByComposer = false;

			}

		};

	},

	/**
	 * Clean up when the system gets removed.
	 */

	remove() {

		this.composer.renderer.render = this.originalRenderMethod;
		this.composer.dispose();

	}

};

/**
 * Loads scene assets.
 *
 * @return {Promise} A promise that will be fulfilled as soon as all assets have been loaded.
 */

function load() {

	const assets = new Map();
	const loadingManager = new THREE.LoadingManager();

	return new Promise((resolve, reject) => {

		let image;

		loadingManager.onError = reject;
		loadingManager.onProgress = (item, loaded, total) => {

			if(loaded === total) {

				resolve(assets);

			}

		};

		// Load the SMAA images.
		image = new Image();
		image.addEventListener("load", function() {

			assets.set("smaa-search", this);
			loadingManager.itemEnd("smaa-search");

		});

		loadingManager.itemStart("smaa-search");
		image.src = PP.SMAAEffect.searchImageDataURL;

		image = new Image();
		image.addEventListener("load", function() {

			assets.set("smaa-area", this);
			loadingManager.itemEnd("smaa-area");

		});

		loadingManager.itemStart("smaa-area");
		image.src = PP.SMAAEffect.areaImageDataURL;

	});

}
console.log('a')

// Wait until A-Frame is ready.
// document.querySelector("a-scene").addEventListener("loaded", function() {
//   console.log("b");

// 	load().then((assets) => {

// 		AFRAME.registerSystem("postprocessing", postprocessingSystem.setAssets(assets));

// 	}).catch(console.error);

// });