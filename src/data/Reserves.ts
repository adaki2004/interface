// Dani/Brecht todos:
// 1.: This needs to get info from L1 !! Instead of L2, so that we dont need to deploy liquidity on L2 -> If complex bc. of some other shit dependencies, just let it as is, and we deploy the liquidity on L2
// 2.: make xTransfer UI working
// 3.: verify contracts (xTaiko, xSloth) 
// 4.: New blockscout UI (-> for that i need rbuilder in amd64 and arm64 pushed)
import { TokenAmount, Pair, Currency, Token } from '@uniswap/sdk'
import { Contract } from '@ethersproject/contracts'
import { JsonRpcProvider } from '@ethersproject/providers'
import { useMemo, useState, useEffect } from 'react'
import { abi as IUniswapV2PairABI } from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { Interface } from '@ethersproject/abi'
import { useActiveWeb3React } from '../hooks'
import { useMultipleContractSingleData } from '../state/multicall/hooks'
import { wrappedCurrency } from '../utils/wrappedCurrency'

const PAIR_INTERFACE = new Interface(IUniswapV2PairABI)

const L1_RPC_URL = 'http://127.0.0.1:32002'
const l1Provider = new JsonRpcProvider(L1_RPC_URL)

export enum PairState {
  LOADING,
  NOT_EXISTS,
  EXISTS,
  INVALID
}

const L2_CHAIN_IDS = {
  L2A: 167010,
  L2B: 167011
}

const isL2Chain = (chainId?: number): boolean => {
  return chainId === L2_CHAIN_IDS.L2A || chainId === L2_CHAIN_IDS.L2B
}

function useL1Reserves(pairAddresses: (string | undefined)[], shouldFetch: boolean) {
  const [reserves, setReserves] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!shouldFetch || !pairAddresses.length) return

    async function fetchL1Reserves() {
      setLoading(true)
      try {
        const validAddresses = pairAddresses.filter((addr): addr is string => !!addr)
        const reservePromises = validAddresses.map(async (address) => {
          const pair = new Contract(address, PAIR_INTERFACE, l1Provider)
          return pair.getReserves()
        })

        const results = await Promise.all(reservePromises)
        setReserves(results.map(result => ({ result, loading: false })))
        setError(null)
      } catch (err) {
        console.error('Failed to fetch L1 reserves:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch L1 reserves')
        setReserves([])
      } finally {
        setLoading(false)
      }
    }

    fetchL1Reserves()
  }, [pairAddresses, shouldFetch])

  return { reserves, loading, error }
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
        if (!tokenA || !tokenB || tokenA.equals(tokenB)) return undefined

        if (isL2Chain(chainId)) {
          const l1TokenA = new Token(160010, tokenA.address, tokenA.decimals, tokenA.symbol, tokenA.name)
          const l1TokenB = new Token(160010, tokenB.address, tokenB.decimals, tokenB.symbol, tokenB.name)
          return Pair.getAddress(l1TokenA, l1TokenB)
        }

        return Pair.getAddress(tokenA, tokenB)
      }),
    [tokens, chainId]
  )

  const isL2 = isL2Chain(chainId)
  const { reserves: l1Reserves, loading: l1Loading } = useL1Reserves(pairAddresses, isL2)
  const l2Results = useMultipleContractSingleData(
    pairAddresses,
    PAIR_INTERFACE,
    'getReserves'
  )

  const results = isL2 ? l1Reserves : l2Results

  return useMemo(() => {
    return pairAddresses.map((_, i) => {
      const tokenA = tokens[i][0]
      const tokenB = tokens[i][1]

      if (!tokenA || !tokenB || tokenA.equals(tokenB)) {
        return [PairState.INVALID, null]
      }

      const result = results[i]
      if (!result) {
        return [PairState.LOADING, null]
      }

      const { result: reserves, loading } = result
      if (loading || l1Loading) return [PairState.LOADING, null]
      if (!reserves) return [PairState.NOT_EXISTS, null]

      try {
        const { reserve0, reserve1 } = reserves
        const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]
        return [
          PairState.EXISTS,
          new Pair(
            new TokenAmount(token0, reserve0.toString()),
            new TokenAmount(token1, reserve1.toString())
          )
        ]
      } catch (error) {
        console.error('Failed to create pair:', error)
        return [PairState.INVALID, null]
      }
    })
  }, [results, tokens, l1Loading, pairAddresses])
}

export function usePair(tokenA?: Currency, tokenB?: Currency): [PairState, Pair | null] {
  return usePairs([[tokenA, tokenB]])[0]
}