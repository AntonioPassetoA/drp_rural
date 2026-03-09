import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { ProjectForm } from '@/modules/projects/components/project-form'

export default function NewProjectPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Novo Projeto"
        description="Crie um novo projeto de DRP"
      />

      <Card>
        <CardContent className="pt-6">
          <ProjectForm />
        </CardContent>
      </Card>
    </div>
  )
}
