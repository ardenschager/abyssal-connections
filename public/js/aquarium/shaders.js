const creatureVert = /* glsl */ `

	// #define STANDARD

	// #include <common>
	// #include <uv_pars_vertex>
	// #include <uv2_pars_vertex>
	// // #include <displacementmap_pars_vertex>
	// #include <color_pars_vertex>
	// #include <fog_pars_vertex>
	// #include <normal_pars_vertex>
	#include <morphtarget_pars_vertex>
	// #include <skinning_pars_vertex>
	// // #include <shadowmap_pars_vertex>
	// #include <logdepthbuf_pars_vertex>
	// #include <clipping_planes_pars_vertex>

	// attribute vec2 uv;
    precision mediump float;
	attribute vec2 uv2;
	attribute vec4 color;

	varying float vRadialDist;
	varying float vFogDepth;
	varying vec2 vUv;
	varying vec2 vUv2;
	varying vec4 vColor;
	varying vec3 vVertPos;
	varying vec3 vNormal;

	varying float vIsFace;
	varying float vIsStomach;
	varying float vIsEyes;
	varying float vIsEmissiveBase;
	varying float vIsEmissiveStripe;
	varying float vIsEmissiveAntenna;
	varying float vIsBodyJelly;
	varying float vIsHoodJelly;

    varying vec3 vWorldPos;
	varying vec3 vWorldNormal;

	uniform float uTime;
	uniform mat3 uvTransform;
	uniform mat3 uv2Transform;
	uniform mat4 uCameraMatrix;

	vec3 random3(vec3 c) {
		float j = 4096.0*sin(dot(c,vec3(17.0, 59.4, 15.0)));
		vec3 r;
		r.z = fract(512.0*j);
		j *= .125;
		r.x = fract(512.0*j);
		j *= .125;
		r.y = fract(512.0*j);
		return r-0.5;
	}

	/* skew constants for 3d simplex functions */
	const float F3 =  0.3333333;
	const float G3 =  0.1666667;

	// https://www.shadertoy.com/view/XsX3zB
	float simplex3d(vec3 p) {
		/* 1. find current tetrahedron T and it's four vertices */
		/* s, s+i1, s+i2, s+1.0 - absolute skewed (integer) coordinates of T vertices */
		/* x, x1, x2, x3 - unskewed coordinates of p relative to each of T vertices*/
		
		/* calculate s and x */
		vec3 s = floor(p + dot(p, vec3(F3)));
		vec3 x = p - s + dot(s, vec3(G3));
		
		/* calculate i1 and i2 */
		vec3 e = step(vec3(0.0), x - x.yzx);
		vec3 i1 = e*(1.0 - e.zxy);
		vec3 i2 = 1.0 - e.zxy*(1.0 - e);
		
		/* x1, x2, x3 */
		vec3 x1 = x - i1 + G3;
		vec3 x2 = x - i2 + 2.0*G3;
		vec3 x3 = x - 1.0 + 3.0*G3;
		
		/* 2. find four surflets and store them in d */
		vec4 w, d;
		
		/* calculate surflet weights */
		w.x = dot(x, x);
		w.y = dot(x1, x1);
		w.z = dot(x2, x2);
		w.w = dot(x3, x3);
		
		/* w fades from 0.6 at the center of the surflet to 0.0 at the margin */
		w = max(0.6 - w, 0.0);
		
		/* calculate surflet components */
		d.x = dot(random3(s), x);
		d.y = dot(random3(s + i1), x1);
		d.z = dot(random3(s + i2), x2);
		d.w = dot(random3(s + 1.0), x3);
		
		/* multiply d by w^4 */
		w *= w;
		w *= w;
		d *= w;
		
		/* 3. return the sum of the four surflets */
		return dot(d, vec4(52.0));
	}


	const mat3 rot1 = mat3(-0.37, 0.36, 0.85,-0.14,-0.93, 0.34,0.92, 0.01,0.4);
	const mat3 rot2 = mat3(-0.55,-0.39, 0.74, 0.33,-0.91,-0.24,0.77, 0.12,0.63);
	const mat3 rot3 = mat3(-0.71, 0.52,-0.47,-0.08,-0.72,-0.68,-0.7,-0.45,0.56);

	float sNoiseFractal(vec3 m) {
		return    0.5333333 * simplex3d(m * rot1)
				+ 0.2666667 * simplex3d(2.0 * m * rot2)
				+ 0.1333333 * simplex3d(4.0 * m * rot3)
				+ 0.0666667 * simplex3d(8.0 * m);
	}

	const float NOISE_SCALE = 0.1;


	void main() {

		// Includes
		#include <begin_vertex>
		#include <morphtarget_vertex>

		// Masks
		vIsFace = float(color.g > 0.75);
		vIsStomach = float(color.g > 0.2) - vIsFace;
		vIsEyes = float(color.g > 0.01) - max(vIsFace, vIsStomach);
		vIsEmissiveBase = float(color.b > 0.01);
		vIsEmissiveStripe = vIsEmissiveBase * float(color.r > 0.02);
		vIsEmissiveAntenna = vIsEmissiveBase - vIsEmissiveStripe;
		vIsBodyJelly = float(color.r > 0.75) - vIsEmissiveBase;
		vIsHoodJelly = float(color.r > 0.05 && color.r < 0.55);
		
		// UVs
		vUv = ( uvTransform * vec3( uv.x, uv.y, 1 ) ).xy;
		vUv2 = ( uv2Transform * vec3( uv2, 1 ) ).xy;

		// Radius outwards from jelly center
		float radialDist = length(transformed.xz);
		vec3 radialDir = normalize(transformed * vec3(1., 1., 0.));

		// typical vertex transformations (on blendshape vertex)
		mat4 mvp = projectionMatrix * modelViewMatrix;
		vec4 transWorldPos = mvp * vec4(transformed, 1.);

		// offset from the water
		float bodyNoiseOffset = vIsBodyJelly * radialDist * 1.1;
		float stripeNoiseOffset = vIsEmissiveStripe * radialDist;
		float hoodNoiseOffset = vIsHoodJelly * pow(radialDist, 0.2);
		float stomachNoiseOffset = vIsStomach * pow(radialDist, 0.1);


		float noiseOffset = bodyNoiseOffset + stripeNoiseOffset + hoodNoiseOffset + stomachNoiseOffset;
		// float noiseOffset = bodyNoiseOffset;
		// noiseOffset *= vIsEmissiveAntenna;
		noiseOffset *= 0.18; // offset mod

		// float offsetMod = float(color.r > 0.1) * min(1.35 * color.r, 1.);
		// offsetMod = mix(0.0, 0.18, offsetMod);
		// vec3 normalNoise = normal * sNoiseFractal(transWorldPos.xyz * NOISE_SCALE) * noiseOffset, -0.8); // tail

		float noiseVal = sNoiseFractal(transWorldPos.xyz * NOISE_SCALE);
		vec3 normalNoiseOffset = normal * noiseVal * noiseOffset; // tail
		vec3 radialNoiseOffset = radialDir * noiseVal * noiseOffset;

		float stomachMod = (1. - vIsStomach * 0.7);
		vec3 finalNoiseOffset = mix(radialNoiseOffset, normalNoiseOffset, 0.5 * stomachMod);

		// float 
		finalNoiseOffset = mix(finalNoiseOffset, max(radialNoiseOffset * 1.2, vec3(0.)), vIsHoodJelly);
		finalNoiseOffset = mix(finalNoiseOffset, vec3(0.), vIsEmissiveAntenna);

		vec4 modelPos = vec4( transformed + finalNoiseOffset * 10., 1.0 );

		// varyings for fresnel
		// vWorldNormal = normalize(mat3(uCameraMatrix) * normal);
		vWorldNormal = normalMatrix * normalize(normal);
        // vWorldPos = (modelPos * modelMatrix).xyz;
        vWorldPos = (modelViewMatrix * modelPos).xyz;

		vRadialDist = radialDist;

        vVertPos = transformed;
		vColor = color;
		vNormal = normal;
		vFogDepth = - vWorldPos.z;

		gl_Position = mvp * modelPos;
        // gl_Position = projectionMatrix * modelViewMatrix * worldPosition;
    }
`;

const creatureFrag = /* glsl */ `

    precision mediump float;

	// vertex attributes
	varying vec2 vUv;
	varying vec2 vUv2;
    varying vec3 vVertPos;
	varying vec3 vNormal;
    varying vec3 vWorldPos;
	varying vec3 vWorldNormal;
	varying vec4 vColor;

	// masks
	varying float vIsFace;
	varying float vIsStomach;
	varying float vIsEyes;
	varying float vIsEmissiveBase;
	varying float vIsEmissiveStripe;
	varying float vIsEmissiveAntenna;
	varying float vIsBodyJelly;
	varying float vIsHoodJelly;

	// misc
	varying float vEmissiveOffset;
	varying float vRadialDist;
	varying float vFogDepth;

	// uniforms
	uniform float uTime;
	uniform vec3 uCameraPos;

	// texture
	uniform sampler2D uAlbedo;
	uniform sampler2D uEmissiveRgb;

	// fog 
	uniform float uFogDensity;
	uniform vec3 uFogColor;

	// controller
	uniform float uStomachGlow;

	uniform float uInnerGlow;
	uniform float uSignalOn;
	uniform float uGlowBrightness;
	uniform float uSignalUniformity;
	uniform float uSignalNoiseOffset;
	uniform float uSignalTime;
	uniform float uSignalSpeed;
	uniform float uUniqueNumber;

	uniform vec3 uSignalTint;
	// uniform float uGlowUnity;
	// uniform vec3 uGlowTint;

	// https://gist.github.com/983/e170a24ae8eba2cd174f
	vec3 rgb2hsv(vec3 c)
	{
		vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
		vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
		vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

		float d = q.x - min(q.w, q.y);
		float e = 1.0e-10;
		return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
	}

	vec3 hsv2rgb(vec3 c)
	{
		vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
		vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
		return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
	}

	float max3 (vec3 v) {
		return max (max (v.x, v.y), v.z);
	}


	// https://www.shadertoy.com/view/lt3BWM
	#define HASHSCALE 0.1031

	float hash(float p)
	{
		vec3 p3  = fract(vec3(p) * HASHSCALE);
		p3 += dot(p3, p3.yzx + 19.19);
		return fract((p3.x + p3.y) * p3.z);
	}

	float fade(float t) { return t*t*t*(t*(6.*t-15.)+10.); }

	float grad(float hash, float p)
	{
		int i = int(1e4*hash);
		return (i & 1) == 0 ? p : -p;
	}

	float perlinNoise1D(float p)
	{
		float pi = floor(p), pf = p - pi, w = fade(pf);
		return mix(grad(hash(pi), pf), grad(hash(pi + 1.0), pf - 1.0), w) * 2.0;
	}
	
	// https://jsfiddle.net/8n36c47p/4/
	float fresnel() {
		vec3 worldViewDirection = normalize(uCameraPos - vWorldPos);
		float dp = dot(worldViewDirection, vWorldNormal);
		float invDp = dot(worldViewDirection, -vWorldNormal);
		float fresnelTerm = pow(dp, 1.5);
		float invFresnelTerm = pow(invDp, 1.5);

		float f1 = clamp(1.0 - fresnelTerm, 0., 1.);
		float f2 = clamp(1.0 - invFresnelTerm, 0., 1.);
		 // set frasnel on both sides of hood
		return  mix(f1, max(f1, f2), vIsHoodJelly);;
		
	}

	vec4 bioluminescence(vec3 albedo) {
		vec3 emissionMask = texture2D(uEmissiveRgb, vUv).rgb;
		float isAntenna = vIsEmissiveAntenna * float(emissionMask.g > 0.01);
		emissionMask.g *= 1.55 - 0.15;
		float noiseOffset0 = vColor.b * uUniqueNumber;

		float hueNoiseSize = mix(4., 1., float(emissionMask.g > 1.));
		float brightnessNoiseSize = mix(4., 1., float(emissionMask.g > 1.));

		float baseNoiseSpeed = mix(0.001, 0.0003, isAntenna);
		// default lights

		// float noiseSpeed0 = baseNoiseSpeed + 0.05 * 2. * (uUniqueNumber - 1.);
		vec3 baseTint = vec3(hash(uUniqueNumber), hash(uUniqueNumber * 2.), hash(uUniqueNumber * 3.));
		float hueNoise0 = perlinNoise1D(vUv2.y * hueNoiseSize + noiseOffset0 * 111. + uTime * (baseNoiseSpeed));
		float brightnessNoise0 = perlinNoise1D(vUv2.y * 3.5 + noiseOffset0 * 9. + uTime * 0.001 + uUniqueNumber) + 0.2;
		brightnessNoise0 = min(1., brightnessNoise0);
		vec3 emissiveLights0 = hsv2rgb(vec3(hueNoise0, 1., 1.));
		emissiveLights0 = mix(emissiveLights0, emissiveLights0 * baseTint, 0.65) * 0.7 + 0.1;
		vec3 bioLumRgb0 = mix(albedo + emissiveLights0, emissiveLights0, 0.5);
		float isEmissive0= max3(emissionMask * brightnessNoise0) * (1. - vIsStomach);
		// signal lights
		baseNoiseSpeed = mix(baseNoiseSpeed, uSignalSpeed * baseNoiseSpeed, uSignalOn);
		float noiseOffset1 = vColor.b * (1. - uSignalUniformity) + uSignalNoiseOffset; // * u
		float hueNoise1 = perlinNoise1D(vUv2.y * hueNoiseSize + noiseOffset1 * 11. + uSignalTime * baseNoiseSpeed);
		float brightnessNoise1 = perlinNoise1D(vUv2.y * 3.5 + noiseOffset1 * 9. + uSignalTime * 0.001) + 0.2;
		brightnessNoise1 = min(1., brightnessNoise1 + uGlowBrightness * 2.);
		vec3 emissiveLights1 = hsv2rgb(vec3(hueNoise1, 1., 1.));
		emissiveLights1 = emissiveLights1 * 1.1 + 0.1;
		vec3 bioLumRgb1 = mix(albedo + emissiveLights1, emissiveLights1, 0.5) * uSignalTint.rgb;
		float isEmissive1 = max3(emissionMask * brightnessNoise1) * (1. - vIsStomach);
		vec4 result = mix(vec4(bioLumRgb0, isEmissive0), vec4(bioLumRgb1, isEmissive1), uSignalOn);
		result = mix(result, result * 0.75, vIsEmissiveAntenna * max3(emissionMask));
		return result;
	}

	const vec3 STOMACH_FULL_COLOR = vec3(0.55, .8, 0.6);

    void main () {

        // Albedo, playing with the hue
		vec3 albedo = texture2D(uAlbedo, vUv).rgb;
		vec3 albedoCont = albedo * 1.;
		// Calc fresnel for later
		float fresnelFactor = fresnel();

		// Bioluminescence
		vec4 bioLumResult = bioluminescence(albedo);
		vec3 bioLumRgb = bioLumResult.rgb;
		float isEmissive = bioLumResult.a;

		albedo += uInnerGlow * 10.;

		// default noise
		

		// Stomach
		vec3 stomachFullColor = mix(STOMACH_FULL_COLOR, STOMACH_FULL_COLOR * vNormal.gbr, 0.25);
		vec3 stomachRgb = mix(albedo + vec3(0.1, 0., 0.), stomachFullColor, uStomachGlow);
		stomachRgb = mix(stomachRgb, stomachRgb * vNormal, 0.15);

		// Face
		albedo = mix(albedo, albedo * vec3(1.3, 0.375, 0.55), 0.62 * vIsFace);
		// albedo *= vec3(0.6, 0.8, 1.);
		// Combine colors
		vec3 finalRgb = mix(albedo, bioLumRgb, isEmissive);
		// finalRgb = mix(finalRgb, finalRgb * 1.5, vIsEmissiveStripe);
		// finalRgb.r = vIsEmissiveStripe;
		finalRgb = mix(finalRgb, stomachRgb, vIsStomach); // set stomach color
		finalRgb = finalRgb * mix(vec3(0.3, 0.4, 0.5) * 0.65, vec3(0.875, 1.075, 1.625) * 0.9, fresnelFactor);
		finalRgb *= 1.1;
		// finalRgb -= 0.15;
		finalRgb = mix(finalRgb, bioLumRgb * 1.0, isEmissive);
		// finalRgb = mix(finalRgb, albedoCont, 0.5);
		// Alpha special considerations
		// float alpha = mix(length(albedo) * 0.4, 0.925, length(emissionMask));
		float fogFactor = 1.0 - exp( - uFogDensity * uFogDensity * vFogDepth * vFogDepth );
		fogFactor -= 0.05 * fresnelFactor;
		fogFactor *= (1. - isEmissive);
		finalRgb = mix(finalRgb, uFogColor, fogFactor);

		float alpha = length(albedo) * 0.3765;
		// alpha = mix(alpha, alpha * fresnelFactor, 0.5);
		alpha = mix(alpha, 0.45, vIsFace);
		alpha = mix(alpha, mix(0.34, 0.55, uStomachGlow), vIsStomach); 
		// alpha = mix(alpha, 1., max(emissionMask.r, emissionMask.g));
		alpha = min(1., mix(alpha, 1., float(isEmissive > 0.05)));

		

		gl_FragColor = vec4(finalRgb, alpha);
		// gl_FragColor.rgb = mix( gl_FragColor.rgb, vec3(0.), fogFactor );
		// gl_FragColor = vec4(vFogDepth * 0.01, 0., 0., 1.);
    }

`

const snackVert = /* glsl */ `

    precision mediump float;

	varying vec2 vUv;
	varying vec3 vNormal;
	varying float vFogDepth;

	void main() {
		vUv = uv;
		vNormal = normal;
		mat4 mvp = projectionMatrix * modelViewMatrix;
        vec4 finalPos =  mvp * vec4( position, 1.0 );
        
		vec3 worldPos = (modelViewMatrix * vec4(position, 1.)).xyz;
		vFogDepth = - worldPos.z;

		gl_Position = finalPos;
    }
`;

const snackFrag = /* glsl */ `

    precision mediump float;

	varying vec2 vUv;
	varying vec3 vNormal;
	varying float vFogDepth;

	uniform float uOpacity;
	uniform float uTime;

	const vec3 SNACK_RGB = vec3(1.05, 1.6, 1.85);

	// float fresnel() {
	// 	vec3 worldViewDirection = normalize(uCameraPos - vWorldPos);
	// 	float dp = dot(worldViewDirection, vWorldNormal);
	// 	float fresnelTerm = pow(dp, 1.5);
	// 	float f1 = clamp(1.0 - fresnelTerm, 0., 1.);
	// 	 // set frasnel on both sides of hood
	// 	return  f1;
	// }

    void main () {
		vec3 finalRgb = SNACK_RGB * 1.1 + 0.15 * sin(uTime * 0.002);
		finalRgb = mix(finalRgb, vNormal * finalRgb, 0.1);

		float fogFactor = 1.0 - exp( - 0.03 * 0.03 * vFogDepth * vFogDepth );
		finalRgb = mix(finalRgb, finalRgb * 0.25, fogFactor);
		gl_FragColor = vec4(finalRgb, 0.25 * uOpacity);
    }

`;

const roomVert = /* glsl */ `

    precision mediump float;

	varying vec2 vUv;
	varying vec3 vNormal;
	varying vec2 vScreenCoord;

	void main() {
		vUv = uv;
		vNormal = normal;
		mat4 mvp = projectionMatrix * modelViewMatrix;
        vec4 finalPos =  mvp * vec4( position, 1.0 );
		vScreenCoord = finalPos.xy;
		gl_Position = finalPos;
    }
`;

const roomFrag = /* glsl */ `

    precision mediump float;

	varying vec2 vUv;
	varying vec3 vNormal;
	varying vec2 vScreenCoord;

	uniform float uTime;

	const vec3 TOP_RGB = vec3(0., 0.03, 0.065) * 0.8;
	const vec3 BOTTOM_RGB = vec3(0., 0.03, 0.065) * 0.4;

    void main () {
		vec2 screenCoord = vScreenCoord;
		screenCoord.y *= 0.015;
		vec3 finalRgb = mix(BOTTOM_RGB, TOP_RGB, screenCoord.y);
		gl_FragColor = vec4(finalRgb, 1.);
    }

`;