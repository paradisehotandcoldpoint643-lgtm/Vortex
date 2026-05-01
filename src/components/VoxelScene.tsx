import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Voxel } from '../types';

interface VoxelSceneProps {
  voxels: Voxel[];
  previewVoxel: { position: [number, number, number], color: string } | null;
  onSceneReady: (scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) => void;
}

const VOXEL_SIZE = 1;
const MAX_VOXELS = 10000;

export const VoxelScene: React.FC<VoxelSceneProps> = ({ voxels, previewVoxel, onSceneReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const instancedMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const previewMeshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00ffff, 100);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff00ff, 100);
    pointLight2.position.set(-10, 10, -10);
    scene.add(pointLight2);

    // Invisible Floor for Raycasting
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.name = 'floor';
    scene.add(floor);

    // Grid Helper
    const gridHelper = new THREE.GridHelper(50, 50, 0x00ffff, 0x111111);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Instanced Mesh for Voxels
    const geometry = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
    const material = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const instancedMesh = new THREE.InstancedMesh(geometry, material, MAX_VOXELS);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instancedMesh);
    instancedMeshRef.current = instancedMesh;

    // Preview Mesh
    const previewGeometry = new THREE.BoxGeometry(VOXEL_SIZE * 1.05, VOXEL_SIZE * 1.05, VOXEL_SIZE * 1.05);
    const previewMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      transparent: true, 
      opacity: 0.3,
      wireframe: true 
    });
    const previewMesh = new THREE.Mesh(previewGeometry, previewMaterial);
    scene.add(previewMesh);
    previewMeshRef.current = previewMesh;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    onSceneReady(scene, camera, renderer);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  // Update InstancedMesh when voxels change
  useEffect(() => {
    if (!instancedMeshRef.current) return;

    const mesh = instancedMeshRef.current;
    const dummy = new THREE.Object3D();

    voxels.forEach((voxel, i) => {
      dummy.position.set(voxel.position[0], voxel.position[1], voxel.position[2]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new THREE.Color(voxel.color));
    });

    mesh.count = voxels.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [voxels]);

  // Update Preview Mesh
  useEffect(() => {
    if (!previewMeshRef.current) return;

    if (previewVoxel) {
      previewMeshRef.current.visible = true;
      previewMeshRef.current.position.set(
        previewVoxel.position[0],
        previewVoxel.position[1],
        previewVoxel.position[2]
      );
      (previewMeshRef.current.material as THREE.MeshBasicMaterial).color.set(previewVoxel.color);
    } else {
      previewMeshRef.current.visible = false;
    }
  }, [previewVoxel]);

  return <div ref={containerRef} className="w-full h-screen" id="three-container" />;
};
