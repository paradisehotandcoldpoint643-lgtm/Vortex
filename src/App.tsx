import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { HandTrackingProvider, useHandTracking } from './components/HandTrackingProvider';
import { VoxelScene } from './components/VoxelScene';
import { EditorUI } from './components/EditorUI';
import { Voxel } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle } from 'lucide-react';

const VoxelEditorInner = () => {
  const handTracking = useHandTracking();
  const [voxels, setVoxels] = useState<Voxel[]>([]);
  const [currentColor, setCurrentColor] = useState('#5FFFFF');
  const [previewVoxel, setPreviewVoxel] = useState<{ position: [number, number, number], color: string } | null>(null);
  const [showHelp, setShowHelp] = useState(true);

  const sceneRefs = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    raycaster: THREE.Raycaster;
  } | null>(null);

  const lastGestureRef = useRef<{ gesture: string; time: number }>({ gesture: 'none', time: 0 });

  const handleSceneReady = useCallback((scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) => {
    sceneRefs.current = {
      scene,
      camera,
      renderer,
      raycaster: new THREE.Raycaster()
    };
  }, []);

  // Tracking Logic Loop
  useEffect(() => {
    if (!handTracking?.isTracking || !sceneRefs.current) {
        setPreviewVoxel(null);
        return;
    }

    const { scene, camera, raycaster } = sceneRefs.current;
    
    // 1. Raycast to find target
    raycaster.setFromCamera(handTracking.pointer2D as any, camera);
    
    // Intersect floor (GridHelper doesn't work well for raycasting, we use a plane)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    const hasFloorIntersect = raycaster.ray.intersectPlane(plane, intersectPoint);

    // Intersect existing voxels
    const instancedMesh = scene.children.find(c => c instanceof THREE.InstancedMesh) as THREE.InstancedMesh;
    const intersects = raycaster.intersectObject(instancedMesh);

    let targetPos: [number, number, number] | null = null;
    let targetVoxelId: number | null = null;

    if (intersects.length > 0) {
      const intersect = intersects[0];
      const instanceId = intersect.instanceId!;
      targetVoxelId = instanceId;
      
      // Calculate normal-offset position for NEW voxel
      const normal = intersect.face?.normal.clone().applyMatrix4(new THREE.Matrix4().extractRotation(instancedMesh.matrixWorld)) || new THREE.Vector3(0, 1, 0);
      
      if (handTracking.gesture === 'pinch') {
        const p = intersect.point.clone().add(normal.multiplyScalar(0.1));
        targetPos = [Math.round(p.x), Math.round(p.y), Math.round(p.z)];
      } else {
        // Just highlight existing
        const m = new THREE.Matrix4();
        instancedMesh.getMatrixAt(instanceId, m);
        const p = new THREE.Vector3().setFromMatrixPosition(m);
        targetPos = [p.x, p.y, p.z];
      }

    } else if (hasFloorIntersect) {
      targetPos = [Math.round(intersectPoint.x), 0, Math.round(intersectPoint.z)];
    }

    if (targetPos) {
      setPreviewVoxel({ position: targetPos, color: currentColor });

      // Action Debouncing
      const now = Date.now();
      const timeSinceLastAction = now - lastGestureRef.current.time;

      if (handTracking.gesture === 'pinch' && timeSinceLastAction > 500) {
        // Add Voxel
        const id = Math.random().toString(36).substring(7);
        setVoxels(prev => [...prev, { id, position: targetPos!, color: currentColor }]);
        lastGestureRef.current = { gesture: 'pinch', time: now };
      } else if (handTracking.gesture === 'open' && targetVoxelId !== null && timeSinceLastAction > 200) {
        // Remove Voxel
        setVoxels(prev => prev.filter((_, i) => i !== targetVoxelId));
        lastGestureRef.current = { gesture: 'open', time: now };
      }
    } else {
      setPreviewVoxel(null);
    }
  }, [handTracking, currentColor]);

  const handleSave = () => {
    const data = JSON.stringify(voxels);
    localStorage.setItem('voxels_save', data);
    alert('Project saved to local storage!');
  };

  const handleLoad = () => {
    const data = localStorage.getItem('voxels_save');
    if (data) {
      setVoxels(JSON.parse(data));
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
      <VoxelScene 
        voxels={voxels} 
        previewVoxel={previewVoxel}
        onSceneReady={handleSceneReady} 
      />
      
      <EditorUI 
        currentGesture={handTracking?.gesture || 'none'}
        currentColor={currentColor}
        onColorChange={setCurrentColor}
        onClear={() => setVoxels([])}
        onSave={handleSave}
        onLoad={handleLoad}
        toggleHelp={() => setShowHelp(!showHelp)}
        isTracking={handTracking?.isTracking || false}
      />

      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
          >
            <div className="bg-black/80 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 max-w-md pointer-events-auto shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                   <HelpCircle size={18} className="text-black" />
                </div>
                Controls Guide
              </h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                   <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl">👌</div>
                   <div>
                      <h3 className="text-cyan-400 font-bold text-sm uppercase">Pinch Gesture</h3>
                      <p className="text-white/60 text-xs mt-1">Touch thumb and index finger to place a voxel at the cursor position.</p>
                   </div>
                </div>
                <div className="flex gap-4">
                   <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl">✋</div>
                   <div>
                      <h3 className="text-rose-400 font-bold text-sm uppercase">Open Hand</h3>
                      <p className="text-white/60 text-xs mt-1">Extend all fingers to delete the voxel you are currently pointing at.</p>
                   </div>
                </div>
                <div className="flex gap-4">
                   <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl">☝️</div>
                   <div>
                      <h3 className="text-cyan-400 font-bold text-sm uppercase">Point</h3>
                      <p className="text-white/60 text-xs mt-1">Use your index finger to move the cursor. Orbit the view with your mouse.</p>
                   </div>
                </div>
              </div>
              <button 
                onClick={() => setShowHelp(false)}
                className="w-full mt-8 bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 rounded-xl transition-colors shadow-lg shadow-cyan-500/20"
              >
                INITIALIZE INTERFACE
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <HandTrackingProvider>
      <VoxelEditorInner />
    </HandTrackingProvider>
  );
}
