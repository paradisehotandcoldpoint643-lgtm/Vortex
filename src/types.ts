export interface Voxel {
  id: string;
  position: [number, number, number];
  color: string;
}

export type HandGesture = 'pinch' | 'open' | 'pointing' | 'none';

export interface HandTrackingState {
  isTracking: boolean;
  landmarks: any[] | null;
  gesture: HandGesture;
  pointer2D: { x: number; y: number };
}
