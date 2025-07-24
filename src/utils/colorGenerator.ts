
// Predefined color palette for subwallets
const SUBWALLET_COLORS = [
  'blue', 'green', 'purple', 'yellow', 'red', 'indigo', 'pink', 'cyan', 'orange', 'emerald',
  'teal', 'lime', 'amber', 'rose', 'violet', 'sky', 'slate', 'zinc', 'neutral', 'stone'
];

export const getAvailableColor = (usedColors: string[]): string => {
  // Find colors that haven't been used yet
  const availableColors = SUBWALLET_COLORS.filter(color => !usedColors.includes(color));
  
  // If all colors are used, start reusing from the beginning
  if (availableColors.length === 0) {
    return SUBWALLET_COLORS[Math.floor(Math.random() * SUBWALLET_COLORS.length)];
  }
  
  // Return a random available color
  return availableColors[Math.floor(Math.random() * availableColors.length)];
};

export const getAllUsedColors = (subWallets: any[]): string[] => {
  return subWallets.map(sw => sw.color).filter(Boolean);
};
