// ============================================
// Blockbench General 3D Primitives
// ============================================
// يضيف أشكال 3D أساسية: Sphere, Cylinder, Cone, Torus, Plane

import { OutlinerElement } from './outliner.js';
import { Canvas } from '../preview/canvas.js';

// ============================================
// كلاس أساسي لكل الأشكال (يرث من OutlinerElement)
// ============================================
class PrimitiveElement extends OutlinerElement {
    constructor(data, uuid) {
        super(data, uuid);
        this.type = 'primitive';
        this.shape = data.shape || 'sphere';
        
        // خصائص مشتركة لكل الأشكال
        this.position = data.position || [0, 0, 0];
        this.rotation = data.rotation || [0, 0, 0];
        this.scale = data.scale || [1, 1, 1];
        
        // خصائص خاصة بالشكل
        this.radius = data.radius || 8;
        this.height = data.height || 16;
        this.segments = data.segments || 16;
        this.rings = data.rings || 16;
        
        // اللون/الماتيريال
        this.color = data.color || '#ffffff';
    }
    
    // إنشاء الـ Three.js Geometry حسب نوع الشكل
    getGeometry() {
        const THREE = window.THREE || require('three');
        
        switch(this.shape) {
            case 'sphere':
                return new THREE.SphereGeometry(
                    this.radius, 
                    this.segments, 
                    this.rings
                );
                
            case 'cylinder':
                return new THREE.CylinderGeometry(
                    this.radius,           // radiusTop
                    this.radius,           // radiusBottom
                    this.height,           // height
                    this.segments          // radialSegments
                );
                
            case 'cone':
                return new THREE.ConeGeometry(
                    this.radius,           // radius
                    this.height,           // height
                    this.segments          // radialSegments
                );
                
            case 'torus':
                return new THREE.TorusGeometry(
                    this.radius,           // radius
                    this.radius * 0.4,     // tube
                    this.segments,         // radialSegments
                    this.rings             // tubularSegments
                );
                
            case 'plane':
                return new THREE.PlaneGeometry(
                    this.radius * 2,       // width
                    this.radius * 2        // height
                );
                
            default:
                return new THREE.BoxGeometry(8, 8, 8);
        }
    }
    
    // إنشاء الـ Mesh للعرض في الـ Viewport
    buildMesh() {
        const THREE = window.THREE || require('three');
        
        const geometry = this.getGeometry();
        const material = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.7,
            metalness: 0.1
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...this.position);
        mesh.rotation.set(...this.rotation.map(r => r * Math.PI / 180));
        mesh.scale.set(...this.scale);
        
        // تخزين مرجع للعنصر الأصلي
        mesh.userData.element = this;
        
        return mesh;
    }
    
    // تحديث الـ Mesh بعد التعديل
    updateMesh() {
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.geometry = this.getGeometry();
            this.mesh.position.set(...this.position);
            this.mesh.rotation.set(...this.rotation.map(r => r * Math.PI / 180));
            this.mesh.scale.set(...this.scale);
        }
    }
    
    // التحويل لـ JSON للحفظ
    toJSON() {
        const result = super.toJSON();
        result.shape = this.shape;
        result.position = this.position;
        result.rotation = this.rotation;
        result.scale = this.scale;
        result.radius = this.radius;
        result.height = this.height;
        result.segments = this.segments;
        result.rings = this.rings;
        result.color = this.color;
        return result;
    }
    
    // استعادة من JSON
    static fromJSON(data) {
        return new PrimitiveElement(data);
    }
    
    // حدود المحتوى (Bounding Box) للتحديد
    getBoundingBox() {
        const r = this.radius;
        const h = this.height;
        
        switch(this.shape) {
            case 'sphere':
            case 'torus':
                return {
                    min: [-r, -r, -r],
                    max: [r, r, r]
                };
            case 'cylinder':
            case 'cone':
                return {
                    min: [-r, -h/2, -r],
                    max: [r, h/2, r]
                };
            case 'plane':
                return {
                    min: [-r, 0, -r],
                    max: [r, 0, r]
                };
            default:
                return { min: [-8, -8, -8], max: [8, 8, 8] };
        }
    }
}

// ============================================
// دوال مساعدة لإنشاء الأشكال بسرعة
// ============================================

function createSphere(options = {}) {
    return new PrimitiveElement({
        shape: 'sphere',
        radius: options.radius || 8,
        segments: options.segments || 32,
        rings: options.rings || 32,
        position: options.position || [0, 8, 0],
        color: options.color || '#e74c3c',
        ...options
    });
}

function createCylinder(options = {}) {
    return new PrimitiveElement({
        shape: 'cylinder',
        radius: options.radius || 4,
        height: options.height || 16,
        segments: options.segments || 32,
        position: options.position || [0, 8, 0],
        color: options.color || '#3498db',
        ...options
    });
}

function createCone(options = {}) {
    return new PrimitiveElement({
        shape: 'cone',
        radius: options.radius || 6,
        height: options.height || 16,
        segments: options.segments || 32,
        position: options.position || [0, 8, 0],
        color: options.color || '#f39c12',
        ...options
    });
}

function createTorus(options = {}) {
    return new PrimitiveElement({
        shape: 'torus',
        radius: options.radius || 8,
        segments: options.segments || 32,
        rings: options.rings || 32,
        position: options.position || [0, 8, 0],
        color: options.color || '#9b59b6',
        ...options
    });
}

function createPlane(options = {}) {
    return new PrimitiveElement({
        shape: 'plane',
        radius: options.radius || 8,
        position: options.position || [0, 0, 0],
        color: options.color || '#2ecc71',
        ...options
    });
}

// ============================================
// تسجيل النوع في Outliner
// ============================================

// نضيف النوع للـ OutlinerElement.types
if (typeof OutlinerElement !== 'undefined') {
    OutlinerElement.types.primitive = PrimitiveElement;
}

// ============================================
// Export للاستخدام في ملفات تانية
// ============================================

export {
    PrimitiveElement,
    createSphere,
    createCylinder,
    createCone,
    createTorus,
    createPlane
};
