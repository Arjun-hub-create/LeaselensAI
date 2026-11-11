type PagePlaceholderProps = {
  title: string
  description: string
}

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <div>
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted-foreground">{description}</p>
      <div className="mt-8 rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        This page is a placeholder. It will be built in a later step.
      </div>
    </div>
  )
}