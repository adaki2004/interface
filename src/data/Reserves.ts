import { TokenAmount, Pair, Currency } from '@uniswap/sdk'
import { useMemo } from 'react'
import { abi as IUniswapV2PairABI } from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { Interface } from '@ethersproject/abi'
import { useActiveWeb3React } from '../hooks'

import { useMultipleContractSingleData } from '../state/multicall/hooks'
import { wrappedCurrency } from '../utils/wrappedCurrency'

const PAIR_INTERFACE = new Interface(IUniswapV2PairABI)

export enum PairState {
  LOADING,
  NOT_EXISTS,
  EXISTS,
  INVALID
}

// Add these constants
const L2_CHAIN_IDS = {
  L2A: 167010,
  L2B: 167011
}

const isL2Chain = (chainId?: number): boolean => {
  return chainId === L2_CHAIN_IDS.L2A || chainId === L2_CHAIN_IDS.L2B
}

export function usePairs(currencies: [Currency | undefined, Currency | undefined][]): [PairState, Pair | null][] {
  const { chainId } = useActiveWeb3React()

  const tokens = useMemo(
    () =>
      currencies.map(([currencyA, currencyB]) => [
        wrappedCurrency(currencyA, chainId),
        wrappedCurrency(currencyB, chainId)
      ]),
    [chainId, currencies]
  )

  const pairAddresses = useMemo(
    () =>
      tokens.map(([tokenA, tokenB]) => {
        // For L2 chains, we don't need to check local liquidity
        if (isL2Chain(chainId) && tokenA && tokenB) {
          return Pair.getAddress(tokenA, tokenB) // This is just for interface compatibility
        }

        return tokenA && tokenB && !tokenA.equals(tokenB) ? Pair.getAddress(tokenA, tokenB) : undefined
      }),
    [tokens, chainId]
  )

  // Dani/Brecht todos:
  // 1.: This needs to get info from L1 !! Instead of L2, so that we dont need to deploy liquidity on L2 -> If complex bc. of some other shit dependencies, just let it as is, and we deploy the liquidity on L2
  // 2.: make xTransfer UI working
  // 3.: verify contracts (xTaiko, xSloth) 
  // 4.: New blockscout UI (-> for that i need rbuilder in amd64 and arm64 pushed)
  const results = useMultipleContractSingleData(pairAddresses, PAIR_INTERFACE, 'getReserves')

  return useMemo(() => {
    return results.map((result, i) => {
      const { result: reserves, loading } = result
      const tokenA = tokens[i][0]
      const tokenB = tokens[i][1]

      if (loading) return [PairState.LOADING, null]
      if (!tokenA || !tokenB || tokenA.equals(tokenB)) return [PairState.INVALID, null]

      // For L2 chains, assume the pair exists if both tokens are valid
      // if (isL2Chain(chainId) && tokenA && tokenB) {
      //   try {
      //     // Create a dummy pair with minimal liquidity just to satisfy the interface
      //     const dummyAmount = '1000000' // Small amount to prevent price impact warnings
      //     return [
      //       PairState.EXISTS,
      //       new Pair(
      //         new TokenAmount(tokenA, dummyAmount),
      //         new TokenAmount(tokenB, dummyAmount)
      //       )
      //     ]
      //   } catch (error) {
      //     console.debug('Failed to create L2 pair', { tokenA, tokenB, error })
      //     return [PairState.INVALID, null]
      //   }
      // }

      // Original L1 logic
      if (!reserves) return [PairState.NOT_EXISTS, null]
      const { reserve0, reserve1 } = reserves
      const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]
      return [
        PairState.EXISTS,
        new Pair(new TokenAmount(token0, reserve0.toString()), new TokenAmount(token1, reserve1.toString()))
      ]
    })
  }, [results, tokens])
}

export function usePair(tokenA?: Currency, tokenB?: Currency): [PairState, Pair | null] {
  return usePairs([[tokenA, tokenB]])[0]
}
