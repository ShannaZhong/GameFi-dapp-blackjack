'use client'
import { useEffect, useState } from "react"

export default function Page() {
  const [message, setMessage] = useState("")
  const [playerHand, setPlayerHand] = useState<{rank: string, suit: string}[]>([])
  const [dealerHand, setDealerHand] = useState<{rank: string, suit: string}[]>([])
  const [score, setScore] = useState<number>(0)

  useEffect(() => {
    const initGame = async () => {
      const response = await fetch('/api', {method: 'GET'})
      const data = await response.json()
      setDealerHand(data.dealerHand)
      setPlayerHand(data.playerHand)
      setMessage(data.message)
      setScore(data.score)
    }
    initGame()
  }, [])

  async function handleHit() {
    const response = await fetch('/api', {method: 'POST', body: JSON.stringify({action: 'hit'})})
    const data = await response.json()
    setDealerHand(data.dealerHand)
    setPlayerHand(data.playerHand)
    setMessage(data.message)
    setScore(data.score)
  }

  async function handleStand() {
    const response = await fetch('/api', {method: 'POST', body: JSON.stringify({action: 'stand'})})
    const data = await response.json()
    setDealerHand(data.dealerHand)
    setPlayerHand(data.playerHand)
    setMessage(data.message)
    setScore(data.score)
  }

  async function handleReset() {
    const response = await fetch('/api', {method: 'GET'})
    const data = await response.json()
    setDealerHand(data.dealerHand)
    setPlayerHand(data.playerHand)
    setMessage(data.message)
    setScore(data.score)
  }

  return (
    <div className="flex flex-col gap-2 items-center justify-center h-screen bg-gray-300">
      <h1 className="text-3xl bold">Welcome to Web3 game Black jack</h1>
      <h2 className={`text-2xl bold ${message.includes("win") ? "bg-green-300" : "bg-amber-300"}`}>Score: {score} {message}</h2>
      <div className="mt-4">
        <h2>Dealer's hand</h2>
        <div className="flex flex-row gap-2">
          {
            dealerHand.map((card, index) => (
              <div key={index} className="w-32 h-42 border-1 border-black bg-white rounded-md flex flex-col justify-between">
                <p className="text-lg self-start p-2">{card.rank}</p>
                <p className="text-3xl self-center">{card.suit}</p>
                <p className="text-lg self-end p-2">{card.rank}</p>
              </div>
            ))
          }
        </div>
      </div>

      <div>
        <h2>Player's hand</h2>
        <div className="flex flex-row gap-2">
          {
            playerHand.map((card, index) => (
              <div key={index} className="w-32 h-42 border-1 border-black bg-white rounded-md flex flex-col justify-between">
                <p className="text-lg self-start p-2">{card.rank}</p>
                <p className="text-3xl self-center">{card.suit}</p>
                <p className="text-lg self-end p-2">{card.rank}</p>
              </div>
            ))
          }
        </div>
      </div>

      <div className="flex flex-row gap-2 mt-4">
        {
          message === "" ? 
          <>
            <button onClick={handleHit} className="bg-amber-300 rounded-md p-2">Hit</button>
            <button onClick={handleStand} className="bg-amber-300 rounded-md p-2">Stand</button>
          </> :
            <button onClick={handleReset} className="bg-amber-300 rounded-md p-2">Reset</button>
        }
      </div>
    </div>
  )
}