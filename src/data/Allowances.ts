import { Token, TokenAmount } from '@uniswap/sdk'
import { useMemo, useEffect, useState } from 'react'

import { useTokenContract } from '../hooks/useContract'
import { useSingleCallResult } from '../state/multicall/hooks'
import { useActiveWeb3React } from '../hooks'
import { useBlockNumber } from '../state/application/hooks'
import { useAllTransactions } from '../state/transactions/hooks'

// L2 chain detection
const L2_CHAIN_IDS = {
  L2A: 167010,
  L2B: 167011
}

const isL2Chain = (chainId?: number): boolean => {
  return chainId === L2_CHAIN_IDS.L2A || chainId === L2_CHAIN_IDS.L2B
}

export function useTokenAllowance(token?: Token, owner?: string, spender?: string): TokenAmount | undefined {
  const { chainId } = useActiveWeb3React()
  const contract = useTokenContract(token?.address, false)
  const inputs = useMemo(() => [owner, spender], [owner, spender])
  const multicallAllowance = useSingleCallResult(contract, 'allowance', inputs)?.result?.[0]
  
  // Fresh allowance state for L2 chains
  const [freshAllowance, setFreshAllowance] = useState<string | undefined>()
  const [lastRefreshBlock, setLastRefreshBlock] = useState<number>()
  const blockNumber = useBlockNumber()
  const allTransactions = useAllTransactions()


  // Refresh allowance on L2 when:
  // 1. Approval transaction was just confirmed
  // 2. A few blocks have passed since approval
  useEffect(() => {
    const shouldRefresh = isL2Chain(chainId) && 
                         token && 
                         owner && 
                         spender && 
                         contract && 
                         blockNumber

    if (!shouldRefresh) {
      setFreshAllowance(undefined)
      return
    }

    // Check if we have a recently confirmed approval
    const recentApproval = Object.values(allTransactions).find(tx => 
      tx.approval?.tokenAddress === token?.address &&
      tx.approval?.spender === spender &&
      tx.receipt &&
      tx.receipt.blockNumber &&
      blockNumber &&
      blockNumber - tx.receipt.blockNumber <= 3 // Within 3 blocks
    )

    // Refresh if we have a recent approval or if we haven't refreshed in a while
    const needsRefresh = recentApproval || 
                        (lastRefreshBlock && blockNumber && blockNumber - lastRefreshBlock >= 5) ||
                        !lastRefreshBlock

    if (needsRefresh && contract) {
      console.log('🔄 Refreshing L2 allowance due to recent approval or block passage')
      
      contract.allowance(owner, spender)
        .then((result: any) => {
          console.log('✅ Fresh L2 allowance:', result.toString())
          setFreshAllowance(result.toString())
          setLastRefreshBlock(blockNumber)
        })
        .catch((error: any) => {
          console.error('❌ Failed to refresh L2 allowance:', error)
          // Fall back to multicall result
          setFreshAllowance(undefined)
        })
    }
  }, [chainId, token, owner, spender, contract, blockNumber, allTransactions, lastRefreshBlock])

  // Use fresh allowance on L2 if available, otherwise use multicall
  const effectiveAllowance = isL2Chain(chainId) && freshAllowance !== undefined 
    ? freshAllowance 
    : multicallAllowance

  return useMemo(
    () => (token && effectiveAllowance ? new TokenAmount(token, effectiveAllowance.toString()) : undefined),
    [token, effectiveAllowance]
  )
}
