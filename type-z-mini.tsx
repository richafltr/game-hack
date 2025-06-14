"use client"

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Text, PointerLockControls, Plane, Environment, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { Vector3, AnimationMixer, LoopRepeat, RepeatWrapping, AudioListener, AudioLoader, LoopOnce, PositionalAudio, MeshBasicMaterial, TextureLoader, Object3D, Mesh, Texture, ShaderMaterialParameters } from 'three'
import { GLTFLoader } from 'three-stdlib'
import { Volume2, VolumeX, Heart } from 'lucide-react'
import { motion } from 'framer-motion'

interface ZombieProps {
  position: [number, number, number]
  word: string
  currentWord: string
  onDefeat: () => void
  onHit: () => void
  isMuted: boolean
  listener: AudioListener
  gameStarted: boolean
  gameOver: boolean
}

const ZOMBIE_MODEL = "https://43fzijkfwg2zmvr5.public.blob.vercel-storage.com/zombie1.glb"
const ZOMBIE_GROANS = [
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie_groan%20(1)-kd8wzGRW6MtWISCsj4R5X7zjhT9o8n.mp3",
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie_groan-WOmuyRptAnOmhV7eYAOjOxNZZmliTc.mp3",
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie_groan%20(3)-NfOpeDkdlJ5iu4tNEznAKDunWAFOxT.mp3",
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie_groan%20(2)-fgC0HuE0hXyCAfMAzCXghtaK0H9qiN.mp3"
]

const TEXTURES = {
  ground: {
    color: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Concrete042B_1K-JPG_Color-YXfPxgXAuNN7wBWGALx9ZclqEAzy1H.jpg',
    normal: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Concrete042B_1K-JPG_NormalGL-7AIHj26mONNr4wu81MtiRVL0pusucf.jpg',
    roughness: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Concrete042B_1K-JPG_Roughness-VXb2YSnD66pJd0dOm4Z0buSoPiMRMb.jpg',
    ao: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Concrete042B_1K-JPG_AmbientOcclusion-V5RHeUg8unHUTCiTr8xqMSkvvU36oI.jpg'
  }
}

const WORD = 'apocalypse'

const Zombie = React.memo<ZombieProps>(({ position, word, currentWord, onDefeat, onHit, isMuted, listener, gameStarted, gameOver }) => {
  const group = useRef<THREE.Group>(new THREE.Group())
  const mixerRef = useRef<AnimationMixer>(null!)
  const walkActionRef = useRef<THREE.AnimationAction>(null!)
  const hitActionRef = useRef<THREE.AnimationAction>(null!)
  const audioRef = useRef<PositionalAudio>(null!)
  const { scene } = useLoader(GLTFLoader, ZOMBIE_MODEL)
  const { animations: walkAnimations } = useLoader(GLTFLoader, "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie1-walk2-mxOC2bb3G7PYnBBrvslBU3UJF41Bph.glb")
  const { animations: hitAnimations } = useLoader(GLTFLoader, "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie-punch-GrsZVagThUbQgUdlhtQLoP3aYfJwoq.glb")
  const [isHitting, setIsHitting] = useState(false)
  const { camera } = useThree()
  const [currentGroanIndex, setCurrentGroanIndex] = useState(0)

  useEffect(() => {
    mixerRef.current = new AnimationMixer(scene)
    const walkClip = walkAnimations[0]
    const hitClip = hitAnimations[0]

    if (walkClip) {
      walkActionRef.current = mixerRef.current.clipAction(walkClip)
      walkActionRef.current.play()
    }

    if (hitClip) {
      hitActionRef.current = mixerRef.current.clipAction(hitClip)
      hitActionRef.current.setLoop(LoopRepeat, 1)
      hitActionRef.current.clampWhenFinished = true
    }

    scene.traverse((object: Object3D) => {
      if (object instanceof Mesh) {
        object.material = new MeshBasicMaterial({
          color: 0xffffff,
          map: object.material.map,
        })
        object.material.onBeforeCompile = (shader: any) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <map_fragment>',
            `
            #include <map_fragment>
            vec3 grayscale = vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)));
            diffuseColor.rgb = grayscale;
            `
          )
        }
      }
    })

    // Set up groan audio
    const playNextGroan = () => {
      if (audioRef.current) {
        const audioLoader = new AudioLoader()
        audioLoader.load(ZOMBIE_GROANS[currentGroanIndex], (buffer) => {
          if (audioRef.current) {
            audioRef.current.setBuffer(buffer)
            audioRef.current.setRefDistance(2)
            audioRef.current.setLoop(false)
            audioRef.current.setVolume(0.7)
            if (gameStarted && !isMuted) {
              audioRef.current.play()
            }
          }
        })
        setCurrentGroanIndex((prev) => (prev + 1) % ZOMBIE_GROANS.length)
      }
    }

    audioRef.current = new PositionalAudio(listener)
    playNextGroan()

    // Set up periodic groaning
    const groanInterval = setInterval(() => {
      if (!gameOver && !isHitting) {
        playNextGroan()
      }
    }, 8000) // Groan every 8 seconds

    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction()
      }
      if (audioRef.current) {
        audioRef.current.stop()
      }
      clearInterval(groanInterval)
    }
  }, [scene, walkAnimations, hitAnimations, listener, gameStarted, isMuted, currentGroanIndex, gameOver, isHitting])

  useEffect(() => {
    if (audioRef.current && audioRef.current.buffer) {
      if (gameStarted && !isMuted) {
        audioRef.current.play()
      } else {
        audioRef.current.pause()
      }
    }
  }, [isMuted, gameStarted])

  useFrame((state, delta) => {
    if (group.current && !gameOver) {
      if (!isHitting) {
        const targetPosition = new Vector3(camera.position.x, 0, camera.position.z)
        const direction = new Vector3().subVectors(targetPosition, group.current.position).normalize()
        group.current.position.add(direction.multiplyScalar(delta * 0.5))
        group.current.lookAt(targetPosition)

        if (group.current.position.distanceTo(targetPosition) < 2) {
          setIsHitting(true)
          if (hitActionRef.current) {
            walkActionRef.current.stop()
            hitActionRef.current.reset().play()
            setTimeout(() => {
              onHit()
              onDefeat()
            }, 1000)
          }
        }
      }
      if (mixerRef.current) {
        mixerRef.current.update(delta)
      }
    }
  })

  return (
    <group ref={group} position={position} scale={[1.5, 1.5, 1.5]}>
      <primitive object={scene} />
      {audioRef.current && <primitive object={audioRef.current} />}
      {!gameOver && (
        <group position={[0, 3, 0]}>
          {word.split('').map((letter, index) => (
            <Text
              key={index}
              position={[
                index * 0.2 - (word.length - 1) * 0.1,
                0,
                0
              ]}
              fontSize={0.25}
              color={
                index < currentWord.length &&
                  word.toLowerCase().startsWith(currentWord.toLowerCase()) &&
                  index < currentWord.length
                  ? "#C30010"
                  : "white"
              }
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.05}
              outlineColor="black"
              font="https://43fzijkfwg2zmvr5.public.blob.vercel-storage.com/GeistMono-Regular.ttf"
            >
              {letter}
            </Text>
          ))}
        </group>
      )}
    </group>
  )
})

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      <pointLight position={[-10, 10, -10]} intensity={0.5} />
      <directionalLight position={[0, 10, 0]} intensity={0.3} />
    </>
  )
}

function Ground() {
  const textures = useLoader(TextureLoader, [
    TEXTURES.ground.color,
    TEXTURES.ground.normal,
    TEXTURES.ground.roughness,
    TEXTURES.ground.ao
  ])

  const [colorMap, normalMap, roughnessMap, aoMap] = textures

  textures.forEach(texture => {
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.repeat.set(1000, 1000)
  })

  return (
    <Plane
      args={[10000, 10000]}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -10, 0]}
    >
      <meshStandardMaterial
        map={colorMap}
        normalMap={normalMap}
        roughnessMap={roughnessMap}
        aoMap={aoMap}
      />
    </Plane>
  )
}

function Game() {
  const [currentWord, setCurrentWord] = useState('')
  const [gameOver, setGameOver] = useState(false)
  const [success, setSuccess] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [gameStarted, setGameStarted] = useState(true)
  const [isShaking, setIsShaking] = useState(false)
  const listenerRef = useRef<AudioListener>(new AudioListener())
  const bgMusicRef = useRef<HTMLAudioElement | null>(null)
  const hitSoundRef = useRef<HTMLAudioElement | null>(null)
  const keyboardClackRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    bgMusicRef.current = new Audio('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie-8khsdtT8va70J2CVLJ2csJzLLRpfZi.mp3')
    bgMusicRef.current.loop = true
    bgMusicRef.current.volume = 0.5
    hitSoundRef.current = new Audio('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/hit-AiBAn95vUukxGrMLuDUiRhvsMiNa41.wav')
    hitSoundRef.current.volume = 0.5
    keyboardClackRef.current = new Audio('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/keyboard-dkZBqKdv5zTzXZAJMWawLwlVoHqh8Q.wav')
    keyboardClackRef.current.volume = 0.5

    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause()
      }
    }
  }, [])

  useEffect(() => {
    if (gameStarted && !isMuted && bgMusicRef.current) {
      bgMusicRef.current.play().catch(console.error)
    }
  }, [gameStarted, isMuted])

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (gameOver || !gameStarted) return

    if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
      setCurrentWord(prev => prev + e.key.toLowerCase())
      if (!isMuted && keyboardClackRef.current) {
        keyboardClackRef.current.currentTime = 0
        keyboardClackRef.current.play().catch(console.error)
      }
    } else if (e.key === 'Backspace') {
      setCurrentWord(prev => prev.slice(0, -1))
      if (!isMuted && keyboardClackRef.current) {
        keyboardClackRef.current.currentTime = 0
        keyboardClackRef.current.play().catch(console.error)
      }
    }
  }, [gameOver, gameStarted, isMuted])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])

  useEffect(() => {
    if (currentWord.toLowerCase() === WORD.toLowerCase()) {
      setSuccess(true)
      setGameOver(true)
    }
  }, [currentWord])

  const handleHit = useCallback(() => {
    setGameOver(true)
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 500)
    if (!isMuted && hitSoundRef.current) {
      hitSoundRef.current.play().catch(console.error)
    }
  }, [isMuted])

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev
      if (bgMusicRef.current) {
        if (newMuted) {
          bgMusicRef.current.pause()
        } else if (gameStarted) {
          bgMusicRef.current.play().catch(console.error)
        }
      }
      if (hitSoundRef.current) {
        hitSoundRef.current.muted = newMuted
      }
      if (keyboardClackRef.current) {
        keyboardClackRef.current.muted = newMuted
      }
      return newMuted
    })
  }, [gameStarted])

  return (
    <div className="w-full h-screen relative bg-black">
      <motion.div
        animate={{
          x: isShaking ? [-10, 10, -10, 10, 0] : 0,
        }}
        transition={{ duration: 0.5 }}
        className="w-full h-full"
      >
        <Canvas>
          <PointerLockControls onLock={() => setIsLocked(true)} onUnlock={() => setIsLocked(false)} />
          <Environment
            files="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/dark-sky-M5VuAJ19aCEyG5Wsm97VFHEllXWzVy.jpg"
            background
          />
          <Lighting />
          <Ground />
          <Suspense fallback={null}>
            <Zombie
              position={[0, 0, -10]}
              word={WORD}
              currentWord={currentWord}
              onDefeat={() => {}}
              onHit={handleHit}
              isMuted={isMuted}
              listener={listenerRef.current}
              gameStarted={gameStarted}
              gameOver={gameOver}
            />
          </Suspense>
          <primitive object={listenerRef.current} />
        </Canvas>
      </motion.div>
      <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 text-white text-4xl" style={{ fontFamily: '"Geist Mono", mono' }}>
        {currentWord}
      </div>
      <button
        className="absolute top-5 right-5 text-white bg-black p-2 rounded-full hover:bg-gray-800 transition-colors"
        onClick={toggleMute}
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
      </button>
      {gameOver && (
        <div className="flex fixed left-0 top-0 bottom-0 right-0 items-center justify-center pointer-events-none text-center">
          <h1 className="text-[12rem] font-bold" style={{ fontFamily: 'ChainsawCarnage, sans-serif', color: '#C30010' }}>
            {success ? 'SUCCESS!' : 'GAME OVER'}
          </h1>
        </div>
      )}
    </div>
  )
}

useGLTF.preload(ZOMBIE_MODEL)
useGLTF.preload("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie1-walk2-mxOC2bb3G7PYnBBrvslBU3UJF41Bph.glb")
useGLTF.preload("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie-punch-GrsZVagThUbQgUdlhtQLoP3aYfJwoq.glb")

export default function Component() {
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @font-face {
        font-family: 'ChainsawCarnage';
        src: url('https://43fzijkfwg2zmvr5.public.blob.vercel-storage.com/ChainsawCarnage.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
      }

      @font-face {
        font-family: 'GeistMono';
        src: url('https://43fzijkfwg2zmvr5.public.blob.vercel-storage.com/GeistMono-Regular.ttf');
        font-weight: normal;
        font-style: normal;
      }
    `
    document.head.appendChild(style)

    const font = new FontFace('ChainsawCarnage', 'url(https://43fzijkfwg2zmvr5.public.blob.vercel-storage.com/ChainsawCarnage.ttf)')
    font.load().then(() => {
      document.fonts.add(font)
    })
  }, [])

  return <Game />
}

