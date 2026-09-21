import {
  ArrowLeftRight,
  CalendarCheck,
  CalendarX,
  CheckCheck,
  CircleCheck,
  CircleX,
  Clock,
  Crown,
  Dices,
  Handshake,
  Hourglass,
  Loader,
  Lock,
  Minus,
  Package,
  PackageCheck,
  PartyPopper,
  QrCode,
  RotateCcw,
  Scale,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  ShieldX,
  Sparkles,
  Store,
  Tag,
  TicketCheck,
  TimerOff,
  UserCheck,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * lib/status.ts stays free of JSX, so it names its icon as a string. This
 * registry is the only place those names resolve to components — which also
 * keeps the icon set tree-shakeable instead of pulling all of lucide.
 */
const REGISTRY: Record<string, LucideIcon> = {
  ArrowLeftRight,
  CalendarCheck,
  CalendarX,
  CheckCheck,
  CircleCheck,
  CircleX,
  Clock,
  Crown,
  Dices,
  Handshake,
  Hourglass,
  Loader,
  Lock,
  Minus,
  Package,
  PackageCheck,
  PartyPopper,
  QrCode,
  RotateCcw,
  Scale,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  ShieldX,
  Sparkles,
  Store,
  Tag,
  TicketCheck,
  TimerOff,
  UserCheck,
  Wallet,
  Zap,
};

export function StatusIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = REGISTRY[name] ?? Minus;
  return <Icon aria-hidden className={className} />;
}
