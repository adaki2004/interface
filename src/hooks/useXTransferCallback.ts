import { BigNumber } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'
import { useActiveWeb3React } from '../hooks'
import { useTransactionAdder } from '../state/transactions/hooks'
import { useMemo } from 'react'
import { calculateGasMargin } from '../utils'

// Similar state enum as swap
export enum XTransferCallbackState {
  INVALID,
  LOADING,
  VALID
}

const XERC20_ABI = [
  'function xTransfer(uint256 fromChain, uint256 toChain, address to, uint256 value) public returns (uint256)',
  'function sendETH(uint256 chain, address payable to) external payable'
]

// ETH xERC20 contract address
const ETH_XERC20_ADDRESS = '0x534cf76b8d56ab71cac1c211c9b38c81ca8e4b45'

// returns a function that will execute an xTransfer or sendETH, if the parameters are all valid
export function useXTransferCallback(
  tokenAddress: string | undefined, // address of the xERC20 token or 'ETH' for ETH transfers
  toChainId: number | undefined, // destination chain
  recipient: string | undefined, // recipient address
  amount: BigNumber | undefined // amount to transfer
): {
  state: XTransferCallbackState
  callback: null | (() => Promise<string>)
  error: string | null
} {
  const { account, chainId, library } = useActiveWeb3React()
  const addTransaction = useTransactionAdder()

  return useMemo(() => {
    if (!library || !account || !chainId || !toChainId || !recipient || !amount) {
      return {
        state: XTransferCallbackState.INVALID,
        callback: null,
        error: 'Missing dependencies'
      }
    }

    // Handle both ETH and token transfers
    const isETH = tokenAddress === 'ETH'
    const contractAddress = isETH ? ETH_XERC20_ADDRESS : tokenAddress

    if (!contractAddress) {
      return {
        state: XTransferCallbackState.INVALID,
        callback: null,
        error: 'Invalid token address'
      }
    }

    return {
      state: XTransferCallbackState.VALID,
      callback: async function onXTransfer(): Promise<string> {
        const contract = new Contract(contractAddress, XERC20_ABI, library.getSigner())
        
        if (isETH) {
          // ETH transfer
          const args = [toChainId, recipient]
          
          // Estimate gas for ETH transfer
          const estimatedGas = await contract.estimateGas.sendETH(...args, { value: amount })
            .catch((error: Error) => {
              console.debug('Failed to estimate gas for sendETH', error)
              throw new Error('Unable to estimate gas for ETH transfer')
            })

          return contract.sendETH(...args, {
            gasLimit: calculateGasMargin(estimatedGas),
            value: amount
          })
            .then((response: any) => {
              addTransaction(response, {
                summary: `Cross-chain transfer of ${amount.toString()} ETH to chain ${toChainId}`
              })
              return response.hash
            })
            .catch((error: any) => {
              if (error?.code === 4001) {
                throw new Error('Transaction rejected.')
              } else {
                console.error(`ETH transfer failed`, error)
                throw new Error(`ETH transfer failed: ${error.message}`)
              }
            })
        } else {
          // Token transfer
          const args = [chainId, toChainId, recipient, amount.toString()]
          
          // Estimate gas for token transfer
          const estimatedGas = await contract.estimateGas.xTransfer(...args)
            .catch((error: Error) => {
              console.debug('Failed to estimate gas for xTransfer', error)
              throw new Error('Unable to estimate gas for token transfer')
            })

          return contract.xTransfer(...args, {
            gasLimit: calculateGasMargin(estimatedGas)
          })
            .then((response: any) => {
              addTransaction(response, {
                summary: `Cross-chain transfer of ${amount.toString()} tokens to chain ${toChainId}`
              })
              return response.hash
            })
            .catch((error: any) => {
              if (error?.code === 4001) {
                throw new Error('Transaction rejected.')
              } else {
                console.error(`Token transfer failed`, error)
                throw new Error(`Token transfer failed: ${error.message}`)
              }
            })
        }
      },
      error: null
    }
  }, [tokenAddress, toChainId, recipient, amount, chainId, library, account, addTransaction])
}