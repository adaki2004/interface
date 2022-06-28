import { ResponsiveValue } from '@shopify/restyle'
import React from 'react'
import { Modal as BaseModal, ModalProps, StyleSheet, View } from 'react-native'
import { Button } from 'src/components/buttons/Button'
import { CloseButton } from 'src/components/buttons/CloseButton'
import { Box } from 'src/components/layout/Box'
import { Text } from 'src/components/Text'
import { Theme } from 'src/styles/theme'

interface Props extends ModalProps {
  position?: 'top' | 'center' | 'bottom'
  title?: string
  hide?: () => void
  dismissable?: boolean
  showCloseButton?: boolean
  width?: number | '100%'
  dimBackground?: boolean
}

// TODO excluding some props here due to bug with React Native's Modal and reanimated
// May be resolved after upgrading reanimated to latest but uncertain
// https://github.com/facebook/react-native/issues/32329
export function Modal({
  visible,
  hide,
  showCloseButton,
  title,
  position,
  width,
  dimBackground,
  children,
  dismissable = true,
}: // ...rest (TODO above)
React.PropsWithChildren<Props>) {
  let justifyContent: ResponsiveValue<'center' | 'flex-start' | 'flex-end', Theme> = 'center'
  if (position === 'top') justifyContent = 'flex-start'
  if (position === 'bottom') justifyContent = 'flex-end'

  return (
    <BaseModal
      animationType="none"
      presentationStyle="overFullScreen"
      transparent={true}
      visible={visible} /* {...rest} */
    >
      <Button
        alignItems="center"
        flexGrow={1}
        justifyContent={justifyContent}
        style={dimBackground && style.bgDimmed}
        onPress={dismissable ? hide : undefined}>
        <Box
          backgroundColor="mainBackground"
          style={width === '100%' ? style.modalBoxFullWidth : style.modalBox}
          width={width}>
          {title && (
            <Text mb="sm" px="md" variant="headlineSmall">
              {title}
            </Text>
          )}
          {hide && showCloseButton && (
            <View style={style.closeButtonContainer}>
              <CloseButton size={14} onPress={hide} />
            </View>
          )}
          {children}
        </Box>
      </Button>
    </BaseModal>
  )
}

const modalBoxBaseStyle = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: 15,
    elevation: 5,
    margin: 20,
    padding: 20,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      height: 2,
      width: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
})

const style = StyleSheet.create({
  bgDimmed: {
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  closeButtonContainer: {
    position: 'absolute',
    right: 20,
    top: 20,
  },
  modalBox: modalBoxBaseStyle.base,
  modalBoxFullWidth: {
    ...modalBoxBaseStyle.base,
    margin: 0,
  },
})
