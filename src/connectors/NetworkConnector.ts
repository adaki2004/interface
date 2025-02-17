import { ConnectorUpdate } from '@web3-react/types'
import { AbstractConnector } from '@web3-react/abstract-connector'
import invariant from 'tiny-invariant'

interface NetworkConnectorArguments {
  urls: { [chainId: number]: string }
  defaultChainId?: number
}

type AsyncSendable = {
  isMetaMask?: boolean
  host?: string
  path?: string
  sendAsync?: (request: any, callback: (error: any, response: any) => void) => void
  send?: (request: any, callback: (error: any, response: any) => void) => void
}

interface BatchItem {
  request: { jsonrpc: '2.0'; id: number; method: string; params: unknown }
  resolve: (result: any) => void
  reject: (error: Error) => void
}

class MiniRpcProvider implements AsyncSendable {
  public readonly isMetaMask: false = false
  public readonly chainId: number
  public readonly url: string
  public readonly host: string
  public readonly path: string
  public readonly batchWaitTimeMs: number

  private nextId = 1
  private batchTimeoutId: ReturnType<typeof setTimeout> | null = null
  private batch: BatchItem[] = []

  constructor(chainId: number, url: string, batchWaitTimeMs?: number) {
    this.chainId = chainId
    this.url = url
    const parsed = new URL(url)
    this.host = parsed.host
    this.path = parsed.pathname
    this.batchWaitTimeMs = batchWaitTimeMs ?? 50
  }

  public readonly clearBatch = async () => {
    console.debug('Clearing batch', this.batch)
    const batch = this.batch
    this.batch = []
    this.batchTimeoutId = null
    
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 
          'content-type': 'application/json', 
          accept: 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        mode: 'cors',
        body: JSON.stringify(batch.map(item => item.request))
      })

      if (!response.ok) {
        console.warn(`Network request failed with status ${response.status}`)
        batch.forEach(({ resolve }) => {
          resolve({ 
            jsonrpc: '2.0',
            id: this.nextId++,
            error: {
              code: -32000,
              message: `Network error: ${response.status} ${response.statusText}`
            }
          })
        })
        return
      }

      const json = await response.json()
      const byKey = batch.reduce<{ [id: number]: BatchItem }>((memo, current) => {
        memo[current.request.id] = current
        return memo
      }, {})

      for (const result of json) {
        const item = byKey[result.id]
        if (!item?.resolve) continue

        item.resolve(result)
      }
    } catch (error) {
      console.warn('Network connection error:', error)
      batch.forEach(({ resolve }) => {
        resolve({
          jsonrpc: '2.0',
          id: this.nextId++,
          error: {
            code: -32603,
            message: 'Network connection unavailable'
          }
        })
      })
    }
  }

  public readonly sendAsync = (
    request: { jsonrpc: '2.0'; id: number | string | null; method: string; params?: unknown[] | object },
    callback: (error: any, response: any) => void
  ): void => {
    this.request(request.method, request.params)
      .then(result => callback(null, { jsonrpc: '2.0', id: request.id, result }))
      .catch(error => callback(null, { 
        jsonrpc: '2.0', 
        id: request.id, 
        error: { 
          code: -32603, 
          message: error?.message || 'Request failed' 
        } 
      }))
  }

  public readonly request = async (
    method: string | { method: string; params: unknown[] },
    params?: unknown[] | object
  ): Promise<unknown> => {
    if (typeof method !== 'string') {
      return this.request(method.method, method.params)
    }
    if (method === 'eth_chainId') {
      return `0x${this.chainId.toString(16)}`
    }
    
    // Special handling for eth_blockNumber when network is down
    if (method === 'eth_blockNumber') {
      const promise = new Promise((resolve) => {
        this.batch.push({
          request: {
            jsonrpc: '2.0',
            id: this.nextId++,
            method,
            params
          },
          resolve: (result) => {
            // If we get an error response, return a safe default
            if ('error' in result) {
              resolve('0x0') // Return block 0 when network is down
            } else {
              resolve(result)
            }
          },
          reject: () => resolve('0x0') // Fallback to block 0
        })
      })
      this.batchTimeoutId = this.batchTimeoutId ?? setTimeout(this.clearBatch, this.batchWaitTimeMs)
      return promise
    }
  
    // For all other methods
    const promise = new Promise((resolve) => {
      this.batch.push({
        request: {
          jsonrpc: '2.0',
          id: this.nextId++,
          method,
          params
        },
        resolve: (result) => {
          // If we get an error response, return a safe default based on method
          if ('error' in result) {
            switch (method) {
              case 'eth_getBlockByNumber':
              case 'eth_getBlockByHash':
                resolve({ number: '0x0', hash: '0x0', transactions: [] })
                break
              case 'eth_gasPrice':
                resolve('0x0')
                break
              case 'eth_call':
                resolve('0x')
                break
              case 'eth_getLogs':
                resolve([])
                break
              default:
                resolve(null)
            }
          } else {
            resolve(result)
          }
        },
        reject: () => resolve(null)
      })
    })
    this.batchTimeoutId = this.batchTimeoutId ?? setTimeout(this.clearBatch, this.batchWaitTimeMs)
    return promise
  }
}

export class NetworkConnector extends AbstractConnector {
  private readonly providers: { [chainId: number]: MiniRpcProvider }
  private currentChainId: number

  constructor({ urls, defaultChainId }: NetworkConnectorArguments) {
    invariant(defaultChainId || Object.keys(urls).length === 1, 'defaultChainId is a required argument with >1 url')
    super({ supportedChainIds: Object.keys(urls).map((k): number => Number(k)) })

    this.currentChainId = defaultChainId || Number(Object.keys(urls)[0])
    this.providers = Object.keys(urls).reduce<{ [chainId: number]: MiniRpcProvider }>((accumulator, chainId) => {
      accumulator[Number(chainId)] = new MiniRpcProvider(Number(chainId), urls[Number(chainId)])
      return accumulator
    }, {})
  }

  public get provider(): MiniRpcProvider {
    return this.providers[this.currentChainId]
  }

  public async activate(): Promise<ConnectorUpdate> {
    return { provider: this.providers[this.currentChainId], chainId: this.currentChainId, account: null }
  }

  public async getProvider(): Promise<MiniRpcProvider> {
    return this.providers[this.currentChainId]
  }

  public async getChainId(): Promise<number> {
    return this.currentChainId
  }

  public async getAccount(): Promise<null> {
    return null
  }

  public deactivate() {
    return
  }
}