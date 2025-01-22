import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConsultationBookingComponent } from '../consultation-booking/consultation-booking.component';

interface Pacjent {
  imie: string;
  nazwisko: string;
  wiek: number;
  plec: string;
}

interface Harmonogram {
  data: string;
  godzina: string;
  status: string;
  typKonsultacji: string | null;
  pacjent: Pacjent | null;
  informacje: string | null;
  id ?: number;
}

interface AbsencjaZapis {
  id?: string;
  dataOd: string;
  dataDo: string;
  powod: string;
}

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css'],
  standalone: true,
  imports: [CommonModule, HttpClientModule, MatTooltipModule,RouterModule, MatDialogModule]
})
export class CalendarComponent implements OnInit {
  harmonogram: Harmonogram[] = [];
  weekDays: Date[] = [];
  timeSlots: string[] = [];
  currentWeek: number = 0;
  startHour: number = 8;
  endHour: number = 14; // 6 hour window
  currentTime: Date = new Date();
  currentTimePosition: number = 0;
  absences: AbsencjaZapis[] = [];
  
  constructor(private http: HttpClient, private dialog: MatDialog) {
    // Aktualizuj co minutę
    setInterval(() => {
      this.currentTime = new Date();
      this.adjustVisibleHours();
    }, 60000);

    // Nasłuchuj zmiany rozmiaru okna
    window.addEventListener('resize', () => {
      this.adjustVisibleHours();
    });
  }


  ngOnInit(): void {
    this.generateWeekDays();
    this.generateTimeSlots();
    this.loadSchedule();
    this.loadAbsences();
    
    // Dostosuj ilość wyświetlanych slotów na podstawie wysokości ekranu
    this.adjustVisibleHours();
  }

  isCurrentDay(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  }

  isCurrentTimeSlot(date: Date, time: string): boolean {
    if (!this.isCurrentDay(date)) return false;
    
    const [hours, minutes] = time.split(':').map(Number);
    const currentHours = this.currentTime.getHours();
    const currentMinutes = this.currentTime.getMinutes();
    
    // Sprawdź czy obecny czas mieści się w 30-minutowym slocie
    const slotStartMinutes = hours * 60 + minutes;
    const currentTotalMinutes = currentHours * 60 + currentMinutes;
    
    return currentTotalMinutes >= slotStartMinutes && 
           currentTotalMinutes < slotStartMinutes + 30;
  }

  isPastSlot(date: Date, time: string): boolean {
    const slotDate = new Date(date);
    const [hours, minutes] = time.split(':').map(Number);
    slotDate.setHours(hours, minutes);
    return slotDate < this.currentTime;
  }

  getConsultationsCount(date: Date): number {
    const dateString = date.toLocaleDateString('en-CA');
    return this.harmonogram.filter(slot => 
      slot.data === dateString && slot.status === 'zarezerwowany'
    ).length;
  }

  getSlotColor(slot: Harmonogram): string {
    if (slot.status === 'odwołany') {
      return '#ffcdd2'; // Light red for cancelled slots
    }
    if (slot.status !== 'zarezerwowany') return '';
    
    const slotDate = new Date(slot.data + 'T' + slot.godzina);
    if (slotDate < this.currentTime) {
      return '#999999'; // Szary kolor dla minionych wizyt
    }
    
    switch(slot.typKonsultacji) {
      case 'pierwsza wizyta': return '#ffcc99';
      case 'wizyta kontrolna': return '#99ff99';
      case 'badanie': return '#99ccff';
      case 'wizyta nagła': return '#d4fa00';
      case 'recepta': return '#ff99ff';
      default: return '#9999ff';
    }
  }

  loadSchedule() {
    this.http.get<Harmonogram[]>('http://localhost:3000/harmonogram').subscribe(data => {
      console.log('Data loaded', data);
      this.harmonogram = data;
    }, error => {
      console.error('Error loading data', error);
    });
  }

  loadAbsences() {
    this.http.get<AbsencjaZapis[]>('http://localhost:3000/absencje')
      .subscribe({
        next: (absences) => {
          this.absences = absences;
          // Odświeżamy widok po załadowaniu absencji
          this.generateWeekDays();
        },
        error: (error) => {
          console.error('Error loading absences:', error);
        }
      });
  }

  generateWeekDays() {
    const today = new Date();
    const firstDayOfWeek = new Date(today); // Tworzymy nową instancję
    
    // Ustawiamy na początek tygodnia (poniedziałek)
    firstDayOfWeek.setDate(today.getDate() - today.getDay() + 1);
    
    // Dodajemy offset dla wybranego tygodnia
    firstDayOfWeek.setDate(firstDayOfWeek.getDate() + (this.currentWeek * 7));
    
    this.weekDays = [];
    for (let i = 0; i < 7; i++) {
      // Tworzymy nową instancję dla każdego dnia
      const day = new Date(firstDayOfWeek);
      day.setDate(firstDayOfWeek.getDate() + i);
      this.weekDays.push(day);
    }
  }

  generateTimeSlots() {
    this.timeSlots = [];
    // Upewniamy się, że nie przekraczamy 24 godzin
    const actualEndHour = Math.min(24, this.endHour);
    for (let hour = this.startHour; hour < actualEndHour; hour++) {
      this.timeSlots.push(`${String(Math.floor(hour)).padStart(2, '0')}:00`);
      this.timeSlots.push(`${String(Math.floor(hour)).padStart(2, '0')}:30`);
    }
  }


  getSlotsForDayAndTime(date: Date, time: string): Harmonogram[] {
    // Zmieniamy z toISOString() na toLocaleDateString()
    const dateString = date.toLocaleDateString('en-CA'); // Format YYYY-MM-DD
    return this.harmonogram.filter(slot => slot.data === dateString && slot.godzina === time);
  }

  isReserved(slot: Harmonogram): boolean {
    return slot.status === 'zarezerwowany';
  }

  previousWeek() {
    this.currentWeek--;
    this.generateWeekDays();
  }

  nextWeek() {
    this.currentWeek++;
    this.generateWeekDays();
  }

  updateHours(event: any) {
    const newStartHour = parseFloat(event.target.value);
    
    // Zwiększamy maksymalną godzinę początkową z 18 na 23
    if (newStartHour > 23) {
      this.startHour = 23;
    } else {
      this.startHour = newStartHour;
    }
  
    const viewportHeight = window.innerHeight;
    const headerHeight = 150;
    const footerHeight = 100;
    const slotHeight = 60;
    
    const availableHeight = viewportHeight - headerHeight - footerHeight;
    const possibleSlots = Math.floor(availableHeight / slotHeight);
    const numberOfSlots = Math.min(12, Math.max(4, possibleSlots));
    const numberOfHours = Math.ceil(numberOfSlots / 2);
    
    // Zmieniamy limit z 24 na 23.5 aby umożliwić slot 23:30
    this.endHour = Math.min(24, this.startHour + numberOfHours);
    
    // Jeśli końcowa godzina przekracza 23.5, cofamy godzinę początkową
    if (this.endHour >= 24) {
      this.startHour = 24 - numberOfHours;
    }
    
    this.generateTimeSlots();
  }


  adjustVisibleHours(): void {
  const viewportHeight = window.innerHeight;
  const headerHeight = 150;
  const footerHeight = 100;
  const slotHeight = 60;
  
  // Oblicz ile slotów zmieści się na ekranie
  const availableHeight = viewportHeight - headerHeight - footerHeight;
  const possibleSlots = Math.floor(availableHeight / slotHeight);
  
  // Oblicz liczbę godzin (2 sloty na godzinę)
  const numberOfHours = Math.ceil(possibleSlots / 2);
  
  // Ustaw końcową godzinę na podstawie godziny startowej i dostępnej przestrzeni
  this.endHour = Math.min(24, this.startHour + numberOfHours);
  
  // Jeśli końcowa godzina przekracza 24, cofnij godzinę początkową
  if (this.endHour >= 24) {
    this.startHour = 24 - numberOfHours;
    this.endHour = 24;
  }
  
  this.generateTimeSlots();
}
  handleScroll(event: WheelEvent) {
    event.preventDefault(); // Zapobiegaj domyślnemu scrollowaniu strony
    
    const scrollStep = 1; // Zmiana o 1 godzinę
    if (event.deltaY > 0) { // Scroll w dół
      const newStartHour = Math.min(23, this.startHour + scrollStep);
      this.updateHours({ target: { value: newStartHour } });
    } else { // Scroll w górę
      const newStartHour = Math.max(0, this.startHour - scrollStep);
      this.updateHours({ target: { value: newStartHour } });
    }
  }
  getTooltipContent(slot: Harmonogram): string {
  if (!slot) return '';
  
  let content = `Status: ${slot.status}\n`;
  
  // Show detailed info for both reserved and cancelled-reserved slots
  if (slot.status === 'zarezerwowany' || (slot.status === 'odwołany' && slot.typKonsultacji)) {
    content += `
      Typ konsultacji: ${slot.typKonsultacji}
      Data: ${slot.data}
      Godzina: ${slot.godzina}
      
      Pacjent: ${slot.pacjent?.imie} ${slot.pacjent?.nazwisko}
      Wiek: ${slot.pacjent?.wiek}
      Płeć: ${slot.pacjent?.plec}
      
      Informacje: ${slot.informacje}
    `.trim();
  } else if (slot.status === 'odwołany') {
    content += `
      Data: ${slot.data}
      Godzina: ${slot.godzina}
      Informacje: ${slot.informacje}
    `.trim();
  } else {
    content += `
      Wolny termin
      Data: ${slot.data}
      Godzina: ${slot.godzina}
    `.trim();
  }
  
  return content;
}

  isAbsenceDay(date: Date): boolean {
  if (!this.absences || !date) return false;
  
  // Konwertujemy datę do formatu YYYY-MM-DD dla poprawnego porównania
  const currentDate = new Date(date.getTime());
  currentDate.setHours(0, 0, 0, 0);
  const dateString = currentDate.toISOString().split('T')[0];

  return this.absences.some(absence => {
    const absenceStart = new Date(absence.dataOd);
    const absenceEnd = new Date(absence.dataDo);
    absenceStart.setHours(0, 0, 0, 0);
    absenceEnd.setHours(0, 0, 0, 0);
    
    return currentDate >= absenceStart && currentDate <= absenceEnd;
  });
}

  onSlotClick(slot: Harmonogram) {
  if (slot.status === 'zarezerwowany') {
    // Show confirmation dialog before cancelling
    if (confirm('Czy na pewno chcesz anulować tę rezerwację?')) {
      const resetSlot = {
        ...slot,
        status: 'wolny',
        typKonsultacji: null,
        pacjent: null,
        informacje: null
      };

      this.http.put(`http://localhost:3000/harmonogram/${slot.id}`, resetSlot)
        .subscribe({
          next: () => {
            this.loadSchedule(); // Refresh the calendar
          },
          error: (error) => {
            console.error('Error cancelling reservation:', error);
          }
        });
    }
  } else if (slot.status === 'wolny') {
    // Existing booking dialog logic
    const dialogRef = this.dialog.open(ConsultationBookingComponent, {
      width: '480px',
      maxHeight: '90vh',
      data: { slot: slot },
      panelClass: 'booking-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadSchedule();
      }
    });
  }
}
}