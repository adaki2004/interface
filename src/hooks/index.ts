import { Web3Provider } from '@ethersproject/providers'
import { ChainId } from '@uniswap/sdk'
import { useWeb3React as useWeb3ReactCore } from '@web3-react/core'
import { Web3ReactContextInterface } from '@web3-react/core/dist/types'
import { useEffect, useState } from 'react'
import { isMobile } from 'react-device-detect'
import { injected } from '../connectors'
import { NetworkContextName } from '../constants'

export function useActiveWeb3React(): Web3ReactContextInterface<Web3Provider> & { chainId?: ChainId } {
  const context = useWeb3ReactCore<Web3Provider>()
  const contextNetwork = useWeb3ReactCore<Web3Provider>(NetworkContextName)
  return context.active ? context : contextNetwork
}

export function useEagerConnect() {
  const { activate, active } = useWeb3ReactCore() // specifically using useWeb3ReactCore because of what this hook does
  const [tried, setTried] = useState(false)

  useEffect(() => {
    injected.isAuthorized().then(isAuthorized => {
      if (isAuthorized) {
        activate(injected, undefined, true).catch(() => {
          setTried(true)
        })
      } else {
        if (isMobile && window.ethereum) {
          activate(injected, undefined, true).catch(() => {
            setTried(true)
          })
        } else {
          setTried(true)
        }
      }
    })
  }, [activate]) // intentionally only running on mount (make sure it's only mounted once :))

  // if the connection worked, wait until we get confirmation of that to flip the flag
  useEffect(() => {
    if (active) {
      setTried(true)
    }
  }, [active])

  return tried
}

/**
 * Use for network and injected - logs user in
 * and out after checking what network theyre on
 */
export function useInactiveListener(suppress = false) {
  const { active, error, activate, chainId, account } = useWeb3ReactCore() // specifically using useWeb3React because of what this hook does

  useEffect(() => {
    const { ethereum } = window
    
    console.log('useInactiveListener - Current state:', { 
      active, 
      error: error?.message, 
      suppress, 
      chainId, 
      account,
      hasEthereum: !!ethereum,
      hasEthereumOn: !!(ethereum && ethereum.on)
    })
    
    // Debug: Check what MetaMask actually reports
    if (ethereum && (ethereum as any).request) {
      (ethereum as any).request({ method: 'eth_chainId' }).then((mmChainId: string) => {
        const mmChainIdDecimal = parseInt(mmChainId, 16)
        console.log('🔍 MetaMask actual chainId:', { 
          hex: mmChainId, 
          decimal: mmChainIdDecimal,
          web3ReactChainId: chainId,
          mismatch: mmChainIdDecimal !== chainId 
        })
      }).catch((err: any) => console.log('Failed to get MM chainId:', err))
    }

    if (ethereum && ethereum.on && !error && !suppress) {
      const handleChainChanged = (chainIdHex: string) => {
        const newChainId = parseInt(chainIdHex, 16)
        console.log('🔗 Chain changed detected!', { 
          chainIdHex, 
          newChainId, 
          currentChainId: chainId,
          active 
        })
        // eat errors
        activate(injected, undefined, true).catch(error => {
          console.error('Failed to activate after chain changed', error)
        })
      }

      const handleAccountsChanged = (accounts: string[]) => {
        console.log('👤 Accounts changed:', { accounts, currentAccount: account, active })
        if (accounts.length > 0) {
          // eat errors
          activate(injected, undefined, true).catch(error => {
            console.error('Failed to activate after accounts changed', error)
          })
        }
      }

      console.log('✅ Setting up ethereum event listeners...', { 
        active, 
        chainId, 
        account, 
        suppress 
      })
      
      // Test if chainChanged events are being fired at all
      const testChainHandler = (chainId: string) => {
        console.log('🟡 RAW chainChanged event detected:', chainId)
      }
      const testAccountHandler = (accounts: string[]) => {
        console.log('🟡 RAW accountsChanged event detected:', accounts)
      }
      
      // Listen for both chain and account changes regardless of active state
      ethereum.on('chainChanged', handleChainChanged)
      ethereum.on('chainChanged', testChainHandler)
      ethereum.on('accountsChanged', handleAccountsChanged)
      ethereum.on('accountsChanged', testAccountHandler)

      return () => {
        console.log('🧹 Cleaning up ethereum event listeners...')
        if (ethereum.removeListener) {
          ethereum.removeListener('chainChanged', handleChainChanged)
          ethereum.removeListener('chainChanged', testChainHandler)
          ethereum.removeListener('accountsChanged', handleAccountsChanged)
          ethereum.removeListener('accountsChanged', testAccountHandler)
        }
      }
    } else {
      console.log('❌ Not setting up listeners because:', {
        noEthereum: !ethereum,
        noEthereumOn: !(ethereum && ethereum.on),
        hasError: !!error,
        errorMessage: error?.message,
        suppressed: suppress
      })
      
      // Additional debugging
      if (ethereum) {
        console.log('Ethereum object exists, checking methods:', {
          hasOn: typeof ethereum.on === 'function',
          hasRemoveListener: typeof ethereum.removeListener === 'function',
          ethereumKeys: Object.keys(ethereum).slice(0, 10) // Show first 10 keys
        })
      }
    }
    return undefined
  }, [active, error, suppress, activate, chainId, account])
}
