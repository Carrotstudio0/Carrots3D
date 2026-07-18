// ============================================
// Blockbench General 3D Primitives
// ============================================
// يضيف أشكال 3D أساسية: Sphere, Cylinder, Cone, Torus, Plane
// بتترجع Mesh حقيقي قابل للتحرير الكامل (vertices/edges/faces)
// بدل شكل جامد — عشان أدوات الـ Mesh (extrude, merge, إلخ)
// تشتغل عليه زي أي Mesh عادي في Blockbench.

import { OutlinerElement } from './abstract/outliner_element.js';
import { OutlinerNode } from './abstract/outliner_node.js';
import { Modes } from '../modes.js';
import Format from '../io/format.js';   
import Project from '../io/project.js'; 
import Undo from '../undo.js';       
import { guid } from '../utils/guid.ts'; // تعديل: جرب utils بالـ s و امتداد ts
import { Canvas } from '../preview/canvas.js';
import { Reusable } from '../preview/reusable.ts'; // تعديل: امتداد ts
import { TickUpdates } from '../preview/tick_updates.ts'; // تعديل: امتداد ts

// ملحوظة: guid, Reusable, TickUpdates متاحين كـ globals في وقت التشغيل
// (زي ما بيستخدمهم js/outliner/types/mesh.js من غير أي import) —
// عشان كده متعملهمش import هنا، ده كان بيكسر الـ build.

// ============================================
// المحوّل: THREE.Geometry -> Blockbench Mesh
// ============================================
// بياخد أي THREE.BufferGeometry (كرة، أسطوانة، ...) ويرجع Mesh
// عليه vertices/faces حقيقية قابلة للتعديل بأدوات Blockbench العادية.
function threeGeometryToMesh(geometry, options = {}) {
	const THREE = window.THREE;
	if (!THREE) return null;

	let name = options.name || 'Mesh';
	let origin = options.origin || [0, 0, 0];

	// نحتاج مثلثات غير مفهرسة عشان كل ضلع يكون بسيط (3 vertices لكل face)
	if (geometry.index) {
		geometry = geometry.toNonIndexed();
	}

	let position_attr = geometry.attributes.position;
	let uv_attr = geometry.attributes.uv;

	let texture_width = (typeof Project !== 'undefined' && Project.texture_width) || 16;
	let texture_height = (typeof Project !== 'undefined' && Project.texture_height) || 16;

	// data.vertices = {} (كائن فاضي بس truthy) عشان نمنع الـ constructor
	// من إنشاء المكعب الافتراضي بتاعه
	let mesh = new Mesh({
		name: name,
		vertices: {},
	});
	mesh.origin = origin.slice();

	// دمج النقاط المتطابقة في المكان عشان يبقى الشكل متصل (مش كل مثلث لوحده)
	let vertex_cache = new Map();
	function getVertexKey(x, y, z) {
		let rx = Math.round(x * 1000) / 1000;
		let ry = Math.round(y * 1000) / 1000;
		let rz = Math.round(z * 1000) / 1000;
		let cache_key = rx + ',' + ry + ',' + rz;
		if (vertex_cache.has(cache_key)) {
			return vertex_cache.get(cache_key);
		}
		let [vkey] = mesh.addVertices([rx, ry, rz]);
		vertex_cache.set(cache_key, vkey);
		return vkey;
	}

	let new_faces = [];
	for (let i = 0; i < position_attr.count; i += 3) {
		let tri_vkeys = [];
		let tri_uv = [];

		for (let j = 0; j < 3; j++) {
			let idx = i + j;
			let x = position_attr.getX(idx);
			let y = position_attr.getY(idx);
			let z = position_attr.getZ(idx);
			tri_vkeys.push(getVertexKey(x, y, z));

			if (uv_attr) {
				tri_uv.push([
					uv_attr.getX(idx) * texture_width,
					(1 - uv_attr.getY(idx)) * texture_height,
				]);
			}
		}

		// تجاهل المثلثات المنحطّة (لما 3 نقط بتقع على نفس المكان، بيحصل عند قطبين الكرة أحيانًا)
		if (tri_vkeys[0] === tri_vkeys[1] || tri_vkeys[1] === tri_vkeys[2] || tri_vkeys[0] === tri_vkeys[2]) {
			continue;
		}

		let face = new MeshFace(mesh, { vertices: tri_vkeys });
		if (uv_attr) {
			tri_vkeys.forEach((vkey, k) => {
				face.uv[vkey] = tri_uv[k];
			});
		}
		new_faces.push(face);
	}
	mesh.addFaces(...new_faces);

	return mesh;
}

// ============================================
// دوال مساعدة سريعة — بترجع Mesh حقيقي قابل للتحرير
// ============================================
// ملحوظة: الـ segments مخفّضة عن قبل عشان الشكل يفضل قابل للتحرير
// اليدوي بشكل معقول (كتر النقط بيصعّب التعديل اليدوي بعدين).

export function createSphere(options = {}) {
	const THREE = window.THREE;
	let geometry = new THREE.SphereGeometry(
		options.radius || 8,
		options.segments || 16,
		options.rings || 12
	);
	let mesh = threeGeometryToMesh(geometry, {
		name: options.name || 'Sphere',
		origin: options.origin || [0, 8, 0],
	});
	return mesh;
}

export function createCylinder(options = {}) {
	const THREE = window.THREE;
	let geometry = new THREE.CylinderGeometry(
		options.radius || 4,
		options.radius || 4,
		options.height || 16,
		options.segments || 16
	);
	let mesh = threeGeometryToMesh(geometry, {
		name: options.name || 'Cylinder',
		origin: options.origin || [0, 8, 0],
	});
	return mesh;
}

export function createCone(options = {}) {
	const THREE = window.THREE;
	let geometry = new THREE.ConeGeometry(
		options.radius || 6,
		options.height || 16,
		options.segments || 16
	);
	let mesh = threeGeometryToMesh(geometry, {
		name: options.name || 'Cone',
		origin: options.origin || [0, 8, 0],
	});
	return mesh;
}

export function createTorus(options = {}) {
	const THREE = window.THREE;
	let geometry = new THREE.TorusGeometry(
		options.radius || 8,
		(options.radius || 8) * 0.4,
		options.rings || 12,
		options.segments || 16
	);
	let mesh = threeGeometryToMesh(geometry, {
		name: options.name || 'Torus',
		origin: options.origin || [0, 8, 0],
	});
	return mesh;
}

export function createPlane(options = {}) {
	const THREE = window.THREE;
	let geometry = new THREE.PlaneGeometry(
		(options.radius || 8) * 2,
		(options.radius || 8) * 2,
		1,
		1
	);
	let mesh = threeGeometryToMesh(geometry, {
		name: options.name || 'Plane',
		origin: options.origin || [0, 0, 0],
	});
	return mesh;
}

// ============================================
// PrimitiveElement — متسيبة موجودة بس للتوافق الرجعي
// ============================================
// لو عندك مشاريع قديمة اتحفظت بـ type: 'primitive' قبل التحديث ده،
// الكلاس ده لازم يفضل موجود عشان outliner.js يقدر يفتحها.
// أي primitive جديد دلوقتي بيتعمل بـ Mesh حقيقي (فوق) مش بالكلاس ده.
export class PrimitiveElement extends OutlinerElement {
	constructor(data = {}, uuid) {
		super(data, uuid);

		this.type = 'primitive';
		this.shape = data.shape || 'sphere';
		this.name = data.name || 'Primitive';

		this.origin = data.origin || [0, 0, 0];
		this.rotation = data.rotation || [0, 0, 0];
		this.scale = data.scale || [1, 1, 1];

		this.radius = data.radius || 8;
		this.height = data.height || 16;
		this.segments = data.segments || 32;
		this.rings = data.rings || 32;

		this.color = data.color || '#ffffff';

		this.box_uv = data.box_uv !== undefined ? data.box_uv : false;
		this.autouv = data.autouv || 0;
		this.mirror_uv = data.mirror_uv || false;

		this.visibility = data.visibility !== undefined ? data.visibility : true;
		this.locked = data.locked || false;
		this.export = data.export !== undefined ? data.export : true;
		this.shade = data.shade !== undefined ? data.shade : true;

		this.mesh = null;
		this.outline = null;
	}

	getTypeBehavior(key) {
		const behaviors = {
			selectable: true,
			selected: this.selected,
			movable: true,
			rotatable: true,
			scalable: true,
			transformable: true,
			renamable: true,
			visibility: true,
			locked: true,
			export: true,
			mesh: true,
			uv: true,
			faces: false,
			vertices: false,
			unique_name: true,
			parent_types: ['root', 'group'],
			child_types: null,
			parent: true,
			use_absolute_position: false,
		};
		return behaviors[key] !== undefined ? behaviors[key] : (super.getTypeBehavior ? super.getTypeBehavior(key) : undefined);
	}

	getGeometry() {
		const THREE = window.THREE;
		if (!THREE) return null;

		switch (this.shape) {
			case 'sphere':
				return new THREE.SphereGeometry(this.radius, this.segments, this.rings);
			case 'cylinder':
				return new THREE.CylinderGeometry(this.radius, this.radius, this.height, this.segments);
			case 'cone':
				return new THREE.ConeGeometry(this.radius, this.height, this.segments);
			case 'torus':
				return new THREE.TorusGeometry(this.radius, this.radius * 0.4, this.segments, this.rings);
			case 'plane':
				return new THREE.PlaneGeometry(this.radius * 2, this.radius * 2);
			default:
				return new THREE.BoxGeometry(8, 8, 8);
		}
	}

	getMaterial() {
		const THREE = window.THREE;
		if (!THREE) return null;
		return new THREE.MeshStandardMaterial({
			color: new THREE.Color(this.color),
			roughness: 0.7,
			metalness: 0.1,
			flatShading: !this.shade,
		});
	}

	compile(undo) {
		return {
			uuid: this.uuid,
			type: this.type,
			shape: this.shape,
			name: this.name,
			origin: this.origin.slice(),
			rotation: this.rotation.slice(),
			scale: this.scale.slice(),
			radius: this.radius,
			height: this.height,
			segments: this.segments,
			rings: this.rings,
			color: this.color,
			box_uv: this.box_uv,
			autouv: this.autouv,
			mirror_uv: this.mirror_uv,
			visibility: this.visibility,
			locked: this.locked,
			export: this.export,
			shade: this.shade,
		};
	}

	extend(data) {
		if (super.extend) super.extend(data);
		if (data.shape !== undefined) this.shape = data.shape;
		if (data.origin !== undefined) this.origin = data.origin;
		if (data.rotation !== undefined) this.rotation = data.rotation;
		if (data.scale !== undefined) this.scale = data.scale;
		if (data.radius !== undefined) this.radius = data.radius;
		if (data.height !== undefined) this.height = data.height;
		if (data.segments !== undefined) this.segments = data.segments;
		if (data.rings !== undefined) this.rings = data.rings;
		if (data.color !== undefined) this.color = data.color;
		if (data.box_uv !== undefined) this.box_uv = data.box_uv;
		if (data.autouv !== undefined) this.autouv = data.autouv;
		if (data.mirror_uv !== undefined) this.mirror_uv = data.mirror_uv;
		if (data.visibility !== undefined) this.visibility = data.visibility;
		if (data.locked !== undefined) this.locked = data.locked;
		if (data.export !== undefined) this.export = data.export;
		if (data.shade !== undefined) this.shade = data.shade;
		return this;
	}

	duplicate() {
		let copy = new PrimitiveElement(this.compile());
		copy.uuid = guid();
		copy.name = this.name + '_copy';
		copy.parent = 'root';
		copy.init();
		return copy;
	}

	remove(undo) {
		if (undo !== false) {
			Undo.initEdit({ elements: [this] });
		}
		if (this.parent && this.parent !== 'root') {
			this.parent.children.remove(this);
		}
		if (Outliner.root.includes(this)) {
			Outliner.root.remove(this);
		}
		Project.elements.remove(this);
		if (this.mesh && this.preview_controller && this.preview_controller.remove) {
			this.preview_controller.remove(this);
		}
		if (undo !== false) {
			Undo.finishEdit('Delete primitive');
		}
		return this;
	}

	select(event, isRange) {
		if (event && event.shiftKey && isRange) {
			// range selection logic
		} else if (event && (event.shiftKey || Pressing.overrides.shift || event.ctrlOrCmd || Pressing.overrides.ctrl)) {
			if (this.selected) {
				this.unselect();
			} else {
				Project.selected_elements.safePush(this);
				this.selected = true;
			}
		} else {
			if (Project.selected_elements.length > 1 || !this.selected) {
				Project.selected_elements.forEach(el => el.selected = false);
				Project.selected_elements.empty();
				Project.selected_elements.safePush(this);
				this.selected = true;
			}
		}
		TickUpdates.selection = true;
		return this;
	}

	unselect() {
		Project.selected_elements.remove(this);
		this.selected = false;
		TickUpdates.selection = true;
	}

	addTo(group = 'root') {
		if (group === 'root') {
			Outliner.root.push(this);
			this.parent = 'root';
		} else if (group instanceof OutlinerNode) {
			group.children.push(this);
			this.parent = group;
		}
		Project.elements.push(this);
		this.init();
		return this;
	}

	init() {
		if (!this.uuid) this.uuid = guid();
		OutlinerNode.uuids[this.uuid] = this;
		if (!this.mesh && this.preview_controller) {
			this.preview_controller.setup(this);
		}
		return this;
	}

	matchesFilter(filter) {
		if (!filter) return true;
		filter = filter.toLowerCase();
		return this.name.toLowerCase().includes(filter) || this.shape.toLowerCase().includes(filter);
	}

	createUniqueName() {
		let baseName = this.name;
		let counter = 1;
		let uniqueName = baseName;
		while (Project.elements.find(e => e !== this && e.name === uniqueName)) {
			uniqueName = baseName + '_' + counter;
			counter++;
		}
		this.name = uniqueName;
	}
}

export class PrimitivePreviewController {
	constructor() {
		this.type = 'primitive';
	}

	setup(element) {
		const THREE = window.THREE;
		if (!THREE) return;

		let geometry = element.getGeometry();
		let material = element.getMaterial();

		let mesh = new THREE.Mesh(geometry, material);
		mesh.name = element.uuid;
		mesh.type = 'primitive';
		mesh.isElement = true;
		mesh.visible = element.visibility;
		mesh.rotation.order = Format.euler_order || 'XYZ';

		mesh.userData.element = element;
		element.mesh = mesh;

		let outlineGeometry = new THREE.WireframeGeometry(geometry);
		let outlineMaterial = new THREE.LineBasicMaterial({
			color: 0x00a8ff,
			linewidth: 2,
			depthTest: false,
			transparent: true,
			opacity: 0.8,
		});
		let outline = new THREE.LineSegments(outlineGeometry, outlineMaterial);
		outline.name = element.uuid + '_outline';
		outline.visible = false;
		outline.renderOrder = 999;
		mesh.add(outline);
		element.outline = outline;

		Project.nodes_3d[element.uuid] = mesh;

		this.updateTransform(element);

		return mesh;
	}

	remove(element) {
		let { mesh } = element;
		if (mesh && mesh.parent) {
			mesh.parent.remove(mesh);
		}
		if (mesh && mesh.geometry) {
			mesh.geometry.dispose();
		}
		if (mesh && mesh.material) {
			mesh.material.dispose();
		}
		if (element.outline) {
			if (element.outline.geometry) element.outline.geometry.dispose();
			if (element.outline.material) element.outline.material.dispose();
		}
		delete Project.nodes_3d[element.uuid];
		element.mesh = null;
		element.outline = null;
	}

	updateAll(element) {
		if (!element.mesh) this.setup(element);
		this.updateTransform(element);
		this.updateVisibility(element);
		this.updateGeometry(element);
		this.updateSelection(element);
	}

	updateTransform(element) {
		let mesh = element.mesh;
		if (!mesh) return;

		mesh.position.set(element.origin[0], element.origin[1], element.origin[2]);
		mesh.rotation.x = Math.degToRad(element.rotation[0]);
		mesh.rotation.y = Math.degToRad(element.rotation[1]);
		mesh.rotation.z = Math.degToRad(element.rotation[2]);
		mesh.scale.set(
			element.scale[0] || 1e-7,
			element.scale[1] || 1e-7,
			element.scale[2] || 1e-7
		);

		if (Format.bone_rig && element.parent instanceof OutlinerNode && element.parent.getTypeBehavior('parent')) {
			element.parent.mesh.add(mesh);
			if (element.parent.getTypeBehavior('use_absolute_position')) {
				mesh.position.x -= element.parent.origin[0];
				mesh.position.y -= element.parent.origin[1];
				mesh.position.z -= element.parent.origin[2];
			}
		} else if (mesh.parent !== Project.model_3d) {
			Project.model_3d.add(mesh);
		}

		mesh.updateMatrixWorld();
	}

	updateVisibility(element) {
		if (element.mesh) {
			element.mesh.visible = element.visibility;
		}
	}

	updateSelection(element) {
		let { mesh } = element;
		if (mesh && mesh.outline) {
			if (Modes.paint && settings.outlines_in_paint_mode && settings.outlines_in_paint_mode.value === false) {
				mesh.outline.visible = false;
			} else {
				mesh.outline.visible = element.selected;
			}
		}
	}

	updateGeometry(element) {
		if (!element.mesh) return;

		let oldGeometry = element.mesh.geometry;
		let newGeometry = element.getGeometry();

		element.mesh.geometry = newGeometry;
		element.mesh.material = element.getMaterial();

		if (element.outline) {
			element.outline.geometry.dispose();
			element.outline.geometry = new THREE.WireframeGeometry(newGeometry);
		}

		if (oldGeometry) oldGeometry.dispose();
	}

	viewportRectangleOverlap(element, { projectPoint, rect_start, rect_end }) {
		if (!element.mesh) return false;
		element.mesh.getWorldPosition(Reusable.vec2);
		return pointInRectangle(projectPoint(Reusable.vec2), rect_start, rect_end);
	}
}
