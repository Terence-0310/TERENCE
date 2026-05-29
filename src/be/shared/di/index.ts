import { Container } from './container';
import { UsersRepository } from '@/src/be/modules/users/users.repository';
import { UsersService } from '@/src/be/modules/users/users.service';

/**
 * Configure dependencies and their resolutions here.
 */
export function setupDependencies() {
  // 1. Register Repositories
  const usersRepo = new UsersRepository();
  Container.register<UsersRepository>('UsersRepository', usersRepo);

  // 2. Register Services
  const usersService = new UsersService(usersRepo);
  Container.register<UsersService>('UsersService', usersService);
}

// Automatically setup dependencies when the file is imported
setupDependencies();

export { Container };
