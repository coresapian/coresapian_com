import * as THREE from 'https://esm.sh/three@0.175.0?target=es2020';

export const MAX_PULSES = 3; // Max concurrent pulses

export const COLOR_PALETTES = [
  [new THREE.Color(0x4F46E5), new THREE.Color(0x7C3AED), new THREE.Color(0xC026D3), new THREE.Color(0xDB2777), new THREE.Color(0x8B5CF6)], // Indigo/Purple/Pink
  [new THREE.Color(0xF59E0B), new THREE.Color(0xF97316), new THREE.Color(0xDC2626), new THREE.Color(0x7F1D1D), new THREE.Color(0xFBBF24)], // Amber/Orange/Red
  [new THREE.Color(0xEC4899), new THREE.Color(0x8B5CF6), new THREE.Color(0x6366F1), new THREE.Color(0x3B82F6), new THREE.Color(0xA855F7)], // Pink/Violet/Blue
  [new THREE.Color(0x10B981), new THREE.Color(0xA3E635), new THREE.Color(0xFACC15), new THREE.Color(0xFB923C), new THREE.Color(0x4ADE80)]  // Emerald/Lime/Yellow
];

export const THEMES = [
  { id: 'theme-1', name: 'Nebula', paletteIndex: 0, gradient: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500' },
  { id: 'theme-2', name: 'Inferno', paletteIndex: 1, gradient: 'bg-gradient-to-r from-amber-500 via-orange-600 to-red-700' },
  { id: 'theme-3', name: 'Synthwave', paletteIndex: 2, gradient: 'bg-gradient-to-r from-pink-500 via-violet-500 to-blue-500' },
  { id: 'theme-4', name: 'Aurora', paletteIndex: 3, gradient: 'bg-gradient-to-r from-emerald-500 via-lime-400 to-yellow-400' },
];

export const INITIAL_CONFIG = {
  paused: false,
  activePaletteIndex: 1, // Inferno default
  currentFormation: 0,
  numFormations: 4,
  densityFactor: 1.0,
};

export const NOISE_FUNCTIONS = `
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
      const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
      vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);
      vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);
      vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
      float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
      vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
      vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;
      vec4 sh=-step(h,vec4(0.0));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
      m*=m;return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
  float fbm(vec3 p,float time){
      float value=0.0;float amplitude=0.5;float frequency=1.0;int octaves=3;
      for(int i=0;i<octaves;i++){
          value+=amplitude*snoise(p*frequency+time*0.2*frequency);
          amplitude*=0.5;frequency*=2.0;
      }
      return value;
  }`;

export const NODE_SHADER = {
  vertexShader: `${NOISE_FUNCTIONS}
  attribute float nodeSize;attribute float nodeType;attribute vec3 nodeColor;attribute vec3 connectionIndices;attribute float distanceFromRoot;
  uniform float uTime;uniform vec3 uPulsePositions[${MAX_PULSES}];uniform float uPulseTimes[${MAX_PULSES}];uniform float uPulseSpeed;uniform float uBaseNodeSize;
  varying vec3 vColor;varying float vNodeType;varying vec3 vPosition;varying float vPulseIntensity;varying float vDistanceFromRoot;

  float getPulseIntensity(vec3 worldPos, vec3 pulsePos, float pulseTime) {
      if (pulseTime < 0.0) return 0.0;
      float timeSinceClick = uTime - pulseTime;
      if (timeSinceClick < 0.0 || timeSinceClick > 3.0) return 0.0;

      float pulseRadius = timeSinceClick * uPulseSpeed;
      float distToClick = distance(worldPos, pulsePos);
      float pulseThickness = 2.0; // Defines how "thick" the pulse wave is
      float waveProximity = abs(distToClick - pulseRadius);

      // Intensity is highest at the wave front, fades with distance from front and over time
      return smoothstep(pulseThickness, 0.0, waveProximity) * smoothstep(3.0, 0.0, timeSinceClick);
  }

  void main() {
      vNodeType = nodeType;
      vColor = nodeColor;
      vDistanceFromRoot = distanceFromRoot;

      vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      vPosition = worldPos; // Used for camera distance fade in frag

      float totalPulseIntensity = 0.0;
      for (int i = 0; i < ${MAX_PULSES}; i++) {
          totalPulseIntensity += getPulseIntensity(worldPos, uPulsePositions[i], uPulseTimes[i]);
      }
      vPulseIntensity = min(totalPulseIntensity, 1.0); // Clamp total intensity

      // Base size animation
      float timeScale = 0.5 + 0.5 * sin(uTime * 0.8 + distanceFromRoot * 0.2);
      float baseSize = nodeSize * (0.8 + 0.2 * timeScale);
      float pulseSize = baseSize * (1.0 + vPulseIntensity * 2.0); // Pulse makes nodes bigger

      vec3 modifiedPosition = position;
      if (nodeType > 0.5) { // Special nodes (e.g., leaf nodes) might have subtle movement
          float noise = fbm(position * 0.1, uTime * 0.1);
          modifiedPosition += normal * noise * 0.2; // Assuming 'normal' attribute exists or is derived
      }

      vec4 mvPosition = modelViewMatrix * vec4(modifiedPosition, 1.0);
      gl_PointSize = pulseSize * uBaseNodeSize * (800.0 / -mvPosition.z); // Perspective scaling
      gl_Position = projectionMatrix * mvPosition;
  }`,

  fragmentShader: `
  uniform float uTime; uniform vec3 uPulseColors[${MAX_PULSES}]; uniform int uActivePalette;
  varying vec3 vColor;varying float vNodeType;varying vec3 vPosition;varying float vPulseIntensity;varying float vDistanceFromRoot;

  void main() {
      vec2 center = 2.0 * gl_PointCoord - 1.0; // Point coordinates from -1 to 1
      float dist = length(center);
      if (dist > 1.0) discard; // Discard pixels outside circle

      // Create a soft glow effect for the node
      float glowStrength = 1.0 - smoothstep(0.0, 1.0, dist);
      glowStrength = pow(glowStrength, 1.4); // Adjust power for falloff

      // Base color with subtle animation
      vec3 baseColor = vColor * (0.8 + 0.2 * sin(uTime * 0.5 + vDistanceFromRoot * 0.3));
      vec3 finalColor = baseColor;

      // Apply pulse effect
      if (vPulseIntensity > 0.0) {
          // For simplicity, using the color of the first active pulse. Could be averaged or mixed.
          vec3 pulseColor = mix(vec3(1.0), uPulseColors[0], 0.3); // Mix white with a palette color
          finalColor = mix(baseColor, pulseColor, vPulseIntensity);
          finalColor *= (1.0 + vPulseIntensity * 0.7); // Brighten during pulse
      }

      float alpha = glowStrength * (0.9 - 0.5 * dist); // Alpha based on glow and distance from center

      // Fade nodes based on distance from camera
      float camDistance = length(vPosition - cameraPosition);
      float distanceFade = smoothstep(80.0, 10.0, camDistance); // Fade out far, fade in near

      if (vNodeType > 0.5) { // Special nodes might be slightly more transparent
          alpha *= 0.85;
      } else { // Regular nodes slightly brighter
          finalColor *= 1.2;
      }
      
      gl_FragColor = vec4(finalColor, alpha * distanceFade);
  }`
};

export const CONNECTION_SHADER = {
  vertexShader: `${NOISE_FUNCTIONS}
  attribute vec3 startPoint; attribute vec3 endPoint; attribute float connectionStrength; attribute float pathIndex; attribute vec3 connectionColor;
  uniform float uTime; uniform vec3 uPulsePositions[${MAX_PULSES}]; uniform float uPulseTimes[${MAX_PULSES}]; uniform float uPulseSpeed;
  varying vec3 vColor; varying float vConnectionStrength; varying float vPulseIntensity; varying float vPathPosition;

  float getPulseIntensity(vec3 worldPos, vec3 pulsePos, float pulseTime) {
      if (pulseTime < 0.0) return 0.0;
      float timeSinceClick = uTime - pulseTime;
      if (timeSinceClick < 0.0 || timeSinceClick > 3.0) return 0.0;
      float pulseRadius = timeSinceClick * uPulseSpeed;
      float distToClick = distance(worldPos, pulsePos);
      float pulseThickness = 2.0;
      float waveProximity = abs(distToClick - pulseRadius);
      return smoothstep(pulseThickness, 0.0, waveProximity) * smoothstep(3.0, 0.0, timeSinceClick);
  }

  void main() {
      float t = position.x; // position.x is 0 or 1 for LineSegments, or 0-1 for custom segmented lines
      vPathPosition = t;

      // Slight curve for connections
      vec3 midPoint = mix(startPoint, endPoint, 0.5);
      float pathOffset = sin(t * 3.14159) * 0.1 * distance(startPoint, endPoint) * 0.1; // Offset proportional to length
      vec3 perpendicular = normalize(cross(normalize(endPoint - startPoint), vec3(0.0, 1.0, 0.0))); // Default up vector
      if (length(perpendicular) < 0.1) perpendicular = normalize(cross(normalize(endPoint - startPoint), vec3(1.0, 0.0, 0.0))); // Alternative if aligned with Y
      if (length(perpendicular) < 0.1) perpendicular = vec3(1.0,0.0,0.0); // Fallback

      midPoint += perpendicular * pathOffset * (mod(pathIndex, 2.0) * 2.0 - 1.0); // Vary curve direction

      vec3 p0 = mix(startPoint, midPoint, t);
      vec3 p1 = mix(midPoint, endPoint, t);
      vec3 finalPos = mix(p0, p1, t); // Quadratic Bezier interpolation

      // Add subtle noise wobble to connections
      float noiseTime = uTime * 0.2;
      float noise = fbm(vec3(pathIndex * 0.1, t * 0.5, noiseTime), noiseTime); // pathIndex for variation
      finalPos += perpendicular * noise * 0.1 * connectionStrength;


      vec3 worldPos = (modelMatrix * vec4(finalPos, 1.0)).xyz;
      float totalPulseIntensity = 0.0;
      for (int i = 0; i < ${MAX_PULSES}; i++) {
          totalPulseIntensity += getPulseIntensity(worldPos, uPulsePositions[i], uPulseTimes[i]);
      }
      vPulseIntensity = min(totalPulseIntensity, 1.0);

      vColor = connectionColor;
      vConnectionStrength = connectionStrength;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
  }`,

  fragmentShader: `
  uniform float uTime; uniform vec3 uPulseColors[${MAX_PULSES}];
  varying vec3 vColor; varying float vConnectionStrength; varying float vPulseIntensity; varying float vPathPosition;

  void main() {
      // Base color with subtle animation based on path position
      vec3 baseColor = vColor * (0.7 + 0.3 * sin(uTime * 0.5 + vPathPosition * 10.0));

      // Animated flow pattern along the connection
      float flowPattern = sin(vPathPosition * 20.0 - uTime * 3.0) * 0.5 + 0.5; // Creates moving bands
      float flowIntensity = 0.3 * flowPattern * vConnectionStrength;

      vec3 finalColor = baseColor;

      if (vPulseIntensity > 0.0) {
          vec3 pulseColor = mix(vec3(1.0), uPulseColors[0], 0.3); // Mix white with a palette color
          finalColor = mix(baseColor, pulseColor, vPulseIntensity);
          flowIntensity += vPulseIntensity * 0.5; // Pulse enhances flow visibility
      }

      finalColor *= (0.6 + flowIntensity + vConnectionStrength * 0.4); // Modulate brightness

      // Alpha depends on strength, flow, and pulse
      float alpha = 0.8 * vConnectionStrength + 0.2 * flowPattern;
      alpha = mix(alpha, min(1.0, alpha * 2.0), vPulseIntensity); // Pulse makes connections more opaque

      gl_FragColor = vec4(finalColor, alpha);
  }`
};
