interface LightingProps {
  color: string
}

export function Lighting({ color }: LightingProps) {
  return (
    <>
      <ambientLight intensity={0.05} color="#000d1a" />
      <pointLight position={[0, 20, 10]} intensity={0.3} color={color} />
      <pointLight position={[0, 5, 0]} intensity={0.15} color={color} />
    </>
  )
}
