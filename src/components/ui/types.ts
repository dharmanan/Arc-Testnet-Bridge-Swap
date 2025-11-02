import { ReactNode } from 'react'

export interface ContainerProps {
  children: ReactNode
  className?: string
}

export interface CardProps {
  children: ReactNode
  className?: string
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  loading?: boolean
}

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  type?: string
}
