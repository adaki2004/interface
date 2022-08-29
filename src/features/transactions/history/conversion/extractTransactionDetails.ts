import { ChainId } from 'src/constants/chains'
import parseAppoveTransaction from 'src/features/transactions/history/conversion/parseApproveTransaction'
import parseNFTMintTransction from 'src/features/transactions/history/conversion/parseMintTransaction'
import parseReceiveTransaction from 'src/features/transactions/history/conversion/parseReceiveTransaction'
import parseSendTransaction from 'src/features/transactions/history/conversion/parseSendTransaction'

import parseTradeTransaction from 'src/features/transactions/history/conversion/parseTradeTransaction'
import { TransactionHistoryResponse } from 'src/features/transactions/history/transactionHistory'
import {
  TransactionDetails,
  TransactionStatus,
  TransactionType,
  TransactionTypeInfo,
} from 'src/features/transactions/types'

/**
 * Parses txn API response item and identifies known txn type. Helps strictly
 * type txn summary dat to be used within UI.
 *
 * @param transaction Transaction api response item to parse.
 * @returns Formatted TransactionDetails object.
 */
export default function extractTransactionDetails(
  transaction: Nullable<TransactionHistoryResponse>
): TransactionDetails | null {
  if (!transaction) return null

  let typeInfo: TransactionTypeInfo | undefined
  switch (transaction.type) {
    case 'APPROVE':
      typeInfo = parseAppoveTransaction(transaction)
      break
    case 'SEND':
      typeInfo = parseSendTransaction(transaction)
      break
    case 'RECEIVE':
      typeInfo = parseReceiveTransaction(transaction)
      break
    case 'SWAP':
      typeInfo = parseTradeTransaction(transaction)
      break
    case 'MINT':
      typeInfo = parseNFTMintTransction(transaction)
      break
  }

  // No match found, ddefault to unknown.
  if (!typeInfo) {
    typeInfo = {
      type: TransactionType.Unknown,
      tokenAddress: transaction.transaction.to,
    }
  }

  return {
    id: transaction.transaction.hash,
    // @TODO: update with chainId from txn when backened supports other networks
    chainId: ChainId.Mainnet,
    hash: transaction.transaction.hash,
    addedTime: transaction.timestamp * 1000, // convert to ms
    status: TransactionStatus.Success,
    from: transaction.transaction.from,
    typeInfo,
    options: { request: {} }, // Empty request is okay, gate re-submissions on txn type and status.
  }
}
