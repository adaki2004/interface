import { Currency } from '@uniswap/sdk-core'
import React, { useCallback } from 'react'
import { ListRenderItemInfo } from 'react-native'
import { HomeStackScreenProp, useHomeStackNavigation } from 'src/app/navigation/types'
import { AddressDisplay } from 'src/components/AddressDisplay'
import { BackButton } from 'src/components/buttons/BackButton'
import { Box, Flex } from 'src/components/layout'
import { BackHeader } from 'src/components/layout/BackHeader'
import { HeaderListScreen } from 'src/components/layout/screens/HeaderListScreen'
import { Separator } from 'src/components/layout/Separator'
import { Loading } from 'src/components/loading'
import { TokenBalanceItem } from 'src/components/TokenBalanceList/TokenBalanceItem'
import { TotalBalance } from 'src/features/balances/TotalBalance'
import { useActiveChainIds } from 'src/features/chains/utils'
import { useAllBalancesList } from 'src/features/dataApi/balances'
import { PortfolioBalance } from 'src/features/dataApi/types'
import { useActiveAccountAddressWithThrow } from 'src/features/wallet/hooks'
import { Screens } from 'src/screens/Screens'
import { currencyId } from 'src/utils/currencyId'

export function PortfolioTokensScreen({
  route: {
    params: { owner },
  },
}: HomeStackScreenProp<Screens.PortfolioTokens>) {
  // TODO: Figure out how to make nav available across stacks
  const navigation = useHomeStackNavigation()
  const accountAddress = useActiveAccountAddressWithThrow()
  const activeAddress = owner ?? accountAddress
  const currentChains = useActiveChainIds()

  const { balances, balancesByChain } = useAllBalancesList(activeAddress, currentChains)

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<PortfolioBalance>) => (
      <TokenBalanceItem
        key={currencyId(item.amount.currency)}
        balance={item}
        onPressToken={(currency: Currency) =>
          navigation.navigate(Screens.TokenDetails, { currencyId: currencyId(currency) })
        }
      />
    ),
    [navigation]
  )

  const isOtherOwner = owner && owner !== accountAddress

  return (
    <HeaderListScreen
      InitialScreenHeader={
        <Flex gap="md" my="sm">
          {isOtherOwner ? (
            <BackHeader>
              <AddressDisplay address={owner} color="textSecondary" size={16} variant="subhead" />
            </BackHeader>
          ) : (
            <BackButton showButtonLabel />
          )}
        </Flex>
      }
      ItemSeparatorComponent={() => <Separator ml="md" />}
      ListEmptyComponent={
        <Box mx="md" my="sm">
          <Loading repeat={8} type="token" />
        </Box>
      }
      ScrolledScreenHeader={
        <BackHeader>
          <Flex centered gap="none">
            {isOtherOwner ? (
              <AddressDisplay address={owner} size={16} variant="subhead" />
            ) : (
              <TotalBalance balances={balancesByChain} variant="subheadSmall" />
            )}
          </Flex>
        </BackHeader>
      }
      data={balances}
      keyExtractor={(item: PortfolioBalance) => currencyId(item.amount.currency)}
      renderItem={renderItem}
    />
  )
}
