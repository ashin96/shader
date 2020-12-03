// import { OrbitControls } from '../node_modules/three/examples/jsm/controls/OrbitControls.js'
import Stats from '../node_modules/stats.js/src/Stats.js'
var APP = {

	Player: function () {

		var renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.outputEncoding = THREE.sRGBEncoding;

		var loader = new THREE.ObjectLoader();
		var camera, scene, light, controls, labelRenderer;

		var stats = new Stats();
		stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom

		var clock = new THREE.Clock();

		var vrButton = VRButton.createButton(renderer);

		var events = {};

		var dom = document.createElement('div');
		dom.appendChild(renderer.domElement);
		dom.appendChild(stats.dom);

		this.dom = dom;



		this.width = 500;
		this.height = 500;

		this.load = function (json) {

			var project = json.project;

			if (project.vr !== undefined) renderer.xr.enabled = project.vr;
			if (project.shadows !== undefined) renderer.shadowMap.enabled = project.shadows;
			if (project.shadowType !== undefined) renderer.shadowMap.type = project.shadowType;
			if (project.toneMapping !== undefined) renderer.toneMapping = project.toneMapping;
			if (project.toneMappingExposure !== undefined) renderer.toneMappingExposure = project.toneMappingExposure;
			if (project.physicallyCorrectLights !== undefined) renderer.physicallyCorrectLights = project.physicallyCorrectLights;

			this.setScene(loader.parse(json.scene));
			this.setCamera(loader.parse(json.camera));

			events = {
				init: [],
				start: [],
				stop: [],
				keydown: [],
				keyup: [],
				mousedown: [],
				mouseup: [],
				mousemove: [],
				touchstart: [],
				touchend: [],
				touchmove: [],
				update: []
			};

			var scriptWrapParams = 'player,renderer,scene,camera';
			var scriptWrapResultObj = {};

			for (var eventKey in events) {

				scriptWrapParams += ',' + eventKey;
				scriptWrapResultObj[eventKey] = eventKey;

			}

			var scriptWrapResult = JSON.stringify(scriptWrapResultObj).replace(/\"/g, '');

			for (var uuid in json.scripts) {

				var object = scene.getObjectByProperty('uuid', uuid, true);

				if (object === undefined) {

					console.warn('APP.Player: Script without object.', uuid);
					continue;

				}

				var scripts = json.scripts[uuid];

				for (var i = 0; i < scripts.length; i++) {

					var script = scripts[i];

					var functions = (new Function(scriptWrapParams, script.source + '\nreturn ' + scriptWrapResult + ';').bind(object))(this, renderer, scene, camera);

					for (var name in functions) {

						if (functions[name] === undefined) continue;

						if (events[name] === undefined) {

							console.warn('APP.Player: Event type not supported (', name, ')');
							continue;

						}

						events[name].push(functions[name].bind(object));

					}

				}

			}

			dispatch(events.init, arguments);

		};
		this.setCSS2DRender = function (value, dom) {
			labelRenderer = value
			labelRenderer.setSize(this.width, this.height);
			labelRenderer.domElement.style.position = 'absolute';
			labelRenderer.domElement.style.top = '0px';
			labelRenderer.domElement.className = 'label_box';
			dom.appendChild(labelRenderer.domElement);
		}

		this.setCamera = function (value) {

			camera = value;
			this.camera = camera
			camera.aspect = this.width / this.height;
			camera.updateProjectionMatrix();

		};
		this.setControls = function (value) {

			controls = value;
			this.controls = controls
			controls.update();

		};

		this.setScene = function (value) {

			scene = value;
			this.scene = scene

		};
		this.setLight = function (value) {

			light = value;
			scene.add(light)
			// this.light = light

		};
		this.setAxesHelper = function (value) {

			var axes = new THREE.AxesHelper(value)
			scene.add(axes)

		};

		this.setSize = function (width, height) {

			this.width = width;
			this.height = height;

			if (camera) {

				camera.aspect = this.width / this.height;
				camera.updateProjectionMatrix();

			}

			if (renderer) {

				renderer.setSize(width, height);

			}

		};

		function dispatch(array, event) {

			for (var i = 0, l = array.length; i < l; i++) {

				array[i](event);

			}

		}

		var time, prevTime;

		function animate() {

			// time = performance.now();
			var delta = clock.getDelta(); // 获取本次和上次的时间间隔
			stats.begin();
			// try {

			// 	dispatch( events.update, { time: time, delta: time - prevTime } );

			// } catch ( e ) {

			// 	console.error( ( e.message || e ), ( e.stack || "" ) );

			// }
			// console.time('forEach')

			let ocean = scene.getObjectByName('ocean')
			if (ocean) {
				ocean.material.uniforms.iTime.value += delta
			}

			let linesGroup = scene.getObjectByName('linesGroup')
			if (linesGroup) {

				linesGroup.children.forEach((line) => {
					if (line && line.material.uniforms) {
						let time = line.material.uniforms.time.value;
						let buffer = line.material.uniforms.buffer.value;
						let speed = line.material.uniforms.speed.value;
						let move = line.material.uniforms.move.value;
						let blink = line.material.uniforms.blink.value;
						if (time * speed > line.maxx + buffer) {

							line.material.uniforms.time.value = 0.0;
						}
						if(move ||blink ){
							line.material.uniforms.time.value += speed;
						}else{
							line.material.uniforms.time.value = (line.maxx + buffer)/speed
						}
					}
				})

				// for (var i = 0; i < linegroup.length; i++) {
				// 	var flyline = linegroup[i];
				// 	if (flyline && flyline.material.uniforms) {
				// 		var time = flyline.material.uniforms.time.value;
				// 		var size = flyline.material.uniforms.size.value;
				// 		if (time > flyline.maxx) {
				// 			flyline.material.uniforms.time.value = flyline.minx - size;
				// 		}
				// 		flyline.material.uniforms.time.value += 1.0;
				// 	}
				// }
			}
			// console.timeEnd('forEach')
			if (controls) controls.update();
			// console.time('render')
			renderer.render(scene, camera);
			TWEEN.update();
			// console.timeEnd('render')
			if (labelRenderer) labelRenderer.render(scene, camera)
			// prevTime = time;
			stats.end();

		}

		this.play = function () {

			// if ( renderer.xr.enabled ) dom.append( vrButton );

			// prevTime = performance.now();

			// document.addEventListener( 'keydown', onDocumentKeyDown );
			// document.addEventListener( 'keyup', onDocumentKeyUp );
			// document.addEventListener( 'mousedown', onDocumentMouseDown );
			// document.addEventListener( 'mouseup', onDocumentMouseUp );
			// document.addEventListener( 'mousemove', onDocumentMouseMove );
			// document.addEventListener( 'touchstart', onDocumentTouchStart );
			// document.addEventListener( 'touchend', onDocumentTouchEnd );
			// document.addEventListener( 'touchmove', onDocumentTouchMove );

			// dispatch( events.start, arguments );
			renderer.setAnimationLoop(animate);

		};

		this.stop = function () {

			if (renderer.xr.enabled) vrButton.remove();

			document.removeEventListener('keydown', onDocumentKeyDown);
			document.removeEventListener('keyup', onDocumentKeyUp);
			document.removeEventListener('mousedown', onDocumentMouseDown);
			document.removeEventListener('mouseup', onDocumentMouseUp);
			document.removeEventListener('mousemove', onDocumentMouseMove);
			document.removeEventListener('touchstart', onDocumentTouchStart);
			document.removeEventListener('touchend', onDocumentTouchEnd);
			document.removeEventListener('touchmove', onDocumentTouchMove);

			dispatch(events.stop, arguments);

			renderer.setAnimationLoop(null);

		};

		this.dispose = function () {

			renderer.dispose();

			camera = undefined;
			scene = undefined;

		};

		//

		function onDocumentKeyDown(event) {

			dispatch(events.keydown, event);

		}

		function onDocumentKeyUp(event) {

			dispatch(events.keyup, event);

		}

		function onDocumentMouseDown(event) {

			dispatch(events.mousedown, event);

		}

		function onDocumentMouseUp(event) {

			dispatch(events.mouseup, event);

		}

		function onDocumentMouseMove(event) {

			dispatch(events.mousemove, event);

		}

		function onDocumentTouchStart(event) {

			dispatch(events.touchstart, event);

		}

		function onDocumentTouchEnd(event) {

			dispatch(events.touchend, event);

		}

		function onDocumentTouchMove(event) {

			dispatch(events.touchmove, event);

		}

	}

};

export { APP };
