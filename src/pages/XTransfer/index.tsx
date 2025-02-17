import React, { useState, useCallback } from 'react'
import styled from 'styled-components'
import { ButtonError } from '../../components/Button'
import { AutoColumn } from '../../components/Column'
import { SwapPoolTabs } from '../../components/NavigationTabs'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import AppBody from '../AppBody'
import { Wrapper } from '../Pool/styleds'
import { useActiveWeb3React } from '../../hooks'
import { Currency, Token } from '@uniswap/sdk'
import { Text } from 'rebass'
import { parseUnits } from '@ethersproject/units'
import { useXTransferCallback, XTransferCallbackState } from '../../hooks/useXTransferCallback'
import { useNetworkChangeHandler } from '../../hooks/useNetworkChangeHandler'

const InputPanel = styled.div`
  ${({ theme }) => theme.flexColumnNoWrap}
  position: relative;
  border-radius: 20px;
  background-color: ${({ theme }) => theme.bg1};
  z-index: 1;
  width: 100%;
`

const Container = styled.div`
  border-radius: 20px;
  border: 1px solid ${({ theme }) => theme.bg2};
  background-color: ${({ theme }) => theme.bg1};
`

const LabelRow = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: center;
  color: ${({ theme }) => theme.text1};
  font-size: 0.75rem;
  line-height: 1rem;
  padding: 0.75rem 1rem 0 1rem;
  span:hover {
    cursor: pointer;
    color: ${({ theme }) => theme.text2};
  }
`

const InputRow = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: center;
  padding: 0.75rem 0.5rem 0.75rem 1rem;
`

const StyledInput = styled.input`
  position: relative;
  display: flex;
  padding: 16px;
  align-items: center;
  width: 100%;
  white-space: nowrap;
  background: none;
  border: none;
  outline: none;
  border-radius: 20px;
  color: ${({ theme }) => theme.text1};
  border-style: none;
  font-size: 18px;
  ::placeholder {
    color: ${({ theme }) => theme.text4};
  }
`

const ChainSelect = styled.select`
  width: 100%;
  padding: 16px;
  border-radius: 20px;
  background-color: ${({ theme }) => theme.primary1};
  border: none;
  color: white;
  cursor: pointer;
  font-size: 16px;
  -webkit-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='7' viewBox='0 0 12 7' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0.97168 1L6.20532 6L11.439 1' stroke='white' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 20px center;

  &:focus {
    outline: none;
    box-shadow: none;
  }

  &:hover {
    opacity: 0.9;
  }

  option {
    color: ${({ theme }) => theme.text1};
    background: ${({ theme }) => theme.bg1};
    padding: 20px;
  }
`

type ChainOption = {
  id: number
  name: string
}

const CHAIN_OPTIONS: ChainOption[] = [
  { id: 167010, name: 'Gwyneth L2A' },
  { id: 167011, name: 'Gwyneth L2B' }
]

export default function XTransfer() {
  const { account, chainId } = useActiveWeb3React()
  useNetworkChangeHandler()
  
  const [amount, setAmount] = useState('')
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null)
  const [recipient, setRecipient] = useState(account ?? '')
  const [destinationChain, setDestinationChain] = useState<number | undefined>()
  const [transferState, setTransferState] = useState<{
    attempting: boolean;
    error: string | null;
    txHash?: string;
  }>({
    attempting: false,
    error: null,
  })

  const availableChains = CHAIN_OPTIONS.filter(chain => chain.id !== chainId)

  const parsedAmount = selectedCurrency && amount 
    ? parseUnits(amount, selectedCurrency.decimals)
    : undefined

  // Check if the selected currency is ETH by checking if it's not a Token instance
  const isETH = selectedCurrency && !(selectedCurrency instanceof Token)

  const { state: xTransferState, callback: xTransferCallback, error: xTransferError } = useXTransferCallback(
    isETH 
      ? 'ETH'
      : selectedCurrency instanceof Token 
        ? selectedCurrency.address 
        : undefined,
    destinationChain,
    recipient,
    parsedAmount
  )

  const handleCurrencySelect = useCallback((currency: Currency) => {
    setSelectedCurrency(currency)
  }, [])

  const handleXTransfer = async () => {
    if (!xTransferCallback) return
  
    setTransferState({ attempting: true, error: null })
    try {
      const txHash = await xTransferCallback()
      setTransferState({ 
        attempting: false, 
        error: null,
        txHash 
      })
      setAmount('')
    } catch (err) {
      const error = err as Error
      console.error('XTransfer failed:', error)
      setTransferState({
        attempting: false,
        error: error.message || 'Failed to transfer',
        txHash: undefined
      })
    }
  }

  // Get validation message based on current state
  const getValidationMessage = (): string | null => {
    if (!account) return 'Connect wallet to transfer'
    if (!selectedCurrency) return 'Select a token or ETH'
    if (!amount || parseFloat(amount) <= 0) return 'Enter amount'
    if (!recipient) return 'Enter recipient address'
    if (!destinationChain) return 'Select destination chain'
    if (xTransferState === XTransferCallbackState.INVALID) return null
    return null
  }

  const validationMessage = getValidationMessage()
  const isTransferDisabled = !!validationMessage || transferState.attempting

  const getButtonText = () => {
    if (transferState.attempting) return 'Transferring...'
    if (transferState.error) return transferState.error
    if (validationMessage) return validationMessage
    return `Transfer ${isETH ? 'ETH' : 'Token'}`
  }

  return (
    <>
      <AppBody>
        <SwapPoolTabs active={'xtransfer'} />
        <Wrapper>
          <AutoColumn gap="20px">
            <CurrencyInputPanel
              label="Amount"
              value={amount}
              onUserInput={setAmount}
              onCurrencySelect={handleCurrencySelect}
              showMaxButton={true}
              currency={selectedCurrency}
              id="xtransfer-input"
              showCommonBases={true}
            />

            <InputPanel>
              <Container>
                <LabelRow>
                  <Text fontSize={14}>Recipient Address</Text>
                </LabelRow>
                <InputRow>
                  <StyledInput
                    placeholder="0x..."
                    value={recipient}
                    onChange={e => setRecipient(e.target.value)}
                  />
                </InputRow>
              </Container>
            </InputPanel>

            <InputPanel>
              <Container>
                <LabelRow>
                  <Text fontSize={14}>Destination Chain</Text>
                </LabelRow>
                <InputRow>
                  <ChainSelect
                    value={destinationChain || ''}
                    onChange={e => setDestinationChain(Number(e.target.value))}
                  >
                    <option value="">Select Destination Chain</option>
                    {availableChains.map(chain => (
                      <option key={chain.id} value={chain.id}>
                        {chain.name}
                      </option>
                    ))}
                  </ChainSelect>
                </InputRow>
              </Container>
            </InputPanel>

            <ButtonError
              onClick={handleXTransfer}
              disabled={isTransferDisabled}
              error={!!transferState.error}
            >
              <Text fontSize={20} fontWeight={500}>
                {getButtonText()}
              </Text>
            </ButtonError>

            {transferState.txHash && (
              <Text color="green" fontSize={14} style={{ textAlign: 'center' }}>
                Transaction submitted
              </Text>
            )}

            {xTransferError && !transferState.error && !validationMessage && (
              <Text color="red" fontSize={14} style={{ textAlign: 'center' }}>
                {xTransferError}
              </Text>
            )}
          </AutoColumn>
        </Wrapper>
      </AppBody>
    </>
  )
}