import { UsersService } from './src/be/modules/users/users.service'
import { UsersRepository } from './src/be/modules/users/users.repository'

async function test() {
  const repo = new UsersRepository()
  const svc = new UsersService(repo)
  
  try {
    console.log('Testing getPaginatedUsers...')
    const data = await svc.getPaginatedUsers('', '', '', null, 'newest', 0, 20)
    console.log('getPaginatedUsers OK:', data.length)
  } catch (err) {
    console.error('getPaginatedUsers Error:', err)
  }

  try {
    console.log('Testing getGlobalStats...')
    const stats = await svc.getGlobalStats()
    console.log('getGlobalStats OK:', stats)
  } catch (err) {
    console.error('getGlobalStats Error:', err)
  }
}

test()
