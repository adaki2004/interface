import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useActiveWeb3React } from '../../hooks'
import { useAddPopup, useBlockNumber } from '../application/hooks'
import { AppDispatch, AppState } from '../index'
import { checkedTransaction, finalizeTransaction } from './actions'
import { invalidateMulticallResults, toCallKey } from '../multicall/actions'
import { Interface } from '@ethersproject/abi'

// ERC20 interface for creating balanceOf call keys
const ERC20_INTERFACE = new Interface([
  'function balanceOf(address account) view returns (uint256)'
])

// Helper function to create balanceOf call key
function createBalanceOfCallKey(tokenAddress: string, accountAddress: string): string {
  const callData = ERC20_INTERFACE.encodeFunctionData('balanceOf', [accountAddress])
  return toCallKey({
    address: tokenAddress.toLowerCase(),
    callData: callData.toLowerCase()
  })
}

// Helper function to extract tokens affected by a transaction
function getAffectedTokens(tx: any, userAddress: string): string[] {
  const tokens: string[] = []
  
  // For approval transactions, the token being approved is affected
  if (tx.approval?.tokenAddress) {
    tokens.push(tx.approval.tokenAddress)
  }
  
  // For swap transactions, we need to invalidate common swap token pairs
  // This is a heuristic since we don't have exact swap details
  if (tx.summary?.toLowerCase().includes('swap')) {
    // Common tokens on this L2A chain
    const COMMON_TOKENS = [
      '0x497664eD3164Ff894CEdDB28C24C181e830C621f', // TAIKO
      '0xe7a62ae99A4AFf6d389233720352e3379F2Be251'  // CHEESE
    ]
    tokens.push(...COMMON_TOKENS)
  }
  
  return tokens.filter((token, index, arr) => arr.indexOf(token) === index) // Remove duplicates
}

export function shouldCheck(
  lastBlockNumber: number,
  tx: { addedTime: number; receipt?: {}; lastCheckedBlockNumber?: number }
): boolean {
  if (tx.receipt) return false
  if (!tx.lastCheckedBlockNumber) return true
  const blocksSinceCheck = lastBlockNumber - tx.lastCheckedBlockNumber
  if (blocksSinceCheck < 1) return false
  const minutesPending = (new Date().getTime() - tx.addedTime) / 1000 / 60
  if (minutesPending > 60) {
    // every 10 blocks if pending for longer than an hour
    return blocksSinceCheck > 9
  } else if (minutesPending > 5) {
    // every 3 blocks if pending more than 5 minutes
    return blocksSinceCheck > 2
  } else {
    // otherwise every block
    return true
  }
}

export default function Updater(): null {
  const { chainId, library, account } = useActiveWeb3React()

  const lastBlockNumber = useBlockNumber()

  const dispatch = useDispatch<AppDispatch>()
  const state = useSelector<AppState, AppState['transactions']>(state => state.transactions)

  const transactions = chainId ? state[chainId] ?? {} : {}

  // show popup on confirm
  const addPopup = useAddPopup()

  useEffect(() => {
    if (!chainId || !library || !lastBlockNumber) return

    Object.keys(transactions)
      .filter(hash => shouldCheck(lastBlockNumber, transactions[hash]))
      .forEach(hash => {
        library
          .getTransactionReceipt(hash)
          .then(receipt => {
            if (receipt) {
              dispatch(
                finalizeTransaction({
                  chainId,
                  hash,
                  receipt: {
                    blockHash: receipt.blockHash,
                    blockNumber: receipt.blockNumber,
                    contractAddress: receipt.contractAddress,
                    from: receipt.from,
                    status: receipt.status,
                    to: receipt.to,
                    transactionHash: receipt.transactionHash,
                    transactionIndex: receipt.transactionIndex
                  }
                })
              )

              // Invalidate multicall cache for affected tokens
              if (receipt.status === 1 && account) { // Only for successful transactions
                const tx = transactions[hash]
                const affectedTokens = getAffectedTokens(tx, account)
                
                if (affectedTokens.length > 0) {
                  const callKeysToInvalidate = affectedTokens.map(tokenAddress => 
                    createBalanceOfCallKey(tokenAddress, account)
                  )
                  
                  console.log('Invalidating multicall cache for successful transaction:', {
                    hash,
                    summary: tx?.summary,
                    affectedTokens,
                    callKeysToInvalidate: callKeysToInvalidate.length
                  })
                  
                  dispatch(invalidateMulticallResults({
                    chainId,
                    callKeys: callKeysToInvalidate
                  }))
                }
              }

              addPopup(
                {
                  txn: {
                    hash,
                    success: receipt.status === 1,
                    summary: transactions[hash]?.summary
                  }
                },
                hash
              )
            } else {
              dispatch(checkedTransaction({ chainId, hash, blockNumber: lastBlockNumber }))
            }
          })
          .catch(error => {
            console.error(`failed to check transaction hash: ${hash}`, error)
          })
      })
  }, [chainId, library, transactions, lastBlockNumber, dispatch, addPopup])

  return null
}
