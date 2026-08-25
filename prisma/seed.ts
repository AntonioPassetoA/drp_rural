import 'dotenv/config'
import { PrismaClient, UserRole } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'configurada' : 'NÃO CONFIGURADA')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Iniciando seed do banco de dados...')

  // SEGURANÇA: impede a execução do seed demonstrativo em produção.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error(
      'Seed demonstrativo bloqueado em produção. (Se realmente necessário, defina ALLOW_DEMO_SEED=true — não recomendado.)'
    )
  }

  // SEGURANÇA: as senhas vêm SEMPRE de variáveis de ambiente — nunca fixas no código.
  const adminPwd = process.env.SEED_ADMIN_PASSWORD
  const managerPwd = process.env.SEED_MANAGER_PASSWORD
  const agronomistPwd = process.env.SEED_AGRONOMIST_PASSWORD
  if (!adminPwd || !managerPwd || !agronomistPwd) {
    throw new Error(
      'Defina SEED_ADMIN_PASSWORD, SEED_MANAGER_PASSWORD e SEED_AGRONOMIST_PASSWORD no .env antes de rodar o seed (veja .env.example).'
    )
  }

  // Organização demo (tenant raiz de todos os dados de negócio)
  const organization = await prisma.organization.upsert({
    where: { slug: 'fazenda-demo' },
    update: {},
    create: {
      name: 'Fazenda Demo',
      slug: 'fazenda-demo',
      status: 'active',
    },
  })

  console.log('Organização demo criada:', organization.name)

  // Superadmin da plataforma (não pertence a nenhuma organização)
  const adminPassword = await bcrypt.hash(adminPwd, 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@drprural.com' },
    update: { role: 'superadmin' as UserRole, organizationId: null },
    create: {
      email: 'admin@drprural.com',
      password: adminPassword,
      fullName: 'Administrador',
      role: 'superadmin' as UserRole,
      phone: '(11) 99999-9999',
    },
  })

  console.log('Usuário admin criado:', admin.email)

  // Gestor da organização demo
  const managerPassword = await bcrypt.hash(managerPwd, 10)

  const manager = await prisma.user.upsert({
    where: { email: 'gestor@drprural.com' },
    update: { role: 'gestor' as UserRole, organizationId: organization.id },
    create: {
      email: 'gestor@drprural.com',
      password: managerPassword,
      fullName: 'Gestor da Organização',
      role: 'gestor' as UserRole,
      phone: '(11) 98888-8888',
      organizationId: organization.id,
    },
  })

  console.log('Usuário gestor criado:', manager.email)

  // Colaborador (agrônomo) da organização demo
  const agronomistPassword = await bcrypt.hash(agronomistPwd, 10)

  const agronomist = await prisma.user.upsert({
    where: { email: 'agronomo@drprural.com' },
    update: { role: 'colaborador' as UserRole, organizationId: organization.id },
    create: {
      email: 'agronomo@drprural.com',
      password: agronomistPassword,
      fullName: 'Agrônomo Demo',
      role: 'colaborador' as UserRole,
      phone: '(11) 97777-7777',
      organizationId: organization.id,
    },
  })

  console.log('Usuário agrônomo criado:', agronomist.email)

  // Create demo project
  const project = await prisma.project.upsert({
    where: { id: 'demo-project-id' },
    update: { organizationId: organization.id },
    create: {
      id: 'demo-project-id',
      name: 'Projeto DRP Demo',
      description: 'Projeto demonstrativo para teste do sistema DRP Rural Gestão',
      status: 'active',
      startDate: new Date(),
      createdById: admin.id,
      organizationId: organization.id,
    },
  })

  console.log('Projeto demo criado:', project.name)

  // Add members to project
  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: manager.id,
      },
    },
    update: {},
    create: {
      projectId: project.id,
      userId: manager.id,
      roleInProject: 'manager',
      scopeType: 'project',
    },
  })

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: agronomist.id,
      },
    },
    update: {},
    create: {
      projectId: project.id,
      userId: agronomist.id,
      roleInProject: 'agronomist',
      scopeType: 'project',
    },
  })

  console.log('Membros adicionados ao projeto')

  // Create demo municipality
  const municipality = await prisma.municipality.upsert({
    where: { id: 'demo-municipality-id' },
    update: {},
    create: {
      id: 'demo-municipality-id',
      projectId: project.id,
      name: 'Município Demo',
      state: 'SP',
      ibgeCode: '3550308',
      population: 50000,
    },
  })

  console.log('Município demo criado:', municipality.name)

  // Create demo microregion
  const microregion = await prisma.microregion.upsert({
    where: { id: 'demo-microregion-id' },
    update: {},
    create: {
      id: 'demo-microregion-id',
      municipalityId: municipality.id,
      name: 'Microrregião Centro',
      description: 'Área central do município',
      familiesCount: 500,
    },
  })

  console.log('Microrregião demo criada:', microregion.name)

  // Create demo locality
  const locality = await prisma.locality.upsert({
    where: { id: 'demo-locality-id' },
    update: {},
    create: {
      id: 'demo-locality-id',
      microregionId: microregion.id,
      name: 'Comunidade Rural Demo',
      localityType: 'community',
    },
  })

  console.log('Localidade demo criada:', locality.name)

  // Create demo task
  const task = await prisma.task.upsert({
    where: { id: 'demo-task-id' },
    update: {},
    create: {
      id: 'demo-task-id',
      projectId: project.id,
      title: 'Visita de campo inicial',
      description: 'Realizar primeira visita de campo para levantamento inicial',
      taskType: 'task',
      priority: 'high',
      status: 'pending',
      assignedToId: agronomist.id,
      createdById: manager.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      localityId: locality.id,
    },
  })

  console.log('Tarefa demo criada:', task.title)

  console.log('\n✅ Seed concluído com sucesso!')
  // NUNCA imprimir senhas em logs. Os e-mails abaixo são apenas para referência;
  // as senhas foram definidas via variáveis de ambiente (SEED_*_PASSWORD).
  console.log('\n📋 Usuários criados (senhas definidas via .env, não exibidas):')
  console.log('  - admin@drprural.com     (superadmin)')
  console.log('  - gestor@drprural.com    (gestor)')
  console.log('  - agronomo@drprural.com  (colaborador)')
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
