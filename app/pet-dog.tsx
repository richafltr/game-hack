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

  // Handle mouse down on dog
  const handlePetStart = (e: React.MouseEvent) => {
    if (gameWon || gameLost) return
    setIsPetting(true)
    petStartTime.current = Date.now()
    // Start tail wagging animation
    tailAnimation.start({
      rotate: [0, 20, 0, -20, 0],
      transition: { duration: 1, repeat: Infinity }
    })
  }

  // Handle mouse up or leave
  const handlePetEnd = () => {
    if (!isPetting) return
    setIsPetting(false)
    petStartTime.current = null
    setGameLost(true)
    tailAnimation.stop()
  }

  // Update petting progress
  useEffect(() => {
    if (!isPetting || gameWon) return
    
    const interval = setInterval(() => {
      if (petStartTime.current) {
        const elapsed = Date.now() - petStartTime.current
        setPetTime(elapsed)
        
        // Spawn heart every second
        if (elapsed % HEART_SPAWN_INTERVAL < 100) {
          const heartX = Math.random() * 100 - 50 // Random x position
          setHearts(prev => [...prev, { 
            id: Date.now(),
            x: heartX,
            y: -20
          }])
        }

        // Check for win condition
        if (elapsed >= PET_DURATION) {
          setGameWon(true)
          setIsPetting(false)
        }
      }
    }, 100)

    return () => clearInterval(interval)
  }, [isPetting, gameWon])

  // Clean up old hearts
  useEffect(() => {
    const interval = setInterval(() => {
      setHearts(prev => prev.filter(heart => Date.now() - heart.id < 2000))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative w-full h-screen bg-[#89CFF0] flex items-center justify-center overflow-hidden">
      {/* Grass */}
      <div className="absolute bottom-0 w-full h-1/4 bg-[#7FB069]" />
      
      {/* Dog */}
      <div 
        ref={dogRef}
        className="relative"
        onMouseDown={handlePetStart}
        onMouseUp={handlePetEnd}
        onMouseLeave={handlePetEnd}
      >
        {/* Dog body - brown crayon style */}
        <div className="w-48 h-48 bg-[#B5651D] rounded-3xl relative cursor-pointer
                      transform hover:scale-105 transition-transform
                      border-4 border-[#8B4513] shadow-lg">
          {/* Dog face */}
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2">
            <div className="w-24 h-16 bg-[#B5651D] rounded-full border-4 border-[#8B4513]">
              {/* Eyes */}
              <div className="flex justify-center gap-6 mt-2">
                <div className="w-3 h-3 bg-black rounded-full" />
                <div className="w-3 h-3 bg-black rounded-full" />
              </div>
              {/* Nose */}
              <div className="w-4 h-4 bg-black rounded-full mx-auto mt-2" />
            </div>
          </div>
          
          {/* Tail */}
          <motion.div
            animate={tailAnimation}
            className="absolute -right-8 top-1/2 w-12 h-4 bg-[#B5651D] origin-left
                     border-2 border-[#8B4513] rounded-full"
          />
        </div>
      </div>

      {/* Hearts */}
      {hearts.map(heart => (
        <motion.div
          key={heart.id}
          initial={{ y: heart.y, x: heart.x, opacity: 1 }}
          animate={{ y: heart.y - 100, opacity: 0 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute text-2xl"
        >
          ❤️
        </motion.div>
      ))}

      {/* Progress bar */}
      {isPetting && !gameWon && (
        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-64 h-4 bg-white rounded-full overflow-hidden">
          <div 
            className="h-full bg-pink-500 transition-all duration-100"
            style={{ width: `${(petTime / PET_DURATION) * 100}%` }}
          />
        </div>
      )}

      {/* Game over messages */}
      {gameWon && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                      text-4xl font-bold text-pink-500 bg-white p-6 rounded-xl shadow-lg">
          You made the dog very happy! 🎉
        </div>
      )}
      
      {gameLost && !gameWon && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                      text-4xl font-bold text-red-500 bg-white p-6 rounded-xl shadow-lg">
          The dog needs more pets! Try again!
        </div>
      )}

      {/* Reset button */}
      {(gameWon || gameLost) && (
        <button
          onClick={() => {
            setGameWon(false)
            setGameLost(false)
            setPetTime(0)
            setHearts([])
          }}
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2
                   bg-white text-pink-500 px-6 py-3 rounded-full text-xl font-bold
                   hover:bg-pink-100 transition-colors"
        >
          Play Again
        </button>
      )}
    </div>
  )
}

export default PetDog 