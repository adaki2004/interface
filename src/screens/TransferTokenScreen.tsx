import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { SwapStackParamList } from 'src/app/navigation/types'
import { BackButton } from 'src/components/buttons/BackButton'
import { Box } from 'src/components/layout/Box'
import { Screen } from 'src/components/layout/Screen'
import { Text } from 'src/components/Text'
import { TransferTokenForm } from 'src/features/transfer/TransferTokenForm'
import { Screens } from 'src/screens/Screens'

type Props = NativeStackScreenProps<SwapStackParamList, Screens.Transfer>

export function TransferTokenScreen({}: Props) {
  const { t } = useTranslation()
  return (
    <Screen>
      <Box alignItems="center">
        <Text textAlign="center">{t('Send those tokens around')}</Text>
        <TransferTokenForm />
        <BackButton />
      </Box>
    </Screen>
  )
}
