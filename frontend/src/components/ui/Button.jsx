function Button({ fullWidth = false, shrink = false, size = 'md', className = '', children, ...props }) {
  const shadow = size === 'sm' ? 'shadow-pixel-btn-sm' : 'shadow-pixel-btn'
  const pad = size === 'sm' ? 'px-3 py-2' : 'px-4 py-3'
  const classes = [
    'inline-flex min-h-[44px] items-center justify-center gap-2',
    'border-4 border-ss-btn-bd bg-white',
    pad,
    'text-[10px] uppercase leading-none tracking-wide text-ss-btn-fg',
    shadow,
    'transition-[transform,background-color,color,box-shadow] duration-100',
    // Pixel "pop" on hover: lift toward the shadow and invert to black-on-white → white-on-black.
    'enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:bg-black enabled:hover:text-white',
    // Pixel "press" on click: sink back down and drop the shadow.
    'enabled:active:translate-x-0 enabled:active:translate-y-0.5 enabled:active:shadow-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black',
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
