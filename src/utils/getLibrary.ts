import { Web3Provider } from '@ethersproject/providers'

export default function getLibrary(provider: any): Web3Provider {
  const library = new Web3Provider(provider, 'any') // 'any' allows network changes
  library.pollingInterval = 15000
  
  // Intercept and log all RPC calls
  const originalSend = library.send.bind(library)
  library.send = function(method: string, params: any[]): Promise<any> {
    console.log('🔍 RPC CALL:', {
      method,
      params,
      chainId: library.network?.chainId,
      timestamp: new Date().toISOString()
    })
    
    return originalSend(method, params)
      .then(result => {
        console.log('✅ RPC RESPONSE:', {
          method,
          result: method === 'eth_call' ? `${JSON.stringify(result).substring(0, 100)}...` : result,
          chainId: library.network?.chainId
        })
        return result
      })
      .catch(error => {
        console.error('❌ RPC ERROR:', {
          method,
          params,
          error: error.message,
          code: error.code,
          chainId: library.network?.chainId
        })
        throw error
      })
  }
  
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
