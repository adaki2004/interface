import { useMemo, useState } from 'react'
import { useActiveWeb3React } from './index'
import { isL2Chain } from '../data/Reserves'

export enum LiquiditySource {
  L1_ONLY = 'L1_ONLY',      // Only L1 liquidity (when on L1, or user chooses L1 on L2)
  L2_ONLY = 'L2_ONLY',      // Only L2 liquidity (user chooses L2 on L2)
  BOTH = 'BOTH'             // Show both L1 and L2 options (when on L2)
}

export interface LiquiditySourceInfo {
  source: LiquiditySource
  label: string
  description: string
  useCrossChain: boolean
  badgeColor: string
  icon: string
}

export const LIQUIDITY_SOURCE_INFO: Record<LiquiditySource, LiquiditySourceInfo> = {
  [LiquiditySource.L1_ONLY]: {
    source: LiquiditySource.L1_ONLY,
    label: 'L1 Liquidity',
    description: 'Trade against L1 liquidity pools via cross-chain bridge',
    useCrossChain: true,
    badgeColor: '#6366f1', // Indigo
    icon: 'bridge' // Will use GitBranch as bridge icon
  },
  [LiquiditySource.L2_ONLY]: {
    source: LiquiditySource.L2_ONLY,
    label: 'L2 Liquidity', 
    description: 'Trade against local L2 liquidity pools',
    useCrossChain: false,
    badgeColor: '#10b981', // Green
    icon: 'layers' // Will use Layers icon
  },
  [LiquiditySource.BOTH]: {
    source: LiquiditySource.BOTH,
    label: 'All Liquidity',
    description: 'Compare both L1 and L2 liquidity sources',
    useCrossChain: false,
    badgeColor: '#8b5cf6', // Purple
    icon: 'scale' // Will use Scale icon (or similar)
  }
}

export interface LiquiditySourceHook {
  availableSources: LiquiditySource[]
  selectedSource: LiquiditySource
  shouldShowL1: boolean
  shouldShowL2: boolean
  shouldUseCrossChain: boolean
  setLiquiditySource: (source: LiquiditySource) => void
  getSourceInfo: (source: LiquiditySource) => LiquiditySourceInfo
}

// For now, let's keep it simple and just detect based on chain
// Later we can add state management for user selection
export function useLiquiditySource(): LiquiditySourceHook {
  const { chainId } = useActiveWeb3React()
  
  const availableSources = useMemo((): LiquiditySource[] => {
    if (isL2Chain(chainId)) {
      // On L2 chains, show both options
      return [LiquiditySource.L1_ONLY, LiquiditySource.L2_ONLY]
    } else {
      // On L1, only show L1 liquidity
      return [LiquiditySource.L1_ONLY]
    }
  }, [chainId])
  
  // State management for selected source
  const [selectedSource, setSelectedSourceState] = useState<LiquiditySource>(() => {
    // Default to L1 liquidity (existing behavior)
    return LiquiditySource.L1_ONLY
  })
  
  const shouldShowL1 = useMemo(() => {
    return selectedSource === LiquiditySource.L1_ONLY || selectedSource === LiquiditySource.BOTH
  }, [selectedSource])
  
  const shouldShowL2 = useMemo(() => {
    return selectedSource === LiquiditySource.L2_ONLY || selectedSource === LiquiditySource.BOTH
  }, [selectedSource])
  
  const shouldUseCrossChain = useMemo(() => {
    return isL2Chain(chainId) && (selectedSource === LiquiditySource.L1_ONLY)
  }, [chainId, selectedSource])
  
  const setLiquiditySource = (source: LiquiditySource) => {
    console.log('Setting liquidity source to:', source)
    setSelectedSourceState(source)
  }
  
  const getSourceInfo = (source: LiquiditySource): LiquiditySourceInfo => {
    return LIQUIDITY_SOURCE_INFO[source]
  }
  
  return {
    availableSources,
    selectedSource,
    shouldShowL1,
    shouldShowL2, 
    shouldUseCrossChain,
    setLiquiditySource,
    getSourceInfo
  }
}