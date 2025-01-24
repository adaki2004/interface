import { MaxUint256 } from '@ethersproject/constants'
import { TransactionResponse } from '@ethersproject/providers'
import { Trade, TokenAmount, CurrencyAmount, ETHER, currencyEquals } from '@uniswap/sdk'
import { useCallback, useMemo } from 'react'
import { ROUTER_ADDRESS } from '../constants'
import { useTokenAllowance } from '../data/Allowances'
import { getTradeVersion, useV1TradeExchangeAddress } from '../data/V1'
import { Field } from '../state/swap/actions'
import { useTransactionAdder, useHasPendingApproval } from '../state/transactions/hooks'
import { computeSlippageAdjustedAmounts } from '../utils/prices'
import { calculateGasMargin } from '../utils'
import { useTokenContract } from './useContract'
import { useActiveWeb3React } from './index'
import { Version } from './useToggledVersion'

export enum ApprovalState {
  UNKNOWN,
  NOT_APPROVED,
  PENDING,
  APPROVED
}

// First add the constants at the top
const UNISWAP_PORTAL_ADDRESS = '0x84FB3688D1ee5dCD0137746A07290f8bE55ec04E'
const L2_CHAIN_IDS = {
  L2A: 167010,
  L2B: 167011
}

// Add helper functions
const isL2Chain = (chainId?: number): boolean => {
  return chainId === L2_CHAIN_IDS.L2A || chainId === L2_CHAIN_IDS.L2B
}

const isTokenToTokenSwap = (trade: Trade | undefined): boolean => {
  if (!trade) return false
  return !currencyEquals(trade.inputAmount.currency, ETHER) && 
         !currencyEquals(trade.outputAmount.currency, ETHER)
}


// returns a variable indicating the state of the approval and a function which approves if necessary or early returns
export function useApproveCallback(
  amountToApprove?: CurrencyAmount,
  spender?: string
): [ApprovalState, () => Promise<void>] {
  const { account } = useActiveWeb3React()
  const token = amountToApprove instanceof TokenAmount ? amountToApprove.token : undefined
  const currentAllowance = useTokenAllowance(token, account ?? undefined, spender)
  const pendingApproval = useHasPendingApproval(token?.address, spender)

  // check the current approval status
  const approvalState: ApprovalState = useMemo(() => {
    if (!amountToApprove || !spender) return ApprovalState.UNKNOWN
    if (amountToApprove.currency === ETHER) return ApprovalState.APPROVED
    // we might not have enough data to know whether or not we need to approve
    if (!currentAllowance) return ApprovalState.UNKNOWN

    // amountToApprove will be defined if currentAllowance is
    return currentAllowance.lessThan(amountToApprove)
      ? pendingApproval
        ? ApprovalState.PENDING
        : ApprovalState.NOT_APPROVED
      : ApprovalState.APPROVED
  }, [amountToApprove, currentAllowance, pendingApproval, spender])

  const tokenContract = useTokenContract(token?.address)
  const addTransaction = useTransactionAdder()

  const approve = useCallback(async (): Promise<void> => {
    if (approvalState !== ApprovalState.NOT_APPROVED) {
      console.error('approve was called unnecessarily')
      return
    }
    if (!token) {
      console.error('no token')
      return
    }

    if (!tokenContract) {
      console.error('tokenContract is null')
      return
    }

    if (!amountToApprove) {
      console.error('missing amount to approve')
      return
    }

    if (!spender) {
      console.error('no spender')
      return
    }

    let useExact = false
    const estimatedGas = await tokenContract.estimateGas.approve(spender, MaxUint256).catch(() => {
      // general fallback for tokens who restrict approval amounts
      useExact = true
      return tokenContract.estimateGas.approve(spender, amountToApprove.raw.toString())
    })

    return tokenContract
      .approve(spender, useExact ? amountToApprove.raw.toString() : MaxUint256, {
        gasLimit: calculateGasMargin(estimatedGas)
      })
      .then((response: TransactionResponse) => {
        addTransaction(response, {
          summary: 'Approve ' + amountToApprove.currency.symbol,
          approval: { tokenAddress: token.address, spender: spender }
        })
      })
      .catch((error: Error) => {
        console.debug('Failed to approve token', error)
        throw error
      })
  }, [approvalState, token, tokenContract, amountToApprove, spender, addTransaction])

  return [approvalState, approve]
}

export function useApproveCallbackFromTrade(trade?: Trade, allowedSlippage = 0) {
  const { chainId } = useActiveWeb3React()
  const v1TradeExchangeAddress = useV1TradeExchangeAddress(trade) // Move this outside
  
  const amountToApprove = useMemo(
    () => (trade ? computeSlippageAdjustedAmounts(trade, allowedSlippage)[Field.INPUT] : undefined),
    [trade, allowedSlippage]
  )

  const spenderAddress = useMemo(() => {
    if (!trade) return undefined
    
    // Use Portal contract for token-token swaps on L2
    if (isL2Chain(chainId) && isTokenToTokenSwap(trade)) {
      return UNISWAP_PORTAL_ADDRESS
    }
    
    // Otherwise use original logic
    const tradeIsV1 = getTradeVersion(trade) === Version.v1
    return tradeIsV1 ? v1TradeExchangeAddress : ROUTER_ADDRESS // Use the hook result here
  }, [trade, chainId, v1TradeExchangeAddress]) // Add to dependencies

  return useApproveCallback(amountToApprove, spenderAddress)
}
