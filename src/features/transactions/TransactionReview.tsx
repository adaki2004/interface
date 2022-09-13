import { Currency } from '@uniswap/sdk-core'
import React, { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { FadeInUp, FadeOut } from 'react-native-reanimated'
import { useAppTheme } from 'src/app/hooks'
import { AddressDisplay } from 'src/components/AddressDisplay'
import ActionButton, { ActionButtonProps } from 'src/components/buttons/ActionButton'
import { Button } from 'src/components/buttons/Button'
import { TransferArrowButton } from 'src/components/buttons/TransferArrowButton'
import { CurrencyLogo } from 'src/components/CurrencyLogo'
import { Arrow } from 'src/components/icons/Arrow'
import { AmountInput } from 'src/components/input/AmountInput'
import { RecipientPrevTransfers } from 'src/components/input/RecipientInputPanel'
import { AnimatedFlex, Flex } from 'src/components/layout'
import { NFTTransfer } from 'src/components/NFT/NFTTransfer'
import { Text } from 'src/components/Text'
import { NFTAsset } from 'src/features/nfts/types'
import { dimensions } from 'src/styles/sizing'

interface BaseReviewProps {
  actionButtonProps: ActionButtonProps
  isUSDInput: boolean
  transactionDetails?: ReactNode
  nftIn?: NFTAsset.Asset
  currencyIn?: Currency
  currencyOut?: Currency
  formattedAmountIn?: string
  formattedAmountOut?: string
  recipient?: string
  onPrev: () => void
}

interface TransferReviewProps extends BaseReviewProps {
  recipient: string
}

interface SwapReviewProps extends BaseReviewProps {
  currencyIn: Currency
  currencyOut: Currency
  formattedAmountIn: string
  formattedAmountOut: string
}

type TransactionReviewProps = TransferReviewProps | SwapReviewProps

export function TransactionReview({
  actionButtonProps,
  currencyIn,
  formattedAmountIn,
  currencyOut,
  formattedAmountOut,
  nftIn,
  recipient,
  isUSDInput,
  transactionDetails,
  onPrev,
}: TransactionReviewProps) {
  const theme = useAppTheme()
  const { t } = useTranslation()

  return (
    <>
      <AnimatedFlex centered grow entering={FadeInUp} exiting={FadeOut} gap="sm">
        {currencyIn ? (
          <Flex centered gap="sm">
            <AmountInput
              alignSelf="stretch"
              backgroundColor="none"
              borderWidth={0}
              editable={false}
              fontFamily={theme.textVariants.headlineHero.fontFamily}
              fontSize={theme.textVariants.headlineHero.fontSize}
              height={theme.textVariants.headlineHero.lineHeight}
              px="md"
              py="none"
              showCurrencySign={isUSDInput}
              showSoftInputOnFocus={false}
              testID="amount-input-in"
              textAlign="center"
              value={formattedAmountIn}
            />
            <CurrencyLogoWithLabel currency={currencyIn} />
          </Flex>
        ) : nftIn ? (
          <Flex mt="xxxl">
            <NFTTransfer asset={nftIn} nftSize={dimensions.fullHeight / 5} />
          </Flex>
        ) : null}
        <TransferArrowButton disabled bg="none" borderColor="none" />
        {currencyOut && formattedAmountOut ? (
          <Flex centered gap="md">
            <Flex gap="sm">
              <AmountInput
                alignSelf="stretch"
                backgroundColor="none"
                borderWidth={0}
                editable={false}
                fontFamily={theme.textVariants.headlineLarge.fontFamily}
                fontSize={theme.textVariants.headlineHero.fontSize}
                height={theme.textVariants.headlineHero.lineHeight}
                px="md"
                py="none"
                showCurrencySign={isUSDInput}
                showSoftInputOnFocus={false}
                testID="amount-input-out"
                textAlign="center"
                value={formattedAmountOut}
              />
              <CurrencyLogoWithLabel currency={currencyOut} />
            </Flex>
          </Flex>
        ) : recipient ? (
          <Flex centered gap="sm">
            <Text color="textTertiary" variant="caption">
              {t('To')}
            </Text>
            <Flex centered gap="xs">
              <AddressDisplay address={recipient} size={24} variant="headlineMedium" />
              <RecipientPrevTransfers recipient={recipient} />
            </Flex>
          </Flex>
        ) : null}
      </AnimatedFlex>
      <AnimatedFlex
        entering={FadeInUp}
        exiting={FadeOut}
        flexGrow={0}
        gap="sm"
        justifyContent="flex-end"
        mb="xl"
        px="md">
        {transactionDetails}
        <Flex row gap="xs">
          <Button
            alignItems="center"
            borderColor="backgroundOutline"
            borderRadius="lg"
            borderWidth={1}
            flexDirection="row"
            justifyContent="center"
            px="md"
            py="sm"
            onPress={onPrev}>
            <Arrow color={theme.colors.textPrimary} direction="w" size={20} />
          </Button>
          <Flex grow>
            <ActionButton
              disabled={actionButtonProps.disabled}
              label={actionButtonProps.label}
              name={actionButtonProps.name}
              onPress={actionButtonProps.onPress}
            />
          </Flex>
        </Flex>
      </AnimatedFlex>
    </>
  )
}

function CurrencyLogoWithLabel({ currency }: { currency: Currency }) {
  return (
    <Flex centered row gap="xs">
      <CurrencyLogo currency={currency} size={28} />
      <Text color="textPrimary" variant="largeLabel">
        {currency.symbol}
      </Text>
    </Flex>
  )
}
