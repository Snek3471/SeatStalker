function Button({ fullWidth = false, shrink = false, size = 'md', className = '', children, ...props }) {
  const shadow = size === 'sm' ? 'shadow-pixel-btn-sm' : 'shadow-pixel-btn'
  const classes = [
    'inline-flex min-h-[44px] items-center justify-center gap-2',
    'border-4 border-ss-btn-bd bg-white',
    'px-4 py-3 font-black text-ss-btn-fg',
    shadow,
    'transition enabled:hover:-translate-y-0.5 enabled:hover:bg-ss-btn-hov enabled:active:translate-y-0.5 enabled:active:shadow-none',
    'focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black',
    'disabled:cursor-not-allowed disabled:opacity-60',
    fullWidth && 'w-full',
    shrink && 'shrink-0',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}

export default Button
