import { ChainId, Token } from '@uniswap/sdk'
import { Tags, TokenInfo, TokenList } from '@uniswap/token-lists'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { AppState } from '../index'

type TagDetails = Tags[keyof Tags]
export interface TagInfo extends TagDetails {
  id: string
}

/**
 * Token instances created from token info.
 */
export class WrappedTokenInfo extends Token {
  public readonly tokenInfo: TokenInfo
  public readonly tags: TagInfo[]
  constructor(tokenInfo: TokenInfo, tags: TagInfo[]) {
    super(tokenInfo.chainId, tokenInfo.address, tokenInfo.decimals, tokenInfo.symbol, tokenInfo.name)
    this.tokenInfo = tokenInfo
    this.tags = tags
  }
  public get logoURI(): string | undefined {
    return this.tokenInfo.logoURI
  }
}

export type TokenAddressMap = Readonly<{ [chainId in ChainId]: Readonly<{ [tokenAddress: string]: WrappedTokenInfo }> }>

// Define the GWYNETH tokens
const GWYNETH_TOKENS: TokenInfo[] = [
  {
  chainId: ChainId.GWYNETH,
  address: '0xDE68f4ED350A914c2d9279d4bc38A4549A41c5d1',
  name: 'Sloth Token',
  decimals: 18,
  symbol: 'SLOTH',
  logoURI: undefined, // Add logo URI if available
  tags: ['sloth']
},
  {
    chainId: ChainId.GWYNETH,
    address: '0x497664eD3164Ff894CEdDB28C24C181e830C621f',
    name: 'Taiko Token',
    decimals: 18,
    symbol: 'TAIKO',
    logoURI: undefined, // Add logo URI if available
    tags: ['taiko']
  },
  {
    chainId: ChainId.GWYNETH,
    address: '0xe7a62ae99A4AFf6d389233720352e3379F2Be251',
    name: 'Cheese Token',
    decimals: 18,
    symbol: 'CHEESE',
    logoURI: undefined, // Add logo URI if available
    tags: ['cheese']
  },
  {
    chainId: ChainId.GWYNETH,
    address: '0x12BEFBCED4fCC6c2b854d34c7e0906F50143EDff',
    name: 'Wrapped Ether',
    decimals: 18,
    symbol: 'WETH',
    logoURI: undefined, // Add logo URI if available
    tags: ['wrapped', 'weth']
  }
]

const GWYNETH_L2A_TOKENS: TokenInfo[] = [
  {
  chainId: ChainId.GWYNETH_L2A,
  address: '0xDE68f4ED350A914c2d9279d4bc38A4549A41c5d1',
  name: 'Sloth Token',
  decimals: 18,
  symbol: 'SLOTH',
  logoURI: undefined, // Add logo URI if available
  tags: ['sloth']
},
  {
    chainId: ChainId.GWYNETH_L2A,
    address: '0x497664eD3164Ff894CEdDB28C24C181e830C621f',
    name: 'Taiko Token',
    decimals: 18,
    symbol: 'TAIKO',
    logoURI: undefined, // Add logo URI if available
    tags: ['taiko']
  },
  {
    chainId: ChainId.GWYNETH_L2A,
    address: '0xe7a62ae99A4AFf6d389233720352e3379F2Be251',
    name: 'Cheese Token',
    decimals: 18,
    symbol: 'CHEESE',
    logoURI: undefined, // Add logo URI if available
    tags: ['cheese']
  },
  {
    chainId: ChainId.GWYNETH_L2A,
    address: '0x12BEFBCED4fCC6c2b854d34c7e0906F50143EDff',
    name: 'Wrapped Ether',
    decimals: 18,
    symbol: 'WETH',
    logoURI: undefined, // Add logo URI if available
    tags: ['wrapped', 'weth']
  }
]

// Define the GWYNETH tokens
const SEPOLIA_TOKENS: TokenInfo[] = [
  {
    chainId: ChainId.SEPOLIA,
    address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
    name: 'Wrapped Ether',
    decimals: 18,
    symbol: 'WETH',
    logoURI: undefined, // Add logo URI if available
    tags: ['wrapped', 'weth']
  }
]


const GWYNETH_L2B_TOKENS: TokenInfo[] = [
  {
  chainId: ChainId.GWYNETH_L2B,
  address: '0xDE68f4ED350A914c2d9279d4bc38A4549A41c5d1',
  name: 'Sloth Token',
  decimals: 18,
  symbol: 'SLOTH',
  logoURI: undefined, // Add logo URI if available
  tags: ['sloth']
},
  {
    chainId: ChainId.GWYNETH_L2B,
    address: '0x497664eD3164Ff894CEdDB28C24C181e830C621f',
    name: 'Taiko Token',
    decimals: 18,
    symbol: 'TAIKO',
    logoURI: undefined, // Add logo URI if available
    tags: ['taiko']
  },
  {
    chainId: ChainId.GWYNETH_L2B,
    address: '0xe7a62ae99A4AFf6d389233720352e3379F2Be251',
    name: 'Cheese Token',
    decimals: 18,
    symbol: 'CHEESE',
    logoURI: undefined, // Add logo URI if available
    tags: ['cheese']
  },
  {
    chainId: ChainId.GWYNETH_L2B,
    address: '0x12BEFBCED4fCC6c2b854d34c7e0906F50143EDff',
    name: 'Wrapped Ether',
    decimals: 18,
    symbol: 'WETH',
    logoURI: undefined, // Add logo URI if available
    tags: ['wrapped', 'weth']
  }
]

// Convert TokenInfo array to TokenAddressMap format
const GWYNETH_TOKEN_MAP = GWYNETH_TOKENS.reduce<{ [tokenAddress: string]: WrappedTokenInfo }>((acc, tokenInfo) => {
  acc[tokenInfo.address] = new WrappedTokenInfo(tokenInfo, [])
  return acc
}, {})

const GWYNETH_L2A_TOKEN_MAP = GWYNETH_L2A_TOKENS.reduce<{ [tokenAddress: string]: WrappedTokenInfo }>((acc, tokenInfo) => {
  acc[tokenInfo.address] = new WrappedTokenInfo(tokenInfo, [])
  return acc
}, {})

const GWYNETH_L2B_TOKEN_MAP = GWYNETH_L2B_TOKENS.reduce<{ [tokenAddress: string]: WrappedTokenInfo }>((acc, tokenInfo) => {
  acc[tokenInfo.address] = new WrappedTokenInfo(tokenInfo, [])
  return acc
}, {})

const SEPOLIA_TOKEN_MAP = SEPOLIA_TOKENS.reduce<{ [tokenAddress: string]: WrappedTokenInfo }>((acc, tokenInfo) => {
  acc[tokenInfo.address] = new WrappedTokenInfo(tokenInfo, [])
  return acc
}, {})

/**
 * An empty result, useful as a default.
 */
const EMPTY_LIST: TokenAddressMap = {
  [ChainId.KOVAN]: {},
  [ChainId.RINKEBY]: {},
  [ChainId.ROPSTEN]: {},
  [ChainId.GÖRLI]: {},
  [ChainId.MAINNET]: {},
  [ChainId.GWYNETH]: GWYNETH_TOKEN_MAP,
  [ChainId.GWYNETH_L2A]: GWYNETH_L2A_TOKEN_MAP,
  [ChainId.GWYNETH_L2B]: GWYNETH_L2B_TOKEN_MAP,
  [ChainId.SEPOLIA]: SEPOLIA_TOKEN_MAP,
  [ChainId.HOODI]: {}
}

const listCache: WeakMap<TokenList, TokenAddressMap> | null =
  typeof WeakMap !== 'undefined' ? new WeakMap<TokenList, TokenAddressMap>() : null

export function listToTokenMap(list: TokenList): TokenAddressMap {
  const result = listCache?.get(list)
  if (result) return result

  const map = list.tokens.reduce<TokenAddressMap>(
    (tokenMap, tokenInfo) => {
      const tags: TagInfo[] =
        tokenInfo.tags
          ?.map(tagId => {
            if (!list.tags?.[tagId]) return undefined
            return { ...list.tags[tagId], id: tagId }
          })
          ?.filter((x): x is TagInfo => Boolean(x)) ?? []
      const token = new WrappedTokenInfo(tokenInfo, tags)
      if (tokenMap[token.chainId][token.address] !== undefined) throw Error('Duplicate tokens.')
      return {
        ...tokenMap,
        [token.chainId]: {
          ...tokenMap[token.chainId],
          [token.address]: token
        }
      }
    },
    { ...EMPTY_LIST }
  )
  listCache?.set(list, map)
  return map
}

export function useTokenList(url: string | undefined): TokenAddressMap {
  const lists = useSelector<AppState, AppState['lists']['byUrl']>(state => state.lists.byUrl)
  return useMemo(() => {
    if (!url) return EMPTY_LIST
    const current = lists[url]?.current
    if (!current) return EMPTY_LIST
    try {
      return listToTokenMap(current)
    } catch (error) {
      console.error('Could not show token list due to error', error)
      return EMPTY_LIST
    }
  }, [lists, url])
}

export function useSelectedListUrl(): string | undefined {
  return useSelector<AppState, AppState['lists']['selectedListUrl']>(state => state.lists.selectedListUrl)
}

export function useSelectedTokenList(): TokenAddressMap {
  return useTokenList(useSelectedListUrl())
}

export function useSelectedListInfo(): { current: TokenList | null; pending: TokenList | null; loading: boolean } {
  const selectedUrl = useSelectedListUrl()
  const listsByUrl = useSelector<AppState, AppState['lists']['byUrl']>(state => state.lists.byUrl)
  const list = selectedUrl ? listsByUrl[selectedUrl] : undefined
  return {
    current: list?.current ?? null,
    pending: list?.pendingUpdate ?? null,
    loading: list?.loadingRequestId !== null
  }
}

// returns all downloaded current lists
export function useAllLists(): TokenList[] {
  const lists = useSelector<AppState, AppState['lists']['byUrl']>(state => state.lists.byUrl)

  return useMemo(
    () =>
      Object.keys(lists)
        .map(url => lists[url].current)
        .filter((l): l is TokenList => Boolean(l)),
    [lists]
  )
}
