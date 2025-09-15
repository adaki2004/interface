import { Web3Provider } from '@ethersproject/providers'

export default function getLibrary(provider: any): Web3Provider {
  const library = new Web3Provider(provider, 'any') // 'any' allows network changes
  library.pollingInterval = 15000
  
  // Handle network changes gracefully
  library.on('network', (newNetwork, oldNetwork) => {
    console.log('🌐 Network changed in Web3Provider:', { oldNetwork, newNetwork })
    if (oldNetwork) {
      // Network changed, this is expected behavior
      console.log('Network switched successfully')
    }
  })
  
  // Handle errors to prevent uncaught promise rejections
  library.on('error', (error) => {
    console.warn('Web3Provider error (handled):', error)
  })
  
  return library
}
