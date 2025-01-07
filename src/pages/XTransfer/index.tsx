import React, { useState, useCallback } from 'react'
import styled from 'styled-components'
import { ButtonPrimary, ButtonError } from '../../components/Button'
import { AutoColumn } from '../../components/Column'
import { RowBetween } from '../../components/Row'
import { SwapPoolTabs } from '../../components/NavigationTabs'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import AppBody from '../AppBody'
import { Wrapper } from '../Pool/styleds'
import { useActiveWeb3React } from '../../hooks'
import { Currency } from '@uniswap/sdk'
// import { useCurrency } from '../../hooks/Tokens'
// import { TYPE } from '../../theme'
import { Text } from 'rebass'
import { useWalletModalToggle } from '../../state/application/hooks'

enum View {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw'
}

const ToggleWrapper = styled(RowBetween)`
  padding: 1rem;
  margin-bottom: 1rem;
`

const ToggleButton = styled.button<{ active: boolean }>`
  border-radius: 12px;
  padding: 0.5rem 1rem;
  background: ${({ active, theme }) => active ? theme.primary1 : 'transparent'};
  color: ${({ active, theme }) => active ? theme.white : theme.text1};
  font-weight: 500;
  border: none;
  cursor: pointer;
  outline: none;

  &:hover {
    background: ${({ active, theme }) => active ? theme.primary1 : theme.bg2};
  }
`

export default function XTransfer() {
  const { account } = useActiveWeb3React()
  const toggleWalletModal = useWalletModalToggle()
  const [view, setView] = useState<View>(View.DEPOSIT)
  const [amount, setAmount] = useState('')
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null)

  const handleCurrencySelect = useCallback((currency: Currency) => {
    setSelectedCurrency(currency)
  }, [])

  function getActionButton() {
    if (!account) {
      return (
        <ButtonPrimary onClick={toggleWalletModal}>
          <Text fontSize={20} fontWeight={500}>
            Connect Wallet
          </Text>
        </ButtonPrimary>
      )
    }

    return (
      <ButtonError
        onClick={() => {
          // Add contract interaction here
          console.log(`${view === View.DEPOSIT ? 'Depositing' : 'Withdrawing'} ${amount} ${selectedCurrency?.symbol}`)
        }}
        disabled={!amount || !selectedCurrency}
        error={false}
      >
        <Text fontSize={20} fontWeight={500} color="white">
          {view === View.DEPOSIT ? 'Deposit' : 'Withdraw'}
        </Text>
      </ButtonError>
    )
  }

  return (
    <>
      <AppBody>
        <SwapPoolTabs active={'xtransfer'} />
        <Wrapper>
          <AutoColumn gap="20px">
            <ToggleWrapper>
              <ToggleButton
                active={view === View.DEPOSIT}
                onClick={() => setView(View.DEPOSIT)}
              >
                Deposit
              </ToggleButton>
              <ToggleButton
                active={view === View.WITHDRAW}
                onClick={() => setView(View.WITHDRAW)}
              >
                Withdraw
              </ToggleButton>
            </ToggleWrapper>

            <CurrencyInputPanel
              value={amount}
              onUserInput={setAmount}
              onCurrencySelect={handleCurrencySelect}
              showMaxButton={true}
              currency={selectedCurrency}
              id="deposit-withdraw-input"
              showCommonBases={true}
            />

            {getActionButton()}
          </AutoColumn>
        </Wrapper>
      </AppBody>
    </>
  )
}