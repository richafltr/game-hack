import React, { useState, useRef, useEffect } from 'react'
import { motion, useAnimation } from 'framer-motion'

const PET_DURATION = 4000 // 4 seconds to win
const HEART_SPAWN_INTERVAL = 1000 // Spawn heart every second

const PetDog = () => {
  const [isPetting, setIsPetting] = useState(false)
  const [petTime, setPetTime] = useState(0)
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([])
  const [gameWon, setGameWon] = useState(false)
  const [gameLost, setGameLost] = useState(false)
  const dogRef = useRef<HTMLDivElement>(null)
  const petStartTime = useRef<number | null>(null)
  const tailAnimation = useAnimation()
  const whineSound = useRef<HTMLAudioElement | null>(null)
  const winSound = useRef<HTMLAudioElement | null>(null)
  const heartSound = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Initialize sounds
    whineSound.current = new Audio('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/sad-whine-4Hs0Hs0Hs0Hs0Hs0Hs0Hs0Hs0Hs0.mp3')
    winSound.current = new Audio('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/happy-bark-4Hs0Hs0Hs0Hs0Hs0Hs0Hs0Hs0Hs0.mp3')
    heartSound.current = new Audio('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/pop-4Hs0Hs0Hs0Hs0Hs0Hs0Hs0Hs0Hs0.mp3')
  }, [])

  // Tail wagging animation
  useEffect(() => {
    if (isPetting) {
      tailAnimation.start({
        rotate: [0, 20, 0, -20, 0],
        transition: {
          duration: 0.5,
          repeat: Infinity,
          ease: "easeInOut"
        }
      })
    } else {
      tailAnimation.stop()
    }
  }, [isPetting, tailAnimation])

  // Heart spawning and petting timer
  useEffect(() => {
    if (!isPetting) return

    const spawnHeart = () => {
      if (!dogRef.current) return
      const rect = dogRef.current.getBoundingClientRect()
      const x = rect.left + Math.random() * rect.width
      const y = rect.top + Math.random() * (rect.height / 2)
      
      setHearts(prev => [...prev, { id: Date.now(), x, y }])
      if (heartSound.current) {
        heartSound.current.currentTime = 0
        heartSound.current.play()
      }
    }

    const interval = setInterval(() => {
      if (petStartTime.current) {
        const elapsed = Date.now() - petStartTime.current
        setPetTime(elapsed)
        if (elapsed >= PET_DURATION) {
          setGameWon(true)
          if (winSound.current) winSound.current.play()
          clearInterval(interval)
        } else {
          spawnHeart()
        }
      }
    }, HEART_SPAWN_INTERVAL)

    return () => clearInterval(interval)
  }, [isPetting])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (gameWon || gameLost) return
    setIsPetting(true)
    petStartTime.current = Date.now()
  }

  const handleMouseUp = () => {
    if (gameWon) return
    if (isPetting && petTime < PET_DURATION) {
      setGameLost(true)
      if (whineSound.current) whineSound.current.play()
    }
    setIsPetting(false)
    petStartTime.current = null
  }

  const handleMouseLeave = () => {
    if (isPetting && !gameWon) {
      setGameLost(true)
      if (whineSound.current) whineSound.current.play()
    }
    setIsPetting(false)
    petStartTime.current = null
  }

  const resetGame = () => {
    setGameWon(false)
    setGameLost(false)
    setPetTime(0)
    setHearts([])
    petStartTime.current = null
  }

  return (
    <div 
      className="relative w-screen h-screen flex items-center justify-center"
      style={{ backgroundColor: '#89CFF0' }} // Sky blue background
    >
      {/* Grass */}
      <div 
        className="absolute bottom-0 w-full h-1/3"
        style={{ backgroundColor: '#7FB069' }} // Grass green
      />

      {/* Dog */}
      <div
        ref={dogRef}
        className="relative cursor-pointer"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Dog body - crayon style */}
        <motion.div
          className="w-48 h-32 rounded-3xl"
          style={{ backgroundColor: '#B5651D' }} // Dog brown
          animate={isPetting ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          {/* Dog head */}
          <div 
            className="absolute -top-16 left-32 w-24 h-24 rounded-full"
            style={{ backgroundColor: '#B5651D' }}
          >
            {/* Eyes */}
            <div className="absolute top-8 left-4 w-4 h-4 bg-black rounded-full" />
            <div className="absolute top-8 right-4 w-4 h-4 bg-black rounded-full" />
            {/* Nose */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-6 h-4 bg-black rounded-full" />
          </div>
          
          {/* Tail */}
          <motion.div
            className="absolute -right-8 top-1/2 w-12 h-4 rounded-full origin-left"
            style={{ backgroundColor: '#B5651D' }}
            animate={tailAnimation}
          />
        </motion.div>
      </div>

      {/* Hearts */}
      {hearts.map(heart => (
        <motion.div
          key={heart.id}
          className="absolute text-2xl"
          initial={{ x: heart.x, y: heart.y, opacity: 1, scale: 0 }}
          animate={{ y: heart.y - 100, opacity: 0, scale: 1 }}
          transition={{ duration: 1 }}
          onAnimationComplete={() => {
            setHearts(prev => prev.filter(h => h.id !== heart.id))
          }}
        >
          ❤️
        </motion.div>
      ))}

      {/* Progress bar */}
      {isPetting && !gameWon && !gameLost && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-4 bg-white rounded-full overflow-hidden">
          <div 
            className="h-full bg-pink-500 transition-all duration-100"
            style={{ width: `${(petTime / PET_DURATION) * 100}%` }}
          />
        </div>
      )}

      {/* Game over messages */}
      {(gameWon || gameLost) && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <h1 className="text-4xl font-bold mb-4">
            {gameWon ? "Good job! The dog loves you! 🐕" : "Aww, try again! 🐾"}
          </h1>
          <button
            className="px-4 py-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
            onClick={resetGame}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  )
}

export default PetDog 