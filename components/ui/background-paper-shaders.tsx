/// <reference types="@react-three/fiber" />
"use client"

import { useRef, useMemo } from "react"
import { MeshGradient } from "@paper-design/shaders-react"
import { cn } from "@/lib/utils"

// ── WebGL Shader primitives (three.js) ───────────────────────────────────────
// These require a <Canvas> from @react-three/fiber as parent.

const vertexShader = `
  uniform float time;
  uniform float intensity;
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vPosition = position;
    vec3 pos = position;
    pos.y += sin(pos.x * 10.0 + time) * 0.1 * intensity;
    pos.x += cos(pos.y * 8.0 + time * 1.5) * 0.05 * intensity;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const fragmentShader = `
  uniform float time;
  uniform float intensity;
  uniform vec3 color1;
  uniform vec3 color2;
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vec2 uv = vUv;
    float noise = sin(uv.x * 20.0 + time) * cos(uv.y * 15.0 + time * 0.8);
    noise += sin(uv.x * 35.0 - time * 2.0) * cos(uv.y * 25.0 + time * 1.2) * 0.5;
    vec3 color = mix(color1, color2, noise * 0.5 + 0.5);
    color = mix(color, vec3(1.0), pow(abs(noise), 2.0) * intensity);
    float glow = 1.0 - length(uv - 0.5) * 2.0;
    glow = pow(glow, 2.0);
    gl_FragColor = vec4(color * glow, glow * 0.8);
  }
`

export function ShaderPlane({
  position,
  color1 = "#ff5722",
  color2 = "#ffffff",
}: {
  position: [number, number, number]
  color1?: string
  color2?: string
}) {
  // Dynamic import to avoid SSR issues with three.js
  const { useRef: useThreeRef, useMemo: useThreeMemo } = { useRef, useMemo }
  const THREE = require("three")
  const { useFrame } = require("@react-three/fiber")

  const mesh = useThreeRef<any>(null)
  const uniforms = useThreeMemo(
    () => ({
      time: { value: 0 },
      intensity: { value: 1.0 },
      color1: { value: new THREE.Color(color1) },
      color2: { value: new THREE.Color(color2) },
    }),
    [color1, color2],
  )

  useFrame((state: any) => {
    if (mesh.current) {
      uniforms.time.value = state.clock.elapsedTime
      uniforms.intensity.value = 1.0 + Math.sin(state.clock.elapsedTime * 2) * 0.3
    }
  })

  return (
    <mesh ref={mesh} position={position}>
      <planeGeometry args={[2, 2, 32, 32]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

export function EnergyRing({
  radius = 1,
  position = [0, 0, 0],
}: {
  radius?: number
  position?: [number, number, number]
}) {
  const THREE = require("three")
  const { useFrame } = require("@react-three/fiber")
  const mesh = useRef<any>(null)

  useFrame((state: any) => {
    if (mesh.current) {
      mesh.current.rotation.z = state.clock.elapsedTime
      mesh.current.material.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.3
    }
  })

  return (
    <mesh ref={mesh} position={position}>
      <ringGeometry args={[radius * 0.8, radius, 32]} />
      <meshBasicMaterial color="#ff5722" transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ── Auth background — MeshGradient (paper-design) ────────────────────────────

export function AuthBackground({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div className={cn("relative min-h-screen w-full overflow-hidden bg-black", className)}>
      {/* Animated mesh gradient */}
      <MeshGradient
        className="absolute inset-0 h-full w-full"
        colors={["#000000", "#0c0000", "#1c0000", "#7f1d1d"]}
        speed={0.6}
      />
      {/* Dark overlay to boost contrast for the glass card */}
      <div className="absolute inset-0 bg-black/30" />
      {/* Content */}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  )
}
