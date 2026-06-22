function FormInput({ id, label, className = '', ...props }) {
  return (
    <div className={className}>
      {label ? (
        <label htmlFor={id} className="block text-lg font-black text-white">
          {label}
        </label>
      ) : null}
      <input
        id={id}
        className={[
          label ? 'mt-3' : '',
          'w-full border-4 border-ss-rule bg-ss-inset px-4 py-3 text-base font-bold text-white shadow-pixel-md outline-none placeholder:text-ss-subtle focus:border-white focus:ring-4 focus:ring-white/20 disabled:cursor-not-allowed disabled:bg-ss-disabled disabled:text-ss-muted',
        ].filter(Boolean).join(' ')}
        {...props}
      />
    </div>
  )
}

export default FormInput
