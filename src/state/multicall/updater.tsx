import { Contract } from '@ethersproject/contracts'
import { useEffect, useMemo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useActiveWeb3React } from '../../hooks'
import { useMulticallContract } from '../../hooks/useContract'
import useDebounce from '../../hooks/useDebounce'
import chunkArray from '../../utils/chunkArray'
import { CancelledError, retry, RetryableError } from '../../utils/retry'
import { useBlockNumber } from '../application/hooks'
import { AppDispatch, AppState } from '../index'
import {
  Call,
  errorFetchingMulticallResults,
  fetchingMulticallResults,
  parseCallKey,
  updateMulticallResults
} from './actions'

// chunk calls so we do not exceed the gas limit
const CALL_CHUNK_SIZE = 500

/**
 * Fetches a chunk of calls, enforcing a minimum block number constraint
 * @param multicallContract multicall contract to fetch against
 * @param chunk chunk of calls to make
 * @param minBlockNumber minimum block number of the result set
 */
async function fetchChunk(
  multicallContract: Contract,
  chunk: Call[],
  minBlockNumber: number
): Promise<{ results: string[]; blockNumber: number }> {
  // Detailed logging of each call
  const detailedCalls = chunk.map(call => {
    const functionSig = call.callData.substring(0, 10)
    
    // Common function signatures to decode
    const knownSigs: { [key: string]: string } = {
      '0x70a08231': 'balanceOf(address)',
      '0x18160ddd': 'totalSupply()',
      '0x0902f1ac': 'getReserves()',
      '0x06fdde03': 'name()',
      '0x95d89b41': 'symbol()',
      '0x313ce567': 'decimals()',
      '0xdd62ed3e': 'allowance(address,address)',
      '0x1f00ca74': 'getLastBlockHash()',
      '0x252dba42': 'aggregate((address,bytes)[])'
    }
    
    return {
      address: call.address,
      callData: call.callData,
      functionSig: functionSig,
      decodedFunction: knownSigs[functionSig] || 'unknown',
      dataLength: call.callData.length
    }
  })

  console.log('📞 MULTICALL CHUNK DETAILED:', {
    multicallAddress: multicallContract.address,
    chunkSize: chunk.length,
    minBlockNumber,
    calls: detailedCalls
  })
  
  // Group calls by contract address for easier analysis
  const callsByContract: { [address: string]: any[] } = {}
  detailedCalls.forEach(call => {
    if (!callsByContract[call.address]) {
      callsByContract[call.address] = []
    }
    callsByContract[call.address].push({
      function: call.decodedFunction,
      sig: call.functionSig,
      data: call.callData
    })
  })
  
  console.log('📊 CALLS GROUPED BY CONTRACT:', callsByContract)
  
  let resultsBlockNumber, returnData
  try {
    const aggregateCall = chunk.map(obj => [obj.address, obj.callData])
    console.log('🔄 Calling multicall.aggregate with:', {
      aggregateCall: aggregateCall.slice(0, 3), // Show first 3 for brevity
      totalCalls: aggregateCall.length
    })
    
    ;[resultsBlockNumber, returnData] = await multicallContract.aggregate(aggregateCall)
    
    console.log('✅ MULTICALL SUCCESS:', {
      blockNumber: resultsBlockNumber.toNumber(),
      resultCount: returnData.length,
      results: returnData.slice(0, 3).map((r: string) => `${r.substring(0, 20)}...`) // Show first 3 results truncated
    })
  } catch (error) {
    console.error('❌ MULTICALL ERROR:', {
      error: error?.message || error,
      code: error?.code,
      multicallAddress: multicallContract.address,
      callCount: chunk.length
    })
    throw error
  }
  if (resultsBlockNumber.toNumber() < minBlockNumber) {
    console.debug(`Fetched results for old block number: ${resultsBlockNumber.toString()} vs. ${minBlockNumber}`)
    throw new RetryableError('Fetched for old block number')
  }
  return { results: returnData, blockNumber: resultsBlockNumber.toNumber() }
}

/**
 * From the current all listeners state, return each call key mapped to the
 * minimum number of blocks per fetch. This is how often each key must be fetched.
 * @param allListeners the all listeners state
 * @param chainId the current chain id
 */
export function activeListeningKeys(
  allListeners: AppState['multicall']['callListeners'],
  chainId?: number
): { [callKey: string]: number } {
  if (!allListeners || !chainId) return {}
  const listeners = allListeners[chainId]
  if (!listeners) return {}

  return Object.keys(listeners).reduce<{ [callKey: string]: number }>((memo, callKey) => {
    const keyListeners = listeners[callKey]

    memo[callKey] = Object.keys(keyListeners)
      .filter(key => {
        const blocksPerFetch = parseInt(key)
        if (blocksPerFetch <= 0) return false
        return keyListeners[blocksPerFetch] > 0
      })
      .reduce((previousMin, current) => {
        return Math.min(previousMin, parseInt(current))
      }, Infinity)
    return memo
  }, {})
}

/**
 * Return the keys that need to be refetched, filtering out V1 calls
 * @param callResults current call result state
 * @param listeningKeys each call key mapped to how old the data can be in blocks
 * @param chainId the current chain id
 * @param latestBlockNumber the latest block number
 */
export function outdatedListeningKeys(
  callResults: AppState['multicall']['callResults'],
  listeningKeys: { [callKey: string]: number },
  chainId: number | undefined,
  latestBlockNumber: number | undefined
): string[] {
  if (!chainId || !latestBlockNumber) return []
  const results = callResults[chainId]
  if (!results) return Object.keys(listeningKeys)

  return Object.keys(listeningKeys).filter(callKey => {
    // Filter out V1 calls including getExchange
    if (callKey.toLowerCase().includes('getexchange')) return false
    
    const blocksPerFetch = listeningKeys[callKey]
    const data = callResults[chainId][callKey]
    if (!data) return true

    const minDataBlockNumber = latestBlockNumber - (blocksPerFetch - 1)
    if (data.fetchingBlockNumber && data.fetchingBlockNumber >= minDataBlockNumber) return false

    return !data.blockNumber || data.blockNumber < minDataBlockNumber
  })
}

export default function Updater(): null {
  const dispatch = useDispatch<AppDispatch>()
  const state = useSelector<AppState, AppState['multicall']>(state => state.multicall)
  const debouncedListeners = useDebounce(state.callListeners, 100)
  const latestBlockNumber = useBlockNumber()
  const { chainId } = useActiveWeb3React()
  const multicallContract = useMulticallContract()
  const cancellations = useRef<{ blockNumber: number; cancellations: (() => void)[] }>()

  const listeningKeys: { [callKey: string]: number } = useMemo(() => {
    return activeListeningKeys(debouncedListeners, chainId)
  }, [debouncedListeners, chainId])

  const unserializedOutdatedCallKeys = useMemo(() => {
    return outdatedListeningKeys(state.callResults, listeningKeys, chainId, latestBlockNumber)
  }, [chainId, state.callResults, listeningKeys, latestBlockNumber])

  const serializedOutdatedCallKeys = useMemo(() => JSON.stringify(unserializedOutdatedCallKeys.sort()), [
    unserializedOutdatedCallKeys
  ])

  useEffect(() => {
    if (!latestBlockNumber || !chainId || !multicallContract) return

    const outdatedCallKeys: string[] = JSON.parse(serializedOutdatedCallKeys)
    if (outdatedCallKeys.length === 0) return
    const calls = outdatedCallKeys.map(key => parseCallKey(key))

    const chunkedCalls = chunkArray(calls, CALL_CHUNK_SIZE)

    if (cancellations.current?.blockNumber !== latestBlockNumber) {
      cancellations.current?.cancellations?.forEach(c => c())
    }

    dispatch(
      fetchingMulticallResults({
        calls,
        chainId,
        fetchingBlockNumber: latestBlockNumber
      })
    )

    cancellations.current = {
      blockNumber: latestBlockNumber,
      cancellations: chunkedCalls.map((chunk, index) => {
        const { cancel, promise } = retry(() => fetchChunk(multicallContract, chunk, latestBlockNumber), {
          n: Infinity,
          minWait: 2500,
          maxWait: 3500
        })
        promise
          .then(({ results: returnData, blockNumber: fetchBlockNumber }) => {
            cancellations.current = { cancellations: [], blockNumber: latestBlockNumber }

            const firstCallKeyIndex = chunkedCalls.slice(0, index).reduce<number>((memo, curr) => memo + curr.length, 0)
            const lastCallKeyIndex = firstCallKeyIndex + returnData.length

            dispatch(
              updateMulticallResults({
                chainId,
                results: outdatedCallKeys
                  .slice(firstCallKeyIndex, lastCallKeyIndex)
                  .reduce<{ [callKey: string]: string | null }>((memo, callKey, i) => {
                    memo[callKey] = returnData[i] ?? null
                    return memo
                  }, {}),
                blockNumber: fetchBlockNumber
              })
            )
          })
          .catch((error: any) => {
            if (error instanceof CancelledError) {
              console.debug('Cancelled fetch for blockNumber', latestBlockNumber)
              return
            }
            console.error('Failed to fetch multicall chunk', chunk, chainId, error)
            dispatch(
              errorFetchingMulticallResults({
                calls: chunk,
                chainId,
                fetchingBlockNumber: latestBlockNumber
              })
            )
          })
        return cancel
      })
    }
  }, [chainId, multicallContract, dispatch, serializedOutdatedCallKeys, latestBlockNumber])

  return null
}