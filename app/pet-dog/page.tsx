"use client"

import dynamic from 'next/dynamic'

const PetDog = dynamic(() => import('../pet-dog'), {
  ssr: false,
})

export default function PetDogPage() {
  return <PetDog />
} 