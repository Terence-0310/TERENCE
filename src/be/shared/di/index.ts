import { Container } from './container';
import { UsersRepository } from '@/src/be/modules/users/users.repository';
import { UsersService } from '@/src/be/modules/users/users.service';

/**
 * Configure dependencies and their resolutions here.
 */
export function setupDependencies() {
  // 1. Register Repositories
  Container.registerFactory<UsersRepository>('UsersRepository', () => new UsersRepository());

  // 2. Register Services
  Container.registerFactory<UsersService>('UsersService', () => {
    const usersRepo = Container.resolve<UsersRepository>('UsersRepository');
    return new UsersService(usersRepo);
  });
}

// Automatically setup dependencies when the file is imported
setupDependencies();

export { Container };
