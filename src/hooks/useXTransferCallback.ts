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
  'function xTransfer(uint256 fromChain, uint256 toChain, address to, uint256 value) public returns (uint256)'
]

// returns a function that will execute an xTransfer, if the parameters are all valid
export function useXTransferCallback(
  tokenAddress: string | undefined, // address of the xERC20 token
  toChainId: number | undefined,   // destination chain
  recipient: string | undefined,   // recipient address
  amount: BigNumber | undefined    // amount to transfer
): { state: XTransferCallbackState; callback: null | (() => Promise<string>); error: string | null } {
  const { account, chainId, library } = useActiveWeb3React()
  const addTransaction = useTransactionAdder()

  return useMemo(() => {
    if (!tokenAddress || !library || !account || !chainId || !toChainId || !recipient || !amount) {
      return { state: XTransferCallbackState.INVALID, callback: null, error: 'Missing dependencies' }
    }

    return {
      state: XTransferCallbackState.VALID,
      callback: async function onXTransfer(): Promise<string> {
        const tokenContract = new Contract(tokenAddress, XERC20_ABI, library.getSigner())
        const args = [chainId, toChainId, recipient, amount.toString()]

        // First estimate gas
        const estimatedGas = await tokenContract.estimateGas.xTransfer(...args)
          .catch((error: Error) => {
            console.debug('Failed to estimate gas for xTransfer', error)
            throw new Error('Unable to estimate gas for xTransfer')
          })

        return tokenContract.xTransfer(...args, {
          gasLimit: calculateGasMargin(estimatedGas)
        })
          .then((response: any) => {
            addTransaction(response, {
              summary: `Cross-chain transfer of ${amount.toString()} tokens to chain ${toChainId}`
            })
            return response.hash
          })
          .catch((error: any) => {
            // if the user rejected the tx, pass this along
            if (error?.code === 4001) {
              throw new Error('Transaction rejected.')
            } else {
              console.error(`XTransfer failed`, error)
              throw new Error(`XTransfer failed: ${error.message}`)
            }
          })
      },
      error: null
    }
  }, [tokenAddress, toChainId, recipient, amount, chainId, library, account, addTransaction])
}