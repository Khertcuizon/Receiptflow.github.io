import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { IconButton } from '@/components/ui/Button';

export function ThemeToggle() {
  const { resolved, toggle } = useTheme();
  const dark = resolved === 'dark';
  return (
    <IconButton label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggle}>
      {dark ? <Sun className="size-[1.15rem]" aria-hidden="true" /> : <Moon className="size-[1.15rem]" aria-hidden="true" />}
    </IconButton>
  );
}
