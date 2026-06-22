function SectionCard({ as: Tag = 'div', className = '', children, ...props }) {
  return (
    <Tag className={`border-4 border-ss-border bg-ss-surface p-6 ${className}`} {...props}>
      {children}
    </Tag>
  )
}

export default SectionCard
