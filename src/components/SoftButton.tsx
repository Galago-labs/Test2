import type { ReactNode } from 'react';
import { motion } from 'motion/react';

type DataAttributes = { [name: `data-${string}`]: string | number | boolean | undefined };

export function SoftButton({ children, onClick, className = '', ...dataAttributes }: { children: ReactNode; onClick: () => void; className?: string } & DataAttributes) {
  return <motion.button {...dataAttributes} className={`primary-button ${className}`} onClick={onClick} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.18 }}>{children}</motion.button>;
}
