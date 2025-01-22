import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { CalendarComponent } from './app/calendar/calendar.component';
import { DoctorScheduleComponent } from './app/doctor-schedule/doctor-schedule.component';

const routes = [
  { path: '', component: CalendarComponent }, 
  { path: 'schedule', component: DoctorScheduleComponent }
];

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes)],
});