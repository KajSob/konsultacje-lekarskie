import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';


export const patientGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  return authService.hasRole('patient').pipe(
    map(canActivate => canActivate || router.createUrlTree(['/']))
  );
};

export const doctorGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  return authService.getCurrentUser().pipe(
    take(1),
    map(user => {
      if (!user) {
        alert('Musisz być zalogowany aby uzyskać dostęp do tej strony');
        router.navigate(['/']);
        return false;
      }
      
      if (user.role !== 'doctor' && user.role !== 'admin') {
        alert('Tylko lekarz lub administrator ma dostęp do zarządzania harmonogramem');
        router.navigate(['/']);
        return false;
      }
      
      return true;
    })
  );
};

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  return authService.hasRole('admin').pipe(
    take(1),
    map(canActivate => {
      if (!canActivate) {
        alert('Brak uprawnień do wyświetlenia tej strony');
        router.navigate(['/']);
        return false;
      }
      return true;
    })
  );
};