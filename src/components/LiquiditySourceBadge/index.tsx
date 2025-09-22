import React from 'react'
import styled from 'styled-components'
import { GitBranch, Layers, TrendingUp } from 'react-feather'
import { LiquiditySource, LiquiditySourceInfo } from '../../hooks/useLiquiditySource'

const Badge = styled.div<{ color: string; selected?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 12px;
  background-color: ${({ color, selected }) => selected ? color : color + '20'};
  color: ${({ color, selected }) => selected ? 'white' : color};
  font-size: 12px;
  font-weight: 500;
  border: 1px solid ${({ color }) => color};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${({ color }) => color};
    color: white;
  }
`

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  
  svg {
    width: 12px;
    height: 12px;
  }
`

interface LiquiditySourceBadgeProps {
  sourceInfo: LiquiditySourceInfo
  selected?: boolean
  onClick?: () => void
}

export function LiquiditySourceBadge({ sourceInfo, selected, onClick }: LiquiditySourceBadgeProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'bridge':
        return <GitBranch />
      case 'layers':
        return <Layers />
      case 'scale':
        return <TrendingUp />
      default:
        return <TrendingUp />
    }
  }

  return (
    <Badge color={sourceInfo.badgeColor} selected={selected} onClick={onClick} title={sourceInfo.description}>
      <IconWrapper>{getIcon(sourceInfo.icon)}</IconWrapper>
      {sourceInfo.label}
    </Badge>
  )
}

interface LiquiditySourceSelectorProps {
  availableSources: LiquiditySource[]
  selectedSource: LiquiditySource
  getSourceInfo: (source: LiquiditySource) => LiquiditySourceInfo
  onSelectSource: (source: LiquiditySource) => void
}

const SelectorContainer = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 8px 0;
`

const Label = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.text1};
  margin-right: 8px;
`

export function LiquiditySourceSelector({ 
  availableSources, 
  selectedSource, 
  getSourceInfo, 
  onSelectSource 
}: LiquiditySourceSelectorProps) {
  if (availableSources.length <= 1) {
    return null // Don't show selector if only one option
  }

  return (
    <SelectorContainer>
      <Label>Liquidity:</Label>
      {availableSources.map(source => (
        <LiquiditySourceBadge
          key={source}
          sourceInfo={getSourceInfo(source)}
          selected={source === selectedSource}
          onClick={() => onSelectSource(source)}
        />
      ))}
    </SelectorContainer>
  )
}