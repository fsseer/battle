import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'gold'
type Size = 'sm' | 'md' | 'lg'

interface ArenaButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const variantToClass: Record<Variant, string> = {
  primary: 'landscape-btn',
  secondary: 'landscape-btn landscape-btn-secondary',
  danger: 'landscape-btn landscape-btn-danger',
  success: 'landscape-btn landscape-btn-success',
  ghost: 'ghost-btn',
  gold: 'gold-btn',
}

const sizeToStyle: Record<Size, React.CSSProperties> = {
  sm: { padding: '8px 12px', fontSize: 12 },
  md: { padding: '12px 16px', fontSize: 14 },
  lg: { padding: '16px 20px', fontSize: 16 },
}

export default function ArenaButton({
  variant = 'primary',
  size = 'md',
  children,
  ...rest
}: ArenaButtonProps) {
  const className = variantToClass[variant]
  const style = sizeToStyle[size]
  return (
    <button className={className} style={style} {...rest}>
      {children}
    </button>
  )
}
