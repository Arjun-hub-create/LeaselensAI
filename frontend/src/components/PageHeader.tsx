import { DemoBadge } from '@/components/DemoBadge'

type PageHeaderProps = {
  title: string
  description: string
  demo?: boolean
}

export function PageHeader({ title, description, demo = false }: PageHeaderProps) {
  return (
    <section className="pt-2">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted-foreground">{description}</p>
      {demo ? (
        <div className="mt-4">
          <DemoBadge />
        </div>
      ) : null}
    </section>
  )
}