import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-black text-white">
      <h1 className="text-6xl mb-12" style={{ fontFamily: 'ChainsawCarnage, sans-serif' }}>
        Game Hack
      </h1>
      <div className="flex flex-col gap-8">
        <Link 
          href="/type-z" 
          className="text-2xl hover:text-[#C30010] transition-colors"
          style={{ fontFamily: '"Geist Mono", mono' }}
        >
          Type-Z: Zombie Typing Game
        </Link>
        <Link 
          href="/pet-dog" 
          className="text-2xl hover:text-pink-500 transition-colors"
          style={{ fontFamily: '"Geist Mono", mono' }}
        >
          Pet the Dog! 🐕
        </Link>
        <Link 
          href="/sneeze-game" 
          className="text-2xl hover:text-red-400 transition-colors"
          style={{ fontFamily: '"Geist Mono", mono' }}
        >
          Fake Sneeze! 🤧
        </Link>
      </div>
    </main>
  )
}

