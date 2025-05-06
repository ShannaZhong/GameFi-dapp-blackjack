// save the score into the database
// get and put score with tables in database
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ 
  region: "us-east-1", 
  credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
  }
})
const docClient = DynamoDBDocumentClient.from(client)

interface DynamoItem {
  player: string;
  score: number
}

async function putItem(item: DynamoItem) {
  try {
      const command = new PutCommand({
          TableName: "BlackJack",
          Item: item
      })
      await docClient.send(command)
  } catch (error) {
      throw new Error("Error putting item in DynamoDB: " + error)
  }
}
async function getItem(player: string) {
  try {
      const command = new GetCommand({
          TableName: "BlackJack",
          Key: {
              player
          }
      })
      const resposne = await docClient.send(command)
      return resposne.Item as DynamoItem || null
  } catch (error) {
      throw new Error("Error getting item from DynamoDB: " + error)
  }
}

async function updateScoreForPlayer(player: string, score: number) {
  try {
      const item = await getItem(player)
      if(!item) {
          await putItem({player, score})
      } else {
          await putItem({player, score})
      }
  } catch (error) {
      throw new Error("Error updating score for player: " + error)
  }
}

const defaultPlayer = "defaultPlayer"

// when the game is inited, get player and dealer 2 random cards respectiviely
export interface Card {
  rank: string, 
  suit: string,
}
const suits = ['♠️', '♥️', '♦️', '♣️']
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
const initialDeck = ranks.map(rank => suits.map(suit => ({ rank, suit}))).flat()

const gameState: {
  playerHand: Card[],
  dealerHand: Card[],
  deck: Card[],
  message: string,
  score: number,
} = {
  playerHand: [],
  dealerHand: [],
  deck: initialDeck,
  message: "",
  score: 0,
}

function getRandomCards(deck: Card[], count: number) {
  const randomIndexSet = new Set<number>()
  while(randomIndexSet.size < count) {
    randomIndexSet.add(Math.floor(Math.random() * deck.length))
  }
  const randomCards = deck.filter((_, index) => randomIndexSet.has(index))
  const remainingDeck = deck.filter((_, index) => !randomIndexSet.has(index))

  return [randomCards, remainingDeck]
}

export async function GET() {
  // reset the game state
  gameState.playerHand = []
  gameState.dealerHand = []
  gameState.deck = initialDeck
  gameState.message = ""

  const [playerCards, remainingDeck] = getRandomCards(gameState.deck, 2)
  const [dealerCards, newDeck] = getRandomCards(remainingDeck, 2)
  gameState.playerHand = playerCards
  gameState.dealerHand = dealerCards
  gameState.deck = newDeck
  gameState.message = ""

  try {
    const data = await getItem(defaultPlayer)
    console.log("data:", data)
    if(!data) {
      gameState.score = 0
    } else {
      gameState.score = data.score
    }
  } catch (error) {
    gameState.score = 0
  }

  return new Response(JSON.stringify(
    {
      playerHand: gameState.playerHand,
      dealerHand: [gameState.dealerHand[0], { rank: "?", suit: "?" } as Card], // hide dealer's second card of the hand
      message: gameState.message,
      score: gameState.score,
    }
  ), {
    status: 200,
  })
}

export async function POST(request: Request) {
  const { action } = await request.json()

  // when hit is clicked, get 1 random card from the deck and add it to the player's hand
  // calculate the points of the player's hand
  // if the player's points is 21: player wins, black jack
  // player hand is more than 21: player loses, bust
  // player hand is less than 21: continue player can hit or stand
  if(action === "hit") {
    const [cards, newDeck] = getRandomCards(gameState.deck, 1)
    gameState.playerHand.push(...cards)
    gameState.deck = newDeck

    const playerHandValue = calculateHandValue(gameState.playerHand)
    if(playerHandValue === 21) {
      gameState.message = "Black Jack! Player wins!"
      gameState.score += 100
    } else if(playerHandValue > 21) {
      gameState.message = "Bust! Player loses!"
      gameState.score -= 100
    }
  } 
  // when stand is clicked, get 1 radom card from the deck and add it to the dealer's hand
  // keep doing this until dealer has 17 or more points
  // calculate the points of the dealer's hand
  // if the dealer's points is 21: player loses, dealer black jack
  // dealer hand is more than 21: player wins, dealer bust
  // dealer hand is less than 21: compare the points of the player's hand and the dealer's hand
  // player > dealer: player wins
  // player < dealer: player loses
  // player = dealer: draw
  else if(action === "stand") {
    while(calculateHandValue(gameState.dealerHand) < 17) {
      const [randomCards, newDeck] = getRandomCards(gameState.deck, 1)
      gameState.dealerHand.push(...randomCards)
      gameState.deck = newDeck
    }
    const dealerHandValue = calculateHandValue(gameState.dealerHand)
    if(dealerHandValue > 21) {
      gameState.message = "Dealer bust! Player wins!"
      gameState.score += 100
    } else if(dealerHandValue === 21) {
      gameState.message = "Dealer black Jack! Player loses!"
      gameState.score -= 100
    } else {
      const playerHandValue = calculateHandValue(gameState.playerHand)
      if(playerHandValue > dealerHandValue) {
        gameState.message = "Player wins!"
        gameState.score += 100
      } else if(playerHandValue < dealerHandValue) {
        gameState.message = "Player loses!"
        gameState.score -= 100
      } else {
        gameState.message = "Draw!"
      }
    }
  } else {
    return new Response(JSON.stringify({ message: "Invalid action" }), {status: 400})
  }

  await updateScoreForPlayer(defaultPlayer, gameState.score) 
  
  return new Response(JSON.stringify(
    {
      playerHand: gameState.playerHand,
      dealerHand: gameState.message === "" ? [gameState.dealerHand[0], {rank: "?", suit: "?"} as Card] : gameState.dealerHand,
      message: gameState.message,
      score: gameState.score,
    }
  ), {
    status: 200,
  })
}
function calculateHandValue(hand: Card[]) {
  let value = 0
  let numAces = 0
  for(const card of hand) {
    if(card.rank === "A") {
      value += 11
      numAces++
    } else if(["J", "Q", "K"].includes(card.rank)) {
      value += 10
    } else {
      value += parseInt(card.rank)
    }
  }
  while(value > 21 && numAces > 0) {
    value -= 10
    numAces--
  }
  return value
}
