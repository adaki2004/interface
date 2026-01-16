import { BigNumber } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'
import { JsonRpcProvider } from '@ethersproject/providers'
import { Token, TokenAmount } from '@uniswap/sdk'
import { useState, useEffect } from 'react'
import { useActiveWeb3React } from '../hooks'
import { useTokenContract } from '../hooks/useContract'
import { useSingleCallResult } from '../state/multicall/hooks'
import { isL2Chain } from './Reserves'

const L1_RPC_URL = 'http://127.0.0.1:32002'
const l1Provider = new JsonRpcProvider(L1_RPC_URL)

// Standard ERC20 ABI for totalSupply
const ERC20_ABI = ['function totalSupply() view returns (uint256)']

// returns undefined if input token is undefined, or fails to get token contract,
// or contract total supply cannot be fetched
export function useTotalSupply(token?: Token): TokenAmount | undefined {
  const { chainId } = useActiveWeb3React()
  const isL2 = isL2Chain(chainId)
  
  // L1 fallback state for L2 chains
  const [l1TotalSupply, setL1TotalSupply] = useState<BigNumber | undefined>()
  const [l1Loading, setL1Loading] = useState(false)
  
  // L2 chains: fetch directly from L1
  useEffect(() => {
    if (!isL2 || !token?.address) {
      setL1TotalSupply(undefined)
      setL1Loading(false)
      return
    }

    let isStale = false
    setL1Loading(true)
    
    async function fetchL1TotalSupply() {
      try {
        const contract = new Contract(token!.address, ERC20_ABI, l1Provider)
        const result = await contract.totalSupply()
        if (!isStale) {
          setL1TotalSupply(result)
          setL1Loading(false)
        }
      } catch (error) {
        console.log(`L1 totalSupply fetch failed for ${token!.address}:`, error instanceof Error ? error.message : error)
        if (!isStale) {
          setL1TotalSupply(undefined)
          setL1Loading(false)
        }
      }
    }

    fetchL1TotalSupply()
    
    return () => {
      isStale = true
    }
  }, [isL2, token?.address])

  // Non-L2 chains: use existing multicall path
  const contract = useTokenContract(token?.address, false)
  const l2TotalSupply: BigNumber = useSingleCallResult(isL2 ? null : contract, 'totalSupply')?.result?.[0]

  // Choose result based on chain type
  const totalSupply = isL2 ? l1TotalSupply : l2TotalSupply
  const loading = isL2 ? l1Loading : false

  if (loading) return undefined
  return token && totalSupply ? new TokenAmount(token, totalSupply.toString()) : undefined
}
