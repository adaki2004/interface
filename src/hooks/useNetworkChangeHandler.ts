import { useEffect } from 'react'
import { useActiveWeb3React } from '../hooks'

export function useNetworkChangeHandler() {
  const { library } = useActiveWeb3React()

  useEffect(() => {
    if (!library?.provider) return

    // Assert provider as any to access `on` and `removeListener`
    const provider = library.provider as any

    const handleChainChanged = (chainId: string | number) => {
      console.log('Chain changed:', chainId)
    }

    const handleDisconnect = (error: { code: number; message: string }) => {
      console.log('Disconnect error:', error)
      if (error.code === 1013) {
        console.log('Network error - underlying network changed')
      }
    }

    const handleConnect = (connectInfo: { chainId: string }) => {
      console.log('Connected to chain:', connectInfo)
    }

    if (provider.on) {
      provider.on('chainChanged', handleChainChanged)
      provider.on('disconnect', handleDisconnect)
      provider.on('connect', handleConnect)
    }

    return () => {
      if (provider.removeListener) {
        provider.removeListener('chainChanged', handleChainChanged)
        provider.removeListener('disconnect', handleDisconnect)
        provider.removeListener('connect', handleConnect)
      }
    }
  }, [library])
}
