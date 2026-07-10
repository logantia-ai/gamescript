import { TIER_COLORS, TIER_DISPLAY_NAMES } from '../../lib/tiers';
import { Badge } from './Badge';

export function TierBadge({ tier = 'free', style }) {
  return (
    <Badge color={TIER_COLORS[tier] || 'var(--silver)'} style={style}>
      {TIER_DISPLAY_NAMES[tier] || tier}
    </Badge>
  );
}
