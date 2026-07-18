// ============================================
// Blockbench General 3D Primitives
// ============================================
// يضيف أشكال 3D أساسية: Sphere, Cylinder, Cone, Torus, Plane

import { OutlinerElement } from './abstract/outliner_element.js';
import { OutlinerNode } from './abstract/outliner_node.js';
import { Modes } from '../modes.js';
import { Format } from '../io/format.js';
import { Project } from '../io/project.js';
import { Undo } from '../undo.js';
import { guid } from '../util/guid.js';
import { Canvas } from '../preview/canvas.js';
import { Reusable } from '../preview/reusable.js';
import { TickUpdates } from '../preview/tick_updates.js';

// ============================================
// كلاس PrimitiveElement (يرث من OutlinerElement)
// ============================================
export class PrimitiveElement extends OutlinerElement {
	constructor(data = {}, uuid) {
		super(data, uuid);
		
		this.type = 'primitive';
		this.shape = data.shape || 'sphere';
		this.name = data.name || 'Primitive';
		
		// خصائص الموقف والتحويل
		this.origin = data.origin || [0, 0, 0];
		this.rotation = data.rotation || [0, 0, 0];
		this.scale = data.scale || [1, 1, 1];
		
		// خصائص الشكل الهندسي
		this.radius = data.radius || 8;
		this.height = data.height || 16;
		this.segments = data.segments || 32;
		this.rings = data.rings || 32;
		
		// اللون
		this.color = data.color || '#ffffff';
		
		// خصائص الـ UV
		this.box_uv = data.box_uv !== undefined ? data.box_uv : false;
		this.autouv = data.autouv || 0;
		this.mirror_uv = data.mirror_uv || false;
		
		// الظهور
		this.visibility = data.visibility !== undefined ? data.visibility : true;
		this.locked = data.locked || false;
		this.export = data.export !== undefined ? data.export : true;
		this.shade = data.shade !== undefined ? data.shade : true;
		
		// خصائص الـ Mesh
		this.mesh = null;
		this.outline = null;
	}
	
	// نوع السلوك
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
	
	// إنشاء الـ Three.js Geometry
	getGeometry() {
		const THREE = window.THREE;
		if (!THREE) return null;
		
		switch(this.shape) {
			case 'sphere':
				return new THREE.SphereGeometry(
					this.radius, 
					this.segments, 
					this.rings
				);
				
			case 'cylinder':
				return new THREE.CylinderGeometry(
					this.radius,
					this.radius,
					this.height,
					this.segments
				);
				
			case 'cone':
				return new THREE.ConeGeometry(
					this.radius,
					this.height,
					this.segments
				);
				
			case 'torus':
				return new THREE.TorusGeometry(
					this.radius,
					this.radius * 0.4,
					this.segments,
					this.rings
				);
				
			case 'plane':
				return new THREE.PlaneGeometry(
					this.radius * 2,
					this.radius * 2
				);
				
			default:
				return new THREE.BoxGeometry(8, 8, 8);
		}
	}
	
	// إنشاء الـ Material
	getMaterial() {
		const THREE = window.THREE;
		if (!THREE) return null;
		
		return new THREE.MeshStandardMaterial({
			color: new THREE.Color(this.color),
			roughness: 0.7,
			metalness: 0.1,
			flatShading: !this.shade
		});
	}
	
	// التحويل لـ JSON للحفظ
	compile(undo) {
		let result = {
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
			shade: this.shade
		};
		return result;
	}
	
	// استعادة من JSON
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
	
	// نسخ
	duplicate() {
		let copy = new PrimitiveElement(this.compile());
		copy.uuid = guid();
		copy.name = this.name + '_copy';
		copy.parent = 'root';
		copy.init();
		return copy;
	}
	
	// حذف
	remove(undo) {
		if (undo !== false) {
			Undo.initEdit({elements: [this]});
		}
		if (this.parent && this.parent !== 'root') {
			this.parent.children.remove(this);
		}
		if (Outliner.root.includes(this)) {
			Outliner.root.remove(this);
		}
		Project.elements.remove(this);
		
		if (this.mesh) {
			if (this.preview_controller && this.preview_controller.remove) {
				this.preview_controller.remove(this);
			}
		}
		
		if (undo !== false) {
			Undo.finishEdit('Delete primitive');
		}
		return this;
	}
	
	// التحديد
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
	
	// إضافة للمشروع
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
	
	// التهيئة
	init() {
		if (!this.uuid) this.uuid = guid();
		OutlinerNode.uuids[this.uuid] = this;
		
		// إنشاء الـ mesh لو مش موجود
		if (!this.mesh && this.preview_controller) {
			this.preview_controller.setup(this);
		}
		
		return this;
	}
	
	// التحقق من الفلتر
	matchesFilter(filter) {
		if (!filter) return true;
		filter = filter.toLowerCase();
		return this.name.toLowerCase().includes(filter) || 
		       this.shape.toLowerCase().includes(filter);
	}
	
	// إنشاء اسم فريد
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

// ============================================
// Preview Controller للـ Primitives
// ============================================
export class PrimitivePreviewController {
	constructor() {
		this.type = 'primitive';
	}
	
	setup(element) {
		const THREE = window.THREE;
		if (!THREE) return;
		
		// إنشاء الـ Mesh
		let geometry = element.getGeometry();
		let material = element.getMaterial();
		
		let mesh = new THREE.Mesh(geometry, material);
		mesh.name = element.uuid;
		mesh.type = 'primitive';
		mesh.isElement = true;
		mesh.visible = element.visibility;
		mesh.rotation.order = Format.euler_order || 'XYZ';
		
		// تخزين مرجع للعنصر
		mesh.userData.element = element;
		element.mesh = mesh;
		
		// إنشاء الـ Outline للتحديد
		let outlineGeometry = new THREE.WireframeGeometry(geometry);
		let outlineMaterial = new THREE.LineBasicMaterial({ 
			color: 0x00a8ff, 
			linewidth: 2,
			depthTest: false,
			transparent: true,
			opacity: 0.8
		});
		let outline = new THREE.LineSegments(outlineGeometry, outlineMaterial);
		outline.name = element.uuid + '_outline';
		outline.visible = false;
		outline.renderOrder = 999;
		mesh.add(outline);
		element.outline = outline;
		
		// إضافة للمشهد
		Project.nodes_3d[element.uuid] = mesh;
		
		// تحديث التحويل
		this.updateTransform(element);
		
		return mesh;
	}
	
	remove(element) {
		let {mesh} = element;
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
		
		// إضافة للـ Parent المناسب
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
		let {mesh} = element;
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
		
		// تحديث الـ Geometry
		let oldGeometry = element.mesh.geometry;
		let newGeometry = element.getGeometry();
		
		element.mesh.geometry = newGeometry;
		element.mesh.material = element.getMaterial();
		
		// تحديث الـ Outline
		if (element.outline) {
			element.outline.geometry.dispose();
			element.outline.geometry = new THREE.WireframeGeometry(newGeometry);
		}
		
		if (oldGeometry) oldGeometry.dispose();
	}
	
	viewportRectangleOverlap(element, {projectPoint, rect_start, rect_end}) {
		if (!element.mesh) return false;
		element.mesh.getWorldPosition(Reusable.vec2);
		return pointInRectangle(projectPoint(Reusable.vec2), rect_start, rect_end);
	}
}

// ============================================
// دوال مساعدة سريعة
// ============================================

export function createSphere(options = {}) {
	return new PrimitiveElement({
		shape: 'sphere',
		radius: options.radius || 8,
		segments: options.segments || 32,
		rings: options.rings || 32,
		origin: options.origin || [0, 8, 0],
		color: options.color || '#e74c3c',
		name: options.name || 'Sphere'
	}).init();
}

export function createCylinder(options = {}) {
	return new PrimitiveElement({
		shape: 'cylinder',
		radius: options.radius || 4,
		height: options.height || 16,
		segments: options.segments || 32,
		origin: options.origin || [0, 8, 0],
		color: options.color || '#3498db',
		name: options.name || 'Cylinder'
	}).init();
}

export function createCone(options = {}) {
	return new PrimitiveElement({
		shape: 'cone',
		radius: options.radius || 6,
		height: options.height || 16,
		segments: options.segments || 32,
		origin: options.origin || [0, 8, 0],
		color: options.color || '#f39c12',
		name: options.name || 'Cone'
	}).init();
}

export function createTorus(options = {}) {
	return new PrimitiveElement({
		shape: 'torus',
		radius: options.radius || 8,
		segments: options.segments || 32,
		rings: options.rings || 32,
		origin: options.origin || [0, 8, 0],
		color: options.color || '#9b59b6',
		name: options.name || 'Torus'
	}).init();
}

export function createPlane(options = {}) {
	return new PrimitiveElement({
		shape: 'plane',
		radius: options.radius || 8,
		origin: options.origin || [0, 0, 0],
		color: options.color || '#2ecc71',
		name: options.name || 'Plane'
	}).init();
}
