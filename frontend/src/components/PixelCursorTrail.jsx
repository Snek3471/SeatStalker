import { useEffect, useRef, useState, useCallback } from 'react'

const COLORS = ['#ffffff', '#e0e0e0', '#c0c0c0', '#909090', '#707070']
const PIXEL_SIZE = 12
const TRAIL_LENGTH = 40
const FADE_SPEED = 0.04

function createPixel(id, x, y) {
  return {
    id,
    x,
    y,
    opacity: 1,
    age: 0,
    color: COLORS[id % COLORS.length],
  }
}

function PixelCursorTrail() {
  const [pixels, setPixels] = useState([])
  const [cursorPosition, setCursorPosition] = useState({ x: -100, y: -100 })
  const pixelIdRef = useRef(0)
  const lastPositionRef = useRef({ x: -100, y: -100 })
  const animationRef = useRef(null)

  const handleMouseMove = useCallback((event) => {
    const x = event.clientX
    const y = event.clientY
    setCursorPosition({ x, y })

    const dx = x - lastPositionRef.current.x
    const dy = y - lastPositionRef.current.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > PIXEL_SIZE) {
      const nextPixel = createPixel(pixelIdRef.current, x, y)
      pixelIdRef.current += 1
      setPixels((prev) => [...prev.slice(-TRAIL_LENGTH), nextPixel])
      lastPositionRef.current = { x, y }
    }
  }, [])

  useEffect(() => {
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!canHover || prefersReducedMotion) return undefined

    window.addEventListener('mousemove', handleMouseMove)
    document.body.classList.add('pixel-cursor-active')

    const animate = () => {
      setPixels((prev) =>
        prev
          .map((pixel) => ({
            ...pixel,
            opacity: pixel.opacity - FADE_SPEED,
            age: pixel.age + 1,
          }))
          .filter((pixel) => pixel.opacity > 0),
      )
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      document.body.classList.remove('pixel-cursor-active')
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [handleMouseMove])

  return (
    <div className="pixel-cursor-trail pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {pixels.map((pixel) => {
        const sizeMultiplier = Math.max(0.3, 1 - pixel.age / 100)
        const currentSize = PIXEL_SIZE * sizeMultiplier

        return (
          <div
            key={pixel.id}
            className="absolute"
            style={{
              left: pixel.x - currentSize / 2,
              top: pixel.y - currentSize / 2,
              width: currentSize,
              height: currentSize,
              opacity: pixel.opacity,
              backgroundColor: pixel.color,
              transition: 'width 0.1s ease-out, height 0.1s ease-out',
            }}
          />
        )
      })}
      <div
        className="absolute h-3 w-3 border-2 border-white bg-black shadow-[3px_3px_0_#8b8b8b]"
        style={{
          left: cursorPosition.x - 6,
          top: cursorPosition.y - 6,
        }}
      />
    </div>
  )
}

export default PixelCursorTrail
