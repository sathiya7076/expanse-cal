export default function Card({ as: Tag = 'section', className = '', children, ...props }) {
  return (
    <Tag className={`rounded-xl bg-white p-5 ring-1 ring-line sm:p-6 ${className}`} {...props}>
      {children}
    </Tag>
  );
}
