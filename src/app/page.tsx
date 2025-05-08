'use client'
import { useEffect, useState } from "react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount, useSignMessage } from "wagmi"
import { saigon } from "viem/chains"
import { ethers } from "ethers"

export default function Page() {
  const [message, setMessage] = useState("")
  const [playerHand, setPlayerHand] = useState<{rank: string, suit: string}[]>([])
  const [dealerHand, setDealerHand] = useState<{rank: string, suit: string}[]>([])
  const [score, setScore] = useState<number>(0)
  const {address, isConnected} = useAccount()
  const [isSigned, setIsSigned] = useState<boolean>(false)
  const {signMessageAsync} = useSignMessage()

  useEffect(() => {
    if(message.includes("win") || message.includes("lose") || message.includes("Draw")) {
      localStorage.setItem(`${address}`, JSON.stringify(score))
    }
  }, [message])

  const initGame = async () => {
    const storedScore = localStorage.getItem(`${address}`);
    const response = await fetch(`/api?address=${address}&score=${storedScore}`, {method: 'GET'})
    const data = await response.json()
    setDealerHand(data.dealerHand)
    setPlayerHand(data.playerHand)
    setMessage(data.message)
    setScore(data.score)
  }

  async function mintNFT (recipientAddress: string, tokenURI: string) {
    // get contract address from env (智能合约地址)
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as any;
    // get abi 智能合约 ABI（仅包含铸造相关函数示例）
    const contractAbi = [`${process.env.NEXT_PUBLIC_CONTRACT_ABI || ""}`]
    
    try {
      // 检查 MetaMask 是否安装
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }
  
      // 请求用户连接钱包
      await window.ethereum.request({ method: 'eth_requestAccounts' });
  
      // 创建 ethers 提供者
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // 创建合约实例
      const contract = new ethers.Contract(contractAddress, contractAbi, signer);
  
      // 调用合约的 mintNFT 函数
      const tx = await contract.mintNFT(recipientAddress, tokenURI);
      
      // 等待交易确认
      const receipt = await tx.wait();
      // console.log('Transaction receipt:', receipt);
      
      // 获取新铸造的 NFT 的 tokenId
      const tokenId = receipt.logs[0]?.args?.tokenId || receipt.logs[0]?.transactionIndex || 0;
      // console.log('New NFT minted with tokenId:', tokenId.toString());
  
      // 返回交易详情
      return {
        success: true,
        transactionHash: tx.hash,
        tokenId: tokenId.toString(),
      };
    } catch (error: any) {
      console.error('Minting failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  const handleMint = async () => {
    const recipient = `${address}`; // 实际接收者地址
    const tokenURI = "ipfs://QmNwBmyiiMWhuJYtv19cybZ2WVcmjaryizvLFtV8t7V6RB"; // 实际的元数据 URI

    // get chain id (链 ID)
    const SAIGON_CHAIN_ID = saigon.id;
    const provider = new ethers.BrowserProvider(window.ethereum);
    // 获取当前网络
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    // 检查是否为 Saigon 网络
    if (chainId !== SAIGON_CHAIN_ID) {
      alert("请切换到 Saigon 网络。");
      try {
          // 请求用户切换网络
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${SAIGON_CHAIN_ID.toString(16)}` }],
          });
          // 等待几秒以确保网络切换完成
          setTimeout(() => {}, 2000);
          console.log("已切换到 Saigon 网络。");
      } catch (error) {
        console.error("切换网络失败:", error);
        return {
          success: false,
          error: "network error",
        };
      }
    }
  
    // 调用 mintNFT 函数 进行铸造
    const result = await mintNFT(recipient, tokenURI);
    if (result.success) {
      console.log(`NFT minted with Token ID: ${result.tokenId}`);
    } else {
      console.log(`Minting failed: ${result.error}`);
    }
  };

  async function handleHit() {
    const response = await fetch('/api', {
      method: 'POST', 
      headers: {
        bearer: `Bearer ${localStorage.getItem('jwt') || ''}`,
      },
      body: JSON.stringify({action: 'hit', address})
    })
    const data = await response.json()
    setDealerHand(data.dealerHand)
    setPlayerHand(data.playerHand)
    setMessage(data.message)
    setScore(data.score)
  }

  async function handleStand() {
    const response = await fetch('/api', {
      method: 'POST', 
      headers: {
        bearer: `Bearer ${localStorage.getItem('jwt') || ''}`,
      },
      body: JSON.stringify({action: 'stand', address})
    })
    const data = await response.json()
    setDealerHand(data.dealerHand)
    setPlayerHand(data.playerHand)
    setMessage(data.message)
    setScore(data.score)
  }

  async function handleReset() {
    const response = await fetch(`/api?address=${address}`, {method: 'GET'})
    const data = await response.json()
    setDealerHand(data.dealerHand)
    setPlayerHand(data.playerHand)
    setMessage(data.message)
    setScore(data.score)
  }

  async function handleSign() {
    const signMessage =  `Welcome to Web3 game Black jack at ${new Date().toLocaleString()}`
    const signature = await signMessageAsync({message: signMessage})
    const response = await fetch('/api', {method: 'POST', body: JSON.stringify({
      action: 'auth',
      address,
      message: signMessage,
      signature
    })})

    if(response.status === 200) {
      const { jsonwebtoken } = await response.json()
      localStorage.setItem('jwt', jsonwebtoken)
      setIsSigned(true)
      console.log("Signature is valid")
      initGame()
    }
  }

  if(!isSigned) {
    return (
      <div className="flex flex-col gap-2 items-center justify-center h-screen bg-gray-300">
        <ConnectButton/>
        { isConnected ? <button onClick={handleSign} className="border-black bg-amber-300 p-2 rounded-md">Sign with your wallet</button> : <h1> Please Connect wallet</h1> }
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2 items-center justify-center h-screen bg-gray-300">
      <ConnectButton/>
      <h1 className="text-3xl bold">Welcome to Web3 game Black jack</h1>
      <h2 className={`text-2xl bold ${message.includes("win") ? "bg-green-300" : "bg-amber-300"}`}>Score: {score} {message}</h2>
      <button className="bg-amber-300 rounded-md p-2" onClick={handleMint}>Get NFT</button>
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