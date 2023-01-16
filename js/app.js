import * as THREE from "three";
import fragment from "./shader/fragment.glsl";
import vertex from "./shader/vertex.glsl";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import kneelingmonster from "./assets/models/kneeling_winged_monster.glb";
import {
	AmbientLight,
	Color,
	DirectionalLight,
	Mesh,
	MeshStandardMaterial,
	Plane,
	PlaneGeometry,
	Vector3,
} from "three";
import "./extend.js";
import GUI from "lil-gui";
console.log(THREE.extendMaterial);
export default class Sketch {
	constructor(options) {
		this.scene = new THREE.Scene();

		this.container = options.dom;
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer = new THREE.WebGLRenderer({
			antialias: true,
		});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(this.width, this.height);
		this.renderer.setClearColor(0xeeeeee, 1);
		this.renderer.outputEncoding = THREE.sRGBEncoding;

		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFShadowMap;

		this.container.appendChild(this.renderer.domElement);

		this.camera = new THREE.PerspectiveCamera(
			70,
			window.innerWidth / window.innerHeight,
			0.001,
			1000
		);

		// var frustumSize = 10;
		// var aspect = window.innerWidth / window.innerHeight;
		// this.camera = new THREE.OrthographicCamera( frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, -1000, 1000 );
		this.camera.position.set(2, 2, 2);
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.time = 0;

		this.isPlaying = true;

		this.addObjects();
		this.resize();
		this.render();
		this.setupResize();
		this.addLights();
		this.settings();
	}

	addLights() {
		const light1 = new AmbientLight(0xffffff, 0.0);
		this.scene.add(light1);

		const light = new THREE.SpotLight(0xffffff, 1, 0, Math.PI / 3, 0.3);
		light.position.set(0, 2, 2);
		light.target.position.set(0, 0, 0);

		light.castShadow = true;
		light.shadow.camera.near = 0.1;
		light.shadow.camera.far = 9;
		light.shadow.bias = 0.0001;

		light.shadow.mapSize.width = 2048;
		light.shadow.mapSize.height = 2048;

		this.scene.add(light);
	}

	settings() {
		let that = this;
		this.settings = {
			progress: 0,
		};
		this.gui = new GUI();
		this.gui.add(this.settings, "progress", 0, 1, 0.01).onChange((val) => {
			//this.material.uniforms.progress.value=val;
			this.material2.uniforms.progress.value = val;
		});

		console.log(this.gui);
	}

	setupResize() {
		window.addEventListener("resize", this.resize.bind(this));
	}

	resize() {
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer.setSize(this.width, this.height);
		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();
	}

	addObjects() {
		let that = this;

		let floor = new Mesh(
			new PlaneGeometry(15, 15, 100, 100),
			new MeshStandardMaterial({ color: 0xcccccc })
		);
		floor.rotation.x = -Math.PI * 0.5;
		floor.position.y = -1.1;
		floor.castShadow = false;
		floor.receiveShadow = true;
		this.scene.add(floor);

		this.material = new THREE.ShaderMaterial({
			extensions: {
				derivatives: "#extension GL_OES_standard_derivatives : enable",
			},
			side: THREE.DoubleSide,
			uniforms: {
				time: { type: "f", value: 0 },
				resolution: { type: "v4", value: new THREE.Vector4() },
				uvRate1: {
					value: new THREE.Vector2(1, 1),
				},
			},
			wireframe: true,
			vertexShader: vertex,
			fragmentShader: fragment,
		});

		this.material2 = new MeshStandardMaterial({ color: 0xff0000 });

		this.material2 = THREE.extendMaterial(THREE.MeshStandardMaterial, {
			class: THREE.CustomMaterial, // In this case ShaderMaterial would be fine too, just for some features such as envMap this is required
			vertexHeader: `
        attribute float aRandom;
        attribute vec3 aCenter;
        uniform float time;
        uniform float progress;
        
        mat4 rotationMatrix(vec3 axis, float angle) {
          axis = normalize(axis);
          float s = sin(angle);
          float c = cos(angle);
          float oc = 1.0 - c;
          
          return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                      oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                      oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                      0.0,                                0.0,                                0.0,                                1.0);
      }
      
      vec3 rotate(vec3 v, vec3 axis, float angle) {
        mat4 m = rotationMatrix(axis, angle);
        return (m * vec4(v, 1.0)).xyz;
      }
        
        
        `,
			vertex: {
				transformEnd: `
           float prog = (position.y + 1.)/2.;
           float locprog = clamp(((1.0+sin(time*0.1))/2. - 0.8*prog)/0.2,0.,1.);
           transformed = transformed - aCenter;
           transformed += normal*aRandom*(locprog);
           transformed *= 1.0 - locprog;
         
           transformed += aCenter;
           transformed = rotate(transformed, vec3(0.0,1.0,0.0),aRandom*(locprog)*3.14*3.);
          `,
			},

  

			uniforms: {
				roughness: 0.75,
				time: {
					mixed: true, // Uniform will be passed to a derivative material (MeshDepthMaterial below)
					linked: true, // Similar as shared, but only for derivative materials, so wavingMaterial will have it's own, but share with it's shadow material
					value: 0,
				},
				progress: {
					mixed: true, // Uniform will be passed to a derivative material (MeshDepthMaterial below)
					linked: true, // Similar as shared, but only for derivative materials, so wavingMaterial will have it's own, but share with it's shadow material
					value: 0.0,
				},
			},
		});

		this.material2.uniforms.diffuse.value = new Color(0x00ff00);

		this.geometry = new THREE.IcosahedronGeometry(1, 16).toNonIndexed();
    this.geometry = new PlaneGeometry(1,1).toNonIndexed();
		this.geometry = new THREE.SphereGeometry(1, 32,32).toNonIndexed();
		console.log(this.geometry);

		let length = this.geometry.attributes.position.count;

		let randoms = new Float32Array(length);
		let centers = new Float32Array(length * 3);

		for (let i = 0; i < length; i += 3) {
			var r = Math.random();
			randoms[i] = r;
			randoms[i + 1] = r;
			randoms[i + 2] = r;

			let x = this.geometry.attributes.position.array[i * 3];
			let y = this.geometry.attributes.position.array[i * 3 + 1];
			let z = this.geometry.attributes.position.array[i * 3 + 2];

			let x1 = this.geometry.attributes.position.array[i * 3 + 3];
			let y1 = this.geometry.attributes.position.array[i * 3 + 4];
			let z1 = this.geometry.attributes.position.array[i * 3 + 5];

			let x2 = this.geometry.attributes.position.array[i * 3 + 6];
			let y2 = this.geometry.attributes.position.array[i * 3 + 7];
			let z2 = this.geometry.attributes.position.array[i * 3 + 8];

			let center = new Vector3(x, y, z)
				.add(new Vector3(x1, y1, z1))
				.add(new Vector3(x2, y2, z2))
				.divideScalar(3);

			centers.set([center.x, center.y, center.z], i * 3);
      centers.set([center.x, center.y, center.z], (i+1) * 3);
      centers.set([center.x, center.y, center.z], (i+2) * 3);
		}

		this.geometry.setAttribute(
			"aRandom",
			new THREE.BufferAttribute(randoms, 1)
		);

    this.geometry.setAttribute(
			"aCenter",
			new THREE.BufferAttribute(centers, 3)
		);

		this.plane = new THREE.Mesh(this.geometry, this.material2);
		this.plane.castShadow = this.plane.receiveShadow = true;
		this.scene.add(this.plane);

		this.plane.customDepthMaterial = THREE.extendMaterial(
			THREE.MeshDepthMaterial,
			{
				template: this.material2,
			}
		);
	}

	stop() {
		this.isPlaying = false;
	}

	play() {
		if (!this.isPlaying) {
			this.render();
			this.isPlaying = true;
		}
	}

	render() {
		if (!this.isPlaying) return;
		this.time += 0.01;
		this.material2.uniforms.time.value = this.time;
		this.material.uniforms.time.value = this.time;
		requestAnimationFrame(this.render.bind(this));
		this.renderer.render(this.scene, this.camera);
	}
}

new Sketch({
	dom: document.getElementById("container"),
});
