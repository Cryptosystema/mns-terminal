// Declare JSX intrinsic elements for Three.js / React Three Fiber
declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any
      group: any
      points: any
      line: any
      lineSegments: any
      cylinderGeometry: any
      sphereGeometry: any
      planeGeometry: any
      boxGeometry: any
      bufferGeometry: any
      bufferAttribute: any
      meshStandardMaterial: any
      meshBasicMaterial: any
      meshPhongMaterial: any
      lineBasicMaterial: any
      shaderMaterial: any
      pointsMaterial: any
      ambientLight: any
      directionalLight: any
      pointLight: any
      spotLight: any
      hemisphereLight: any
      gridHelper: any
      axesHelper: any
      primitive: any
      color: any
      fog: any
    }
  }
}

export {}


