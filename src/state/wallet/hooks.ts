import { Currency, CurrencyAmount, ETHER, JSBI, Token, TokenAmount } from '@uniswap/sdk'
import { useMemo, useState, useEffect } from 'react'
import { Contract } from '@ethersproject/contracts'
import { JsonRpcProvider } from '@ethersproject/providers'
import ERC20_INTERFACE from '../../constants/abis/erc20'
import { useAllTokens } from '../../hooks/Tokens'
import { useActiveWeb3React } from '../../hooks'
import { useMulticallContract } from '../../hooks/useContract'
import { isAddress } from '../../utils'
import { useSingleContractMultipleData, useMultipleContractSingleData } from '../multicall/hooks'
import { isL2Chain } from '../../data/Reserves'

const L1_RPC_URL = 'http://127.0.0.1:32002'
const l1Provider = new JsonRpcProvider(L1_RPC_URL)

/**
 * Returns a map of the given addresses to their eventually consistent ETH balances.
 */
export function useETHBalances(
  uncheckedAddresses?: (string | undefined)[]
): { [address: string]: CurrencyAmount | undefined } {
  const multicallContract = useMulticallContract()

  const addresses: string[] = useMemo(
    () =>
      uncheckedAddresses
        ? uncheckedAddresses
            .map(isAddress)
            .filter((a): a is string => a !== false)
            .sort()
        : [],
    [uncheckedAddresses]
  )

  const results = useSingleContractMultipleData(
    multicallContract,
    'getEthBalance',
    addresses.map(address => [address])
  )

  return useMemo(
    () =>
      addresses.reduce<{ [address: string]: CurrencyAmount }>((memo, address, i) => {
        const value = results?.[i]?.result?.[0]
        if (value) memo[address] = CurrencyAmount.ether(JSBI.BigInt(value.toString()))
        return memo
      }, {}),
    [addresses, results]
  )
}

/**
 * Returns a map of token addresses to their eventually consistent token balances for a single account.
 */
export function useTokenBalancesWithLoadingIndicator(
  address?: string,
  tokens?: (Token | undefined)[],
  options?: { forceL1?: boolean }
): [{ [tokenAddress: string]: TokenAmount | undefined }, boolean] {
  const { chainId } = useActiveWeb3React()
  const isL2 = isL2Chain(chainId)
  const shouldUseL1 = options?.forceL1 && isL2
  
  const validatedTokens: Token[] = useMemo(
    () => tokens?.filter((t?: Token): t is Token => isAddress(t?.address) !== false) ?? [],
    [tokens]
  )

  const validatedTokenAddresses = useMemo(() => validatedTokens.map(vt => vt.address), [validatedTokens])

  // L1 fallback state for L2 chains
  const [l1Balances, setL1Balances] = useState<{ [tokenAddress: string]: TokenAmount | undefined }>({})
  const [l1Loading, setL1Loading] = useState(false)

  // L1 fallback when forceL1 is true on L2 chains
  useEffect(() => {
    if (!shouldUseL1 || !address || validatedTokens.length === 0) {
      setL1Balances(prev => (Object.keys(prev).length ? {} : prev))
      setL1Loading(false)
      return
    }

    let isStale = false
    setL1Loading(true)
    
    async function fetchL1Balances() {
      try {
        const balancePromises = validatedTokens.map(async (token) => {
          try {
            const contract = new Contract(token.address, ERC20_INTERFACE, l1Provider)
            const balance = await contract.balanceOf(address)
            return {
              tokenAddress: token.address,
              token,
              balance: balance ? JSBI.BigInt(balance.toString()) : undefined
            }
          } catch (error) {
            console.log(`L1 balance fetch failed for ${token.address}:`, error instanceof Error ? error.message : error)
            return {
              tokenAddress: token.address,
              token,
              balance: undefined
            }
          }
        })

        const results = await Promise.all(balancePromises)
        
        if (!isStale) {
          const balancesMap = results.reduce<{ [tokenAddress: string]: TokenAmount | undefined }>((memo, { tokenAddress, token, balance }) => {
            if (balance) {
              memo[tokenAddress] = new TokenAmount(token, balance)
            }
            return memo
          }, {})
          
          setL1Balances(balancesMap)
          setL1Loading(false)
        }
      } catch (error) {
        if (!isStale) {
          console.error('Failed to fetch L1 token balances:', error)
          setL1Balances({})
          setL1Loading(false)
        }
      }
    }

    fetchL1Balances()
    
    return () => {
      isStale = true
    }
  }, [shouldUseL1, address, validatedTokens])

  // Use multicall unless we're forcing L1 on L2
  const balances = useMultipleContractSingleData(
    shouldUseL1 ? [] : validatedTokenAddresses, // Skip multicall when forcing L1
    ERC20_INTERFACE, 
    'balanceOf', 
    [address]
  )

  const anyLoading: boolean = useMemo(() => {
    return shouldUseL1 ? l1Loading : balances.some(callState => callState.loading)
  }, [shouldUseL1, l1Loading, balances])

  return [
    useMemo(() => {
      if (shouldUseL1) {
        return l1Balances
      }
      
      return address && validatedTokens.length > 0
        ? validatedTokens.reduce<{ [tokenAddress: string]: TokenAmount | undefined }>((memo, token, i) => {
            const value = balances?.[i]?.result?.[0]
            const amount = value ? JSBI.BigInt(value.toString()) : undefined
            if (amount) {
              memo[token.address] = new TokenAmount(token, amount)
            }
            return memo
          }, {})
        : {}
    }, [shouldUseL1, l1Balances, address, validatedTokens, balances]),
    anyLoading
  ]
}

export function useTokenBalances(
  address?: string,
  tokens?: (Token | undefined)[]
): { [tokenAddress: string]: TokenAmount | undefined } {
  return useTokenBalancesWithLoadingIndicator(address, tokens)[0]
}

// get the balance for a single token/account combo
export function useTokenBalance(account?: string, token?: Token): TokenAmount | undefined {
  const tokenBalances = useTokenBalances(account, [token])
  if (!token) return undefined
  return tokenBalances[token.address]
}

export function useCurrencyBalances(
  account?: string,
  currencies?: (Currency | undefined)[]
): (CurrencyAmount | undefined)[] {
  const tokens = useMemo(() => currencies?.filter((currency): currency is Token => currency instanceof Token) ?? [], [
    currencies
  ])

  const tokenBalances = useTokenBalances(account, tokens)
  const containsETH: boolean = useMemo(() => currencies?.some(currency => currency === ETHER) ?? false, [currencies])
  const ethBalance = useETHBalances(containsETH ? [account] : [])

  return useMemo(
    () =>
      currencies?.map(currency => {
        if (!account || !currency) return undefined
        if (currency instanceof Token) return tokenBalances[currency.address]
        if (currency === ETHER) return ethBalance[account]
        return undefined
      }) ?? [],
    [account, currencies, ethBalance, tokenBalances]
  )
}

export function useCurrencyBalance(account?: string, currency?: Currency): CurrencyAmount | undefined {
  return useCurrencyBalances(account, [currency])[0]
}

// mimics useAllBalances
export function useAllTokenBalances(): { [tokenAddress: string]: TokenAmount | undefined } {
  const { account } = useActiveWeb3React()
  const allTokens = useAllTokens()
  const allTokensArray = useMemo(() => Object.values(allTokens ?? {}), [allTokens])
  const balances = useTokenBalances(account ?? undefined, allTokensArray)
  return balances ?? {}
}
