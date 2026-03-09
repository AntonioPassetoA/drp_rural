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

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@drprural.com' },
    update: {},
    create: {
      email: 'admin@drprural.com',
      password: adminPassword,
      fullName: 'Administrador',
      role: 'platform_admin' as UserRole,
      phone: '(11) 99999-9999',
    },
  })

  console.log('Usuário admin criado:', admin.email)

  // Create demo project manager
  const managerPassword = await bcrypt.hash('manager123', 10)

  const manager = await prisma.user.upsert({
    where: { email: 'gestor@drprural.com' },
    update: {},
    create: {
      email: 'gestor@drprural.com',
      password: managerPassword,
      fullName: 'Gestor de Projeto',
      role: 'project_manager' as UserRole,
      phone: '(11) 98888-8888',
    },
  })

  console.log('Usuário gestor criado:', manager.email)

  // Create demo agronomist
  const agronomistPassword = await bcrypt.hash('agronomo123', 10)

  const agronomist = await prisma.user.upsert({
    where: { email: 'agronomo@drprural.com' },
    update: {},
    create: {
      email: 'agronomo@drprural.com',
      password: agronomistPassword,
      fullName: 'Agrônomo Demo',
      role: 'agronomist' as UserRole,
      phone: '(11) 97777-7777',
    },
  })

  console.log('Usuário agrônomo criado:', agronomist.email)

  // Create demo project
  const project = await prisma.project.upsert({
    where: { id: 'demo-project-id' },
    update: {},
    create: {
      id: 'demo-project-id',
      name: 'Projeto DRP Demo',
      description: 'Projeto demonstrativo para teste do sistema DRP Rural Gestão',
      status: 'active',
      startDate: new Date(),
      createdById: admin.id,
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
  console.log('\n📋 Credenciais de acesso:')
  console.log('  Admin: admin@drprural.com / admin123')
  console.log('  Gestor: gestor@drprural.com / manager123')
  console.log('  Agrônomo: agronomo@drprural.com / agronomo123')
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
