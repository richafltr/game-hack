"use client"

import React, { useState, useRef, useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'

const GAME_DURATION = 3000 // 3 seconds
const WIN_THRESHOLD = 10 // Need 10 S presses to win

// VRM Avatar Component
function VRMAvatar({ cheekInflation }: { cheekInflation: number }) {
  const gltf = useGLTF('https://xz3j1twrmcso98lj.public.blob.vercel-storage.com/vrm-avatars/Alana-OQy4ywTxPGtEvBoKOmTROwu4wjTVqU.vrm')
  
  return (
    <primitive 
      object={gltf.scene} 
      scale={[3, 3, 3]} 
      position={[0, -2, 2]}
      rotation={[0, 0, 0]}
    />
  )
}

const SneezeGame = () => {
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'won' | 'lost'>('waiting')
  const [sPresses, setSPresses] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [cheekInflation, setCheekInflation] = useState(0)
  const [ahTextSize, setAhTextSize] = useState(1)
  const [showChoo, setShowChoo] = useState(false)
  const gameStartTime = useRef<number | null>(null)
  const animationFrame = useRef<number>()
  const sneezeSound = useRef<HTMLAudioElement | null>(null)

  // Initialize sound effect
  useEffect(() => {
    sneezeSound.current = new Audio('https://xz3j1twrmcso98lj.public.blob.vercel-storage.com/misc-assets/sneeze-81009-3ZgapiaRDZ7SgywEEJXTMTMNmqN3f6.mp3')
    sneezeSound.current.volume = 0.7
  }, [])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 's') {
        if (gameState === 'waiting') {
          // Start the game
          setGameState('playing')
          gameStartTime.current = Date.now()
          setSPresses(1)
          setAhTextSize(1.2)
          setCheekInflation(0.1)
        } else if (gameState === 'playing') {
          // Increment presses
          setSPresses(prev => {
            const newCount = prev + 1
            setAhTextSize(1 + (newCount * 0.2))
            setCheekInflation(Math.min(newCount * 0.1, 1))
            return newCount
          })
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [gameState])

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return

    const updateTimer = () => {
      if (!gameStartTime.current) return

      const elapsed = Date.now() - gameStartTime.current
      const remaining = Math.max(0, GAME_DURATION - elapsed)
      setTimeLeft(remaining)

      if (remaining <= 0) {
        // Time's up - check win condition
        if (sPresses >= WIN_THRESHOLD) {
          setGameState('won')
          setShowChoo(true)
          // Play sneeze sound
          if (sneezeSound.current) {
            sneezeSound.current.currentTime = 0
            sneezeSound.current.play().catch(console.error)
          }
        } else {
          setGameState('lost')
        }
      } else {
        animationFrame.current = requestAnimationFrame(updateTimer)
      }
    }

    animationFrame.current = requestAnimationFrame(updateTimer)
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current)
      }
    }
  }, [gameState, sPresses])

  // Check for early win
  useEffect(() => {
    if (gameState === 'playing' && sPresses >= WIN_THRESHOLD) {
      setGameState('won')
      setShowChoo(true)
      // Play sneeze sound
      if (sneezeSound.current) {
        sneezeSound.current.currentTime = 0
        sneezeSound.current.play().catch(console.error)
      }
    }
  }, [sPresses, gameState])

  const resetGame = () => {
    setGameState('waiting')
    setSPresses(0)
    setTimeLeft(GAME_DURATION)
    setCheekInflation(0)
    setAhTextSize(1)
    setShowChoo(false)
    gameStartTime.current = null
  }

  return (
    <div className="relative w-full h-screen bg-white overflow-hidden">
      {/* Manga screentone background pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle, black 1px, transparent 1px)`,
          backgroundSize: '8px 8px'
        }}
      />
      
      {/* 3D Character */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
          <ambientLight intensity={1} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} />
          <pointLight position={[0, 2, 4]} intensity={0.8} />
          <Suspense fallback={null}>
            <VRMAvatar cheekInflation={cheekInflation} />
          </Suspense>
          <OrbitControls 
            enablePan={false} 
            enableZoom={false} 
            enableRotate={false}
          />
        </Canvas>
      </div>

      {/* Game UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Title */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
          <h1 className="text-4xl font-bold text-black border-4 border-black bg-white px-6 py-2 transform -rotate-2">
            FAKE SNEEZE!
          </h1>
        </div>

        {/* Instructions */}
        {gameState === 'waiting' && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="bg-white border-4 border-black p-6 transform rotate-1 shadow-lg">
              <p className="text-2xl font-bold mb-4">Press 'S' to start sneezing!</p>
              <p className="text-lg">Mash 'S' key {WIN_THRESHOLD} times in 3 seconds!</p>
            </div>
          </div>
        )}

        {/* Game Stats */}
        {gameState === 'playing' && (
          <>
            {/* Timer */}
            <div className="absolute top-4 right-4 bg-white border-4 border-black p-4">
              <div className="text-2xl font-bold">
                Time: {Math.ceil(timeLeft / 1000)}s
              </div>
            </div>

            {/* S Press Counter */}
            <div className="absolute top-4 left-4 bg-white border-4 border-black p-4">
              <div className="text-2xl font-bold">
                S Presses: {sPresses}/{WIN_THRESHOLD}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-80 h-8 bg-white border-4 border-black">
              <div 
                className="h-full bg-red-400 transition-all duration-100"
                style={{ width: `${(sPresses / WIN_THRESHOLD) * 100}%` }}
              />
            </div>
          </>
        )}

        {/* "Ah-" Text that grows */}
        {gameState === 'playing' && sPresses > 0 && (
          <motion.div
            className="absolute bottom-1/3 left-1/2 transform -translate-x-1/2"
            animate={{ scale: ahTextSize }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div 
              className="text-6xl font-bold text-black bg-white border-4 border-black px-4 py-2 transform -rotate-1"
              style={{ 
                fontSize: `${2 + (sPresses * 0.5)}rem`,
                color: sPresses > 7 ? '#FF6B6B' : 'black' // Red blush when close
              }}
            >
              Ah-
            </div>
          </motion.div>
        )}

        {/* Massive "CHOO!" panel slam */}
        <AnimatePresence>
          {showChoo && (
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="text-9xl font-black text-white bg-black border-8 border-white p-8 transform rotate-3 shadow-2xl">
                -CHOO!
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Win/Lose Messages */}
        {gameState === 'won' && !showChoo && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="bg-white border-4 border-black p-8 transform -rotate-1 shadow-lg">
              <h2 className="text-4xl font-bold text-green-600 mb-4">Perfect Sneeze!</h2>
              <p className="text-xl mb-4">You mastered the art of fake sneezing!</p>
              <button
                onClick={resetGame}
                className="bg-black text-white px-6 py-3 text-xl font-bold border-4 border-black hover:bg-gray-800 transition-colors pointer-events-auto"
              >
                Sneeze Again!
              </button>
            </div>
          </div>
        )}

        {gameState === 'lost' && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="bg-white border-4 border-black p-8 transform rotate-1 shadow-lg">
              <h2 className="text-4xl font-bold text-red-600 mb-4">Sneeze Failed!</h2>
              <p className="text-xl mb-4">You only got {sPresses}/{WIN_THRESHOLD} presses!</p>
              <p className="text-lg mb-4">Try mashing 'S' faster!</p>
              <button
                onClick={resetGame}
                className="bg-black text-white px-6 py-3 text-xl font-bold border-4 border-black hover:bg-gray-800 transition-colors pointer-events-auto"
              >
                Try Again!
              </button>
            </div>
          </div>
        )}

        {/* Blush effect overlay when close to sneezing */}
        {gameState === 'playing' && sPresses > 7 && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at center, rgba(255, 107, 107, 0.2) 0%, transparent 70%)`,
            }}
          />
        )}
      </div>
    </div>
  )
}

export default SneezeGame 