"use client"

import dynamic from 'next/dynamic'

const SneezeGame = dynamic(() => import('../sneeze-game'), {
  ssr: false,
})

export default function SneezeGamePage() {
  return <SneezeGame />
} 