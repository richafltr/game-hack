"use client"

import React, { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Text, PointerLockControls, Plane, useGLTF, useTexture, Environment } from '@react-three/drei'
import { Vector3, AnimationMixer, LoopRepeat, RepeatWrapping, AudioListener, AudioLoader, LoopOnce, PositionalAudio, MeshBasicMaterial } from 'three'
import { GLTFLoader, SkeletonUtils } from 'three-stdlib'
import { Volume2, VolumeX, Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const zombieModels = [
  "https://43fzijkfwg2zmvr5.public.blob.vercel-storage.com/zombie2.glb"
]

const zombieGroans = [
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie_groan%20(1)-kd8wzGRW6MtWISCsj4R5X7zjhT9o8n.mp3",
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie_groan-WOmuyRptAnOmhV7eYAOjOxNZZmliTc.mp3",
]

const zombie5Groans = [
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/huge_20_ft_monster_g%20(2)-0vN8lRy7XwI79Z0eyRe1zu04PHcXIs.mp3",
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/huge_20_ft_monster_g-uiI58NpCFhzph4uxhPb3OaKORYwjdI.mp3"
]

const zombie1Groans = [
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/11L-zombie_groan,_female-1726693551582-VWJWk6jasBV5H9Nydu2l9qRoFVSyK1.mp3",
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/11L-zombie_groan,_female-1726693554225-eGjO9rEqYwE86Mhz3exwFZuptSeWFF.mp3"
]

const TEXTURES = {
  ground: {
    color: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Concrete042B_1K-JPG_Color-YXfPxgXAuNN7wBWGALx9ZclqEAzy1H.jpg',
    normal: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Concrete042B_1K-JPG_NormalGL-7AIHj26mONNr4wu81MtiRVL0pusucf.jpg',
    roughness: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Concrete042B_1K-JPG_Roughness-VXb2YSnD66pJd0dOm4Z0buSoPiMRMb.jpg',
    ao: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Concrete042B_1K-JPG_AmbientOcclusion-V5RHeUg8unHUTCiTr8xqMSkvvU36oI.jpg'
  }
}

const Zombie = React.memo(({ position, word, currentWord, onDefeat, isActive, modelUrl, onHit, groanUrl, isMuted, listener, gameStarted, gameOver }) => {
  const group = useRef(null)
  const mixerRef = useRef(null)
  const walkActionRef = useRef(null)
  const hitActionRef = useRef(null)
  const audioRef = useRef(null)
  const { scene } = useLoader(GLTFLoader, modelUrl)
  const { animations: walkAnimations } = useLoader(GLTFLoader, "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie1-walk2-mxOC2bb3G7PYnBBrvslBU3UJF41Bph.glb")
  const { animations: hitAnimations } = useLoader(GLTFLoader, "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie-punch-GrsZVagThUbQgUdlhtQLoP3aYfJwoq.glb")
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const [isHitting, setIsHitting] = useState(false)
  const { camera } = useThree()
  const lastGroanTime = useRef(0)
  const GROAN_INTERVAL = 8000

  useEffect(() => {
    mixerRef.current = new AnimationMixer(clone)
    const walkClip = walkAnimations[0]
    const hitClip = hitAnimations[0]

    if (walkClip) {
      walkActionRef.current = mixerRef.current.clipAction(walkClip)
      walkActionRef.current.timeScale = 1.2
      walkActionRef.current.play()
    }

    if (hitClip) {
      hitActionRef.current = mixerRef.current.clipAction(hitClip)
      hitActionRef.current.setLoop(LoopOnce, 1)
      hitActionRef.current.clampWhenFinished = true
    }

    clone.traverse((object) => {
      if (object.isMesh) {
        object.material = new MeshBasicMaterial({
          color: 0xffffff,
          map: object.material.map,
        })
        object.material.onBeforeCompile = (shader) => {
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

    group.current.scale.set(1.5, 1.5, 1.5)

    audioRef.current = new PositionalAudio(listener)
    const audioLoader = new AudioLoader()
    audioLoader.load(groanUrl, (buffer) => {
      if (audioRef.current) {
        audioRef.current.setBuffer(buffer)
        audioRef.current.setRefDistance(2)
        audioRef.current.setVolume(0.7)
        if (gameStarted && !isMuted) {
          audioRef.current.play()
        }
      }
    })

    return () => {
      if (mixerRef.current) mixerRef.current.stopAllAction()
      if (audioRef.current) audioRef.current.stop()
    }
  }, [clone, walkAnimations, hitAnimations, groanUrl, listener, gameStarted, isMuted])

  useFrame((state, delta) => {
    if (group.current && isActive) {
      if (!isHitting) {
        const targetPosition = new Vector3(camera.position.x, 0, camera.position.z)
        const direction = new Vector3().subVectors(targetPosition, group.current.position).normalize()
        const speed = 0.8
        group.current.position.add(direction.multiplyScalar(delta * speed))
        group.current.lookAt(targetPosition)

        const currentTime = state.clock.getElapsedTime() * 1000
        if (currentTime - lastGroanTime.current >= GROAN_INTERVAL) {
          if (audioRef.current && !isMuted) {
            audioRef.current.play()
          }
          lastGroanTime.current = currentTime
        }

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

  if (!isActive) return null

  return (
    <group ref={group} position={position}>
      <primitive object={clone} />
      {audioRef.current && <primitive object={audioRef.current} />}
      {!gameOver && isActive && (
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
  const textures = useTexture(TEXTURES.ground, (textures) => {
    Object.values(textures).forEach(texture => {
      texture.wrapS = texture.wrapT = RepeatWrapping
      texture.repeat.set(1000, 1000)
    })
  })

  return (
    <Plane
      args={[10000, 10000]}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -10, 0]}
    >
      <meshStandardMaterial
        map={textures.color}
        normalMap={textures.normal}
        roughnessMap={textures.roughness}
        aoMap={textures.ao}
      />
    </Plane>
  )
}

function City() {
  const { scene } = useGLTF("https://43fzijkfwg2zmvr5.public.blob.vercel-storage.com/modern-city.glb")

  useEffect(() => {
    scene.traverse((object) => {
      if (object.isMesh) {
        object.material = new MeshBasicMaterial({
          color: 0xffffff,
          map: object.material.map,
        })
        object.material.onBeforeCompile = (shader) => {
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
  }, [scene])

  return <primitive object={scene} position={[50, 0, -50]} scale={[.01, .01, .01]} />
}

function Game() {
  const [showCredits, setShowCredits] = useState(false)
  const [wave, setWave] = useState(0)
  const [showWaveAnnouncement, setShowWaveAnnouncement] = useState(false)
  const [cameraTarget, setCameraTarget] = useState(new Vector3(0, 2, 3))
  const cameraRef = useRef()
  const initialCameraPosition = useRef(new Vector3(10, 2, 20))
  const targetCameraPosition = useRef(new Vector3(0, 100, 3))
  const [zombies, setZombies] = useState([])
  const [currentWord, setCurrentWord] = useState('')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [gameOver, setGameOver] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [shouldStartNextRound, setShouldStartNextRound] = useState(false)
  const [gameStarted, setGameStarted] = useState(true)
  const [isShaking, setIsShaking] = useState(false)
  const listenerRef = useRef(new AudioListener())
  const bgMusicRef = useRef()
  const hitSoundRef = useRef()
  const keyboardClackRef = useRef()

  const easyWords = ['quixotic', 'zephyr', 'ephemeral', 'ubiquitous', 'serendipity', 'mellifluous', 'eloquent', 'enigma', 'paradox', 'labyrinth']
  const mediumWords = ['cacophony', 'surreptitious', 'idiosyncratic', 'obfuscate', 'euphemism', 'juxtapose', 'paradigm', 'quintessential', 'vicissitude', 'zeitgeist']
  const hardWords = ['antidisestablishmentarianism', 'floccinaucinihilipilification', 'pneumonoultramicroscopicsilicovolcanoconiosis', 'hippopotomonstrosesquippedaliophobia', 'supercalifragilisticexpialidocious', 'pseudopseudohypoparathyroidism', 'sesquipedalian', 'honorificabilitudinitatibus', 'thyroparathyroidectomized', 'dichlorodifluoromethane']

  useEffect(() => {
    bgMusicRef.current = new window.Audio('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie-8khsdtT8va70J2CVLJ2csJzLLRpfZi.mp3')
    bgMusicRef.current.loop = true
    bgMusicRef.current.volume = 0.5
    hitSoundRef.current = new window.Audio('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/hit-AiBAn95vUukxGrMLuDUiRhvsMiNa41.wav')
    hitSoundRef.current.volume = 0.5
    keyboardClackRef.current = new window.Audio('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/keyboard-dkZBqKdv5zTzXZAJMWawLwlVoHqh8Q.wav')
    keyboardClackRef.current.volume = 0.5

    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause()
      }
    }
  }, [])

  const spawnZombies = useCallback((count, waveNumber) => {
    const availableModels = waveNumber === 1 ? zombieModels.slice(0, 4) : zombieModels;
    return Array(count).fill(null).map(() => ({
      id: Date.now() + Math.random(),
      position: [Math.random() * 40 - 20, 0, Math.random() * 40 - 20],
      word: easyWords[Math.floor(Math.random() * easyWords.length)],
      isActive: true,
      modelUrl: availableModels[Math.floor(Math.random() * availableModels.length)],
      groanUrl: zombieGroans[Math.floor(Math.random() * zombieGroans.length)]
    }))
  }, [easyWords])

  const spawnZombiesForWave = useCallback((waveNumber) => {
    const zombieCount = waveNumber * 5;
    const zombie5Count = waveNumber >= 2 ? Math.max(1, Math.floor(waveNumber / 2)) : 0;
    const zombie4Count = waveNumber >= 2 ? Math.max(1, Math.floor(waveNumber / 3)) : 0;
    const regularZombieCount = zombieCount - zombie5Count - zombie4Count;

    const spawnRadius = 20;

    const getRandomPosition = () => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * spawnRadius + 10;
      return [
        cameraRef.current.position.x + Math.cos(angle) * radius,
        0,
        cameraRef.current.position.z + Math.sin(angle) * radius
      ];
    };

    const newZombies = [
      ...Array(regularZombieCount).fill().map(() => {
        const zombieType = Math.floor(Math.random() * 3);
        return {
          id: Date.now() + Math.random(),
          position: getRandomPosition(),
          word: easyWords[Math.floor(Math.random() * easyWords.length)],
          isActive: true,
          modelUrl: zombieModels[zombieType],
          groanUrl: zombieType === 0 ? zombie1Groans[Math.floor(Math.random() * zombie1Groans.length)] : zombieGroans[Math.floor(Math.random() * zombieGroans.length)]
        };
      }),
      ...Array(zombie4Count).fill().map(() => ({
        id: Date.now() + Math.random(),
        position: getRandomPosition(),
        word: mediumWords[Math.floor(Math.random() * mediumWords.length)],
        isActive: true,
        modelUrl: zombieModels[3],
        groanUrl: zombieGroans[Math.floor(Math.random() * zombieGroans.length)]
      })),
      ...Array(zombie5Count).fill().map(() => ({
        id: Date.now() + Math.random(),
        position: getRandomPosition(),
        word: hardWords[Math.floor(Math.random() * hardWords.length)],
        isActive: true,
        modelUrl: zombieModels[4],
        groanUrl: zombie5Groans[Math.floor(Math.random() * zombie5Groans.length)]
      }))
    ];

    setZombies(newZombies);
    setShowWaveAnnouncement(true);
    setTimeout(() => setShowWaveAnnouncement(false), 2000);
  }, [easyWords, mediumWords, hardWords]);

  useEffect(() => {
    if (!shouldStartNextRound || !cameraRef.current) {
      return
    }

    setShouldStartNextRound(false);
    spawnZombiesForWave(wave + 1);
    setWave(wave + 1);
  }, [shouldStartNextRound, spawnZombiesForWave, wave, cameraRef])

  useEffect(() => {
    if (gameStarted && !gameOver) {
      if (zombies.length === 0) {
        setShouldStartNextRound(true)
      }
    }
  }, [gameStarted, gameOver, zombies.length]);

  useEffect(() => {
    if (gameStarted && !isMuted && bgMusicRef.current) {
      bgMusicRef.current.play().catch(console.error)
    }
  }, [gameStarted, isMuted])

  const handleKeyPress = useCallback((e) => {
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
    const handleSpacebar = (e) => {
      if (e.code === 'Space' && !gameStarted) {
        setGameStarted(true)
        if (!isMuted && bgMusicRef.current) {
          bgMusicRef.current.play().catch(console.error)
        }
      }
    }
    window.addEventListener('keydown', handleSpacebar)
    return () => window.removeEventListener('keydown', handleSpacebar)
  }, [gameStarted, isMuted])

  useEffect(() => {
    setZombies(prev => prev.filter(zombie => {
      if (zombie.isActive && zombie.word.toLowerCase() === currentWord.toLowerCase()) {
        setScore(prev => prev + 1)
        setCurrentWord('')
        return false
      }
      return true
    }))
  }, [currentWord])

  const handleDefeat = useCallback((zombieId) => {
    setZombies(prev => prev.filter(z => z.id !== zombieId))
  }, [])

  const handleHit = useCallback(() => {
    setLives(prev => {
      const newLives = Math.max(0, prev - 1)
      if (newLives === 0) {
        setGameOver(true)
      }
      return newLives
    })
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
          <CameraController ref={cameraRef} initialPosition={initialCameraPosition.current} targetPosition={cameraTarget} gameOver={gameOver} />
          <PointerLockControls onLock={() => setIsLocked(true)} onUnlock={() => setIsLocked(false)} />
          <Environment
            files="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/dark-sky-M5VuAJ19aCEyG5Wsm97VFHEllXWzVy.jpg"
            background
          />
          <Lighting />
          <Ground />
          <Suspense fallback={null}>
            <City />
            {zombies.map(zombie => (
              <Zombie
                key={zombie.id}
                position={zombie.position}
                word={zombie.word}
                currentWord={currentWord}
                onDefeat={() => handleDefeat(zombie.id)}
                isActive={zombie.isActive}
                modelUrl={zombie.modelUrl}
                onHit={handleHit}
                groanUrl={zombie.groanUrl}
                isMuted={isMuted}
                listener={listenerRef.current}
                gameStarted={gameStarted}
                gameOver={gameOver}
              />
            ))}
          </Suspense>
          <primitive object={listenerRef.current} />
        </Canvas>
        {showWaveAnnouncement && (
          <div className="flex fixed left-0 top-0 bottom-0 right-0 items-center justify-center pointer-events-none text-center">
            <h1 className="text-[18rem] font-bold" style={{ fontFamily: 'ChainsawCarnage, sans-serif', color: '#C30010' }}>Wave {wave}</h1>
          </div>
        )}
      </motion.div>
      <div className="absolute top-5 left-5 text-[#C30010] text-2xl flex">
        {Array(Math.max(0, lives)).fill().map((_, i) => (
          <Heart key={i} size={64} fill="#C30010" />
        ))}
      </div>
      <div className="absolute top-5 left-1/2 transform -translate-x-1/2 text-white text-6xl" style={{ fontFamily: '"Geist Mono", mono' }}>
        {score}
      </div>
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
          <h1 className="text-[12rem] font-bold" style={{ fontFamily: 'ChainsawCarnage, sans-serif', color: '#C30010' }}>GAME OVER</h1>
        </div>
      )}
      <Button
        className="fixed bottom-5 left-5 bg-black text-white hover:bg-gray-800 uppercase z-50"
        onClick={() => setShowCredits(true)}
        style={{ fontFamily: '"Geist Mono", mono' }}
      >
        Credits
      </Button>
      <Dialog open={showCredits} onOpenChange={setShowCredits}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Geist Mono", mono' }}>Credits</DialogTitle>
          </DialogHeader>
          <ul className="space-y-2 text-xs" style={{ fontFamily: '"Geist Mono", mono' }}>
            <li><strong>Music</strong><br />https://suno.com</li>
            <li><strong>Zombie SFX</strong><br />https://elevenlabs.io</li>
            <li><strong>Skybox</strong><br />https://skybox.blockadelabs.com</li>
            <li><strong>Zombie Models / Animations</strong><br />https://www.mixamo.com</li>
            <li><strong>Key Press Sound</strong><br />https://mixkit.co/free-sound-effects/discover/press</li>
            <li><strong>Chainsaw Carnage font</strong><br />https://www.dafont.com/chainsaw-carnage.font</li>
            <li><strong>Modern City Block</strong><br />https://sketchfab.com/3d-models/modern-city-block-c80dba249d9547cbb48d00828d23cfa7</li>
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  )
}

zombieModels.forEach(url => useGLTF.preload(url))
useGLTF.preload("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie-stand-up-cToSxc4GDal767iNUgJiLwrnVR0713.glb")
useGLTF.preload("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie-scream-DIMDtwHV5zr3SiRqXfx23l1cFycYMd.glb")
useGLTF.preload("https://43fzijkfwg2zmvr5.public.blob.vercel-storage.com/zombie4.glb")
useGLTF.preload("https://43fzijkfwg2zmvr5.public.blob.vercel-storage.com/zombie5.glb")
useGLTF.preload("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie1-walk2-mxOC2bb3G7PYnBBrvslBU3UJF41Bph.glb")
useGLTF.preload("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie-punch-GrsZVagThUbQgUdlhtQLoP3aYfJwoq.glb")
useGLTF.preload("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie-run-OtQQVYzoknVK3iUyvEgfsDqq9lNlGq.glb")
useGLTF.preload("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/monster-walk-Ud0jgDdDuyjqJc7PpJ5w9Z16A6Vgzt.glb")
useGLTF.preload("https://43fzijkfwg2zmvr5.public.blob.vercel-storage.com/tiny-city.glb")

const CameraController = React.forwardRef(({ initialPosition, targetPosition, gameOver }, ref) => {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.copy(initialPosition)
    ref.current = camera
  }, [camera, initialPosition, ref])

  useFrame((state, delta) => {
    if (gameOver) {
      camera.position.lerp(targetPosition, 0.05)
      camera.lookAt(0, 0, 0)
    }
  })

  return null
})

const ZombieModel = ({ onHit, stopGroans, hasHit }) => {
  const gltf = useLoader(GLTFLoader, "https://43fzijkfwg2zmvr5.public.blob.vercel-storage.com/zombie2.glb")
  const standUpAnimation = useLoader(GLTFLoader, "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie-stand-up-cToSxc4GDal767iNUgJiLwrnVR0713.glb")
  const screamAnimation = useLoader(GLTFLoader, "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie-scream-DIMDtwHV5zr3SiRqXfx23l1cFycYMd.glb")
  const runAnimation = useLoader(GLTFLoader, "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie-run-OtQQVYzoknVK3iUyvEgfsDqq9lNlGq.glb")
  const hitAnimation = useLoader(GLTFLoader, "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie-punch-GrsZVagThUbQgUdlhtQLoP3aYfJwoq.glb")

  const mixerRef = useRef()
  const zombieRef = useRef()
  const [currentAnimation, setCurrentAnimation] = useState('standUp')
  const [zombieVisible, setZombieVisible] = useState(true)
  const audioRef = useRef(new Audio())
  const actionsRef = useRef({})
  const [walk, setWalk] = useState(false)

  const groanSounds = {
    standUp: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie_groan%20(3)-NfOpeDkdlJ5iu4tNEznAKDunWAFOxT.mp3",
    run: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie_groan-WOmuyRptAnOmhV7eYAOjOxNZZmliTc.mp3",
    hit: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zombie_groan%20(2)-fgC0HuE0hXyCAfMAzCXghtaK0H9qiN.mp3"
  }

  const playGroan = (animationType) => {
    if (!stopGroans) {
      audioRef.current.src = groanSounds[animationType]
      audioRef.current.play().catch(console.error)
    }
  }

  useEffect(() => {
    mixerRef.current = new AnimationMixer(gltf.scene)
    zombieRef.current = gltf.scene

    actionsRef.current = {
      standUp: mixerRef.current.clipAction(standUpAnimation.animations[0]),
      scream: mixerRef.current.clipAction(screamAnimation.animations[0]),
      run: mixerRef.current.clipAction(runAnimation.animations[0]),
      hit: mixerRef.current.clipAction(hitAnimation.animations[0])
    }

    Object.values(actionsRef.current).forEach(action => {
      action.setLoop(LoopOnce)
      action.clampWhenFinished = true
    })

    actionsRef.current.run.setLoop(LoopRepeat)

    actionsRef.current.standUp.timeScale = 1.5
    actionsRef.current.scream.timeScale = 1.5
    actionsRef.current.run.timeScale = 2
    actionsRef.current.hit.timeScale = 2

    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        child.material = new MeshBasicMaterial({
          color: 0xffffff,
          map: child.material.map,
        })
        child.material.onBeforeCompile = (shader) => {
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

    const animationSequence = async () => {
      if (!hasHit) {
        const fadeTime = 0.5

        playGroan('standUp')
        actionsRef.current.standUp.play()
        await new Promise(resolve => setTimeout(resolve, standUpAnimation.animations[0].duration * 300))

        setCurrentAnimation('run')
        setTimeout(() => setWalk(true), 250);
        actionsRef.current.run.reset().play()
        actionsRef.current.run.crossFadeFrom(actionsRef.current.scream, fadeTime, true)
        await new Promise(resolve => setTimeout(resolve, 2500))

        setCurrentAnimation('hit')
        actionsRef.current.hit.reset().play()
        actionsRef.current.hit.crossFadeFrom(actionsRef.current.run, fadeTime, true)
        await new Promise(resolve => setTimeout(resolve, hitAnimation.animations[0].duration * 150))

        onHit()
        setZombieVisible(false)
      }
    }

    animationSequence()

    return () => {
      mixerRef.current.stopAllAction()
      audioRef.current.pause()
      audioRef.current.src = ""
    }
  }, [gltf.scene, standUpAnimation, screamAnimation, runAnimation, hitAnimation, onHit, stopGroans, hasHit])

  useEffect(() => {
    if (stopGroans) {
      audioRef.current.pause()
      audioRef.current.src = ""
    }
  }, [stopGroans])

  useFrame((state, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta)
    }

    if (zombieRef.current && walk) {
      zombieRef.current.position.z += delta * 1.5
      if (zombieRef.current.position.z >= -1.2) {
        zombieRef.current.position.z = -1.2
      }
    }
  })

  if (!zombieVisible) return null

  return <primitive object={gltf.scene} position={[0, 0, -5]} />
}

const TitleScreen = ({ onZombieHit, hasHit }) => {
  const { camera } = useThree()
  const originalPosition = useRef(new Vector3(0, 1, 0))
  const spotLightRef = useRef()
  const bgMusicRef = useRef(new Audio('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/title-XhOtw5KDnieCs0uKjjVNQmtnk54bhS.mp3'))
  const [stopGroans, setStopGroans] = useState(false)
  const [hasZombieHit, setHasZombieHit] = useState(false)

  useEffect(() => {
    camera.position.copy(originalPosition.current)
    camera.lookAt(new Vector3(0, 0, -8))
  }, [camera])

  useEffect(() => {
    bgMusicRef.current.loop = true
    bgMusicRef.current.volume = 0.5
    return () => {
      bgMusicRef.current.pause()
      bgMusicRef.current.currentTime = 0
    }
  }, [])

  const handleZombieHit = useCallback(() => {
    if (hasZombieHit) {
      return
    }
    bgMusicRef.current.play().catch(console.error)
    setStopGroans(true)
    setHasZombieHit(true)
    onZombieHit()
  }, [hasZombieHit, onZombieHit])

  useFrame((state, delta) => {
    if (spotLightRef.current) {
      spotLightRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.5) * 3
      spotLightRef.current.position.z = Math.cos(state.clock.elapsedTime * 0.5) * 3
    }
  })

  return (
    <>
      <Environment
        files="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/M3_Photoreal_Featured_equirectangular-jpg_street_view_in_dystopian_790272735_11981184%20(1)-oYDwojHp4Pr1HbWVGqnHmhPvSt9clh.jpg"
        background
      />
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 5, 0]} intensity={0.5} />
      <spotLight
        ref={spotLightRef}
        position={[0, 5, 0]}
        angle={0.3}
        penumbra={0.2}
        intensity={1}
      />
      <ZombieModel onHit={handleZombieHit} stopGroans={stopGroans} hasHit={hasHit} />
    </>
  )
}

export default function Component() {
  const [gameStarted, setGameStarted] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [showTitle, setShowTitle] = useState(false)
  const [hasHit, setHasHit] = useState(false)
  const hitSoundRef = useRef(new Audio('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/hit-AiBAn95vUukxGrMLuDUiRhvsMiNa41.wav'))
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

  useEffect(() => {
    hitSoundRef.current.volume = 0.5
    const handleSpacebar = (e) => {
      if (e.code === 'Space' && !gameStarted && showTitle) {
        setGameStarted(true)
      }
    }
    window.addEventListener('keydown', handleSpacebar)
    return () => window.removeEventListener('keydown', handleSpacebar)
  }, [gameStarted, showTitle])

  const handleZombieHit = useCallback(() => {
    if (!hasHit) {
      setIsShaking(true)
      hitSoundRef.current.play().catch(console.error)
      setTimeout(() => {
        setIsShaking(false)
      }, 500)
      setShowTitle(true)
      setHasHit(true)
    }
  }, [hasHit])

  if (!gameStarted) {
    return (
      <div className="w-full h-screen relative">
        <motion.div
          animate={{
            x: isShaking ? [-10, 10, -10, 10, 0] : 0,
          }}
          transition={{ duration: 0.5 }}
          className="w-full h-full"
        >
          <Canvas camera={{ position: [0, -10, 0] }}>
            <Environment preset="night" background />
            <TitleScreen onZombieHit={handleZombieHit} hasHit={hasHit} />
          </Canvas>
        </motion.div>
        {showTitle && (
          <>
            <div className="flex fixed left-0 top-0 bottom-0 right-0 items-center justify-center">
              <h1 className="text-[18rem] font-bold" style={{ fontFamily: 'ChainsawCarnage, sans-serif', color: '#C30010' }}>Type-Z</h1>
            </div>
            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-center">
              <p className="text-4xl text-white animate-pulse uppercase" style={{ fontFamily: '"Geist Mono", mono' }}>Press spacebar</p>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <Game />
  )
}

