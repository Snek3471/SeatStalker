function FormInput({ id, label, error = false, className = '', ...props }) {
  return (
    <div className={className}>
      {label ? (
        <label htmlFor={id} className="block pf-label uppercase text-white">
          {label}
        </label>
      ) : null}
      <input
        id={id}
        aria-invalid={error || undefined}
        className={[
          label ? 'mt-2' : '',
          // 16px input text keeps iOS from auto-zooming on focus during the mobile panic flow.
          'w-full border-4 bg-ss-inset px-4 py-3 text-[16px] text-white shadow-pixel-md outline-none',
          'placeholder:text-ss-subtle',
          'focus:border-white focus:shadow-pixel-white focus:ring-4 focus:ring-white/25',
          'disabled:cursor-not-allowed disabled:bg-ss-disabled disabled:text-ss-muted',
          error ? 'border-white' : 'border-ss-rule',
        ].filter(Boolean).join(' ')}
        {...props}
      />
    </div>
  )
}

export default FormInput
