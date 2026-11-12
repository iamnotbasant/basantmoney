// Icon registry for category / payment-method pills + the Settings manager.
// Keys are stored on the Category / PaymentMethod record (localStorage), so a
// user can pick any of these icons for any category in Settings and the pill
// everywhere (Transactions, entry forms) shows that icon. The 17 ChatGPT
// outline icons live in SolidPillIcons.tsx; the rest are lucide icons in the
// same 24x24 stroke-2 outline style, legible at 16px.
import React from 'react';
import {
  User,
  Smartphone,
  Coins,
  HeartPulse,
  Film,
  BookOpen,
  Tag,
  Gift,
  Car,
  Plane,
  GraduationCap,
  Coffee,
  Zap,
  Home as HomeIcon,
} from 'lucide-react';
import {
  IconUpi,
  IconBank,
  IconCash,
  IconCheque,
  IconCard,
  IconWallet,
  IconSalary,
  IconFreelance,
  IconInvestment,
  IconInterest,
  IconCashback,
  IconFood,
  IconTransport,
  IconEntertainment,
  IconBills,
  IconShopping,
  IconGeneric,
  IconHome,
} from '@/components/SolidPillIcons';

export type IconComponent = React.ComponentType<{ className?: string }>;

export interface IconOption {
  key: string;
  label: string;
  Icon: IconComponent;
}

export const CATEGORY_ICONS: Record<string, IconOption> = {
  upi: { key: 'upi', label: 'UPI / Phone', Icon: IconUpi },
  bank: { key: 'bank', label: 'Bank', Icon: IconBank },
  cash: { key: 'cash', label: 'Cash', Icon: IconCash },
  cheque: { key: 'cheque', label: 'Cheque', Icon: IconCheque },
  card: { key: 'card', label: 'Card', Icon: IconCard },
  wallet: { key: 'wallet', label: 'Wallet', Icon: IconWallet },
  salary: { key: 'salary', label: 'Briefcase', Icon: IconSalary },
  freelance: { key: 'freelance', label: 'Laptop', Icon: IconFreelance },
  investment: { key: 'investment', label: 'Chart', Icon: IconInvestment },
  interest: { key: 'interest', label: 'Percent', Icon: IconInterest },
  cashback: { key: 'cashback', label: 'Cashback', Icon: IconCashback },
  food: { key: 'food', label: 'Food', Icon: IconFood },
  transport: { key: 'transport', label: 'Bus', Icon: IconTransport },
  entertainment: { key: 'entertainment', label: 'Clapperboard', Icon: IconEntertainment },
  bills: { key: 'bills', label: 'Receipt', Icon: IconBills },
  shopping: { key: 'shopping', label: 'Shopping bag', Icon: IconShopping },
  home: { key: 'home', label: 'House', Icon: IconHome },
  user: { key: 'user', label: 'Person', Icon: User },
  smartphone: { key: 'smartphone', label: 'Smartphone', Icon: Smartphone },
  coins: { key: 'coins', label: 'Coins', Icon: Coins },
  heart: { key: 'heart', label: 'Health', Icon: HeartPulse },
  film: { key: 'film', label: 'Film', Icon: Film },
  book: { key: 'book', label: 'Book', Icon: BookOpen },
  gift: { key: 'gift', label: 'Gift', Icon: Gift },
  car: { key: 'car', label: 'Car', Icon: Car },
  plane: { key: 'plane', label: 'Plane', Icon: Plane },
  graduation: { key: 'graduation', label: 'Graduation', Icon: GraduationCap },
  coffee: { key: 'coffee', label: 'Coffee', Icon: Coffee },
  zap: { key: 'zap', label: 'Lightning', Icon: Zap },
  homeOutline: { key: 'homeOutline', label: 'Home (outline)', Icon: HomeIcon },
  tag: { key: 'tag', label: 'Tag', Icon: Tag },
  generic: { key: 'generic', label: 'Price tag', Icon: IconGeneric },
};

export const CATEGORY_ICON_LIST: IconOption[] = Object.values(CATEGORY_ICONS);

export const getCategoryIcon = (key?: string): IconComponent =>
  (key && CATEGORY_ICONS[key]?.Icon) || IconGeneric;
