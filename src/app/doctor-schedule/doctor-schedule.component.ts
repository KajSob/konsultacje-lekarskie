import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { concat, forkJoin, switchMap, tap, toArray } from 'rxjs';

interface Harmonogram {
  data: string;
  godzina: string;
  status: string;
  typKonsultacji: string | null;
  pacjent: null;
  informacje: string | null;
  id?: number;  
}

interface CyklicznyHarmonogram {
  dataOd: Date;
  dataDo: Date;
  dniTygodnia: boolean[];
  godzinyOd: string[];
  godzinyDo: string[];
}

interface JednorazowyTermin {
  data: Date;
  godzinaOd: string;
  godzinaDo: string;
}

interface Absencja {
  dataOd: Date;
  dataDo: Date;
  powod: string;
}
interface AbsencjaZapis {
  id?: string;
  dataOd: string;
  dataDo: string;
  powod: string;
}

@Component({
  selector: 'app-doctor-schedule',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HttpClientModule
  ],
  templateUrl: './doctor-schedule.component.html',
  styleUrls: ['./doctor-schedule.component.css']
})
export class DoctorScheduleComponent {
  dniTygodnia = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
  godziny = Array.from({length: 48}, (_, i) => {
    const hour = Math.floor(i/2);
    const minute = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  });

  cyklicznyHarmonogram: CyklicznyHarmonogram = {
    dataOd: new Date(),
    dataDo: new Date(),
    dniTygodnia: Array(7).fill(false),
    godzinyOd: [''],
    godzinyDo: ['']
  };

  jednorazowyTermin: JednorazowyTermin = {
    data: new Date(),
    godzinaOd: '',
    godzinaDo: ''
  };

  absencja: Absencja = {
    dataOd: new Date(),
    dataDo: new Date(),
    powod: ''
  };

  messageVisible = false;
  message = '';

  constructor(private http: HttpClient) {}

  private checkAbsenceConflict(date: Date): Promise<boolean> {
    return this.http.get<AbsencjaZapis[]>('http://localhost:3000/absencje')
      .toPromise()
      .then(absencje => {
        if (!absencje) return false;
        
        return absencje.some(absencja => {
          const absencjaOd = new Date(absencja.dataOd);
          const absencjaDo = new Date(absencja.dataDo);
          return date >= absencjaOd && date <= absencjaDo;
        });
      });
  }

  private generateSlots(date: Date, startTime: string, endTime: string): Harmonogram[] {
    const slots: Harmonogram[] = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    let currentTime = new Date(date);
    currentTime.setHours(startHour, startMinute, 0, 0);
    const endDateTime = new Date(date);
    endDateTime.setHours(endHour, endMinute, 0, 0);
  
    while (currentTime < endDateTime) {
      const formattedDate = currentTime.toLocaleDateString('en-CA');
      
      slots.push({
        data: formattedDate,
        godzina: `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`,
        status: 'wolny',
        typKonsultacji: null,
        pacjent: null,
        informacje: null
      });
      currentTime.setMinutes(currentTime.getMinutes() + 30);
    }
    
    return slots;
  }

  private showMessage(text: string) {
    this.message = text;
    this.messageVisible = true;
    setTimeout(() => {
      this.messageVisible = false;
      this.message = '';
    }, 3000); // Changed from 3000 to 5000 milliseconds (5 seconds)
  }

  dodajPrzedzialCzasowyCykliczny() {
    this.cyklicznyHarmonogram.godzinyOd.push('');
    this.cyklicznyHarmonogram.godzinyDo.push('');
  }

  usunPrzedzialCzasowyCykliczny(index: number) {
    this.cyklicznyHarmonogram.godzinyOd.splice(index, 1);
    this.cyklicznyHarmonogram.godzinyDo.splice(index, 1);
  }

  private checkIfSlotExists(newSlot: Harmonogram, existingSlots: Harmonogram[]): boolean {
    return existingSlots.some(slot => 
      slot.data === newSlot.data && slot.godzina === newSlot.godzina
    );
  }

  zapiszHarmonogramCykliczny() {
    this.http.get<Harmonogram[]>('http://localhost:3000/harmonogram').pipe(
      switchMap(existingSlots => {
        const slots: Harmonogram[] = [];
        const startDate = new Date(this.cyklicznyHarmonogram.dataOd);
        const endDate = new Date(this.cyklicznyHarmonogram.dataDo);

        for (let date = startDate; date <= endDate; date.setDate(date.getDate() + 1)) {
          const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
          
          if (this.cyklicznyHarmonogram.dniTygodnia[dayIndex]) {
            for (let i = 0; i < this.cyklicznyHarmonogram.godzinyOd.length; i++) {
              const newSlots = this.generateSlots(
                new Date(date),
                this.cyklicznyHarmonogram.godzinyOd[i],
                this.cyklicznyHarmonogram.godzinyDo[i]
              );
              
              const uniqueSlots = newSlots.filter(newSlot => 
                !this.checkIfSlotExists(newSlot, existingSlots)
              );
              
              slots.push(...uniqueSlots);
            }
          }
        }

        if (slots.length === 0) {
          throw new Error('Wszystkie terminy już istnieją w harmonogramie');
        }

        const saveObservables = slots.map(slot => 
          this.http.post('http://localhost:3000/harmonogram', slot)
        );

        return concat(...saveObservables).pipe(
          toArray(),
          tap(() => {
            this.showMessage(`Pomyślnie zapisano ${slots.length} nowych terminów`);

          })
        );
      })
    ).subscribe({
      error: (err) => {
        this.showMessage(err.message || 'Błąd podczas zapisywania harmonogramu');
        console.error('Error:', err);
      }
    });
  }

  zapiszTerminJednorazowy() {
    this.http.get<Harmonogram[]>('http://localhost:3000/harmonogram').pipe(
      switchMap(existingSlots => {
        const newSlots = this.generateSlots(
          new Date(this.jednorazowyTermin.data),
          this.jednorazowyTermin.godzinaOd,
          this.jednorazowyTermin.godzinaDo
        );

        const uniqueSlots = newSlots.filter(newSlot => 
          !this.checkIfSlotExists(newSlot, existingSlots)
        );

        if (uniqueSlots.length === 0) {
          throw new Error('Wszystkie terminy już istnieją w harmonogramie');
        }

        const saveObservables = uniqueSlots.map(slot => 
          this.http.post('http://localhost:3000/harmonogram', slot)
        );

        return concat(...saveObservables).pipe(
          toArray(),
          tap(() => {
            this.showMessage(`Pomyślnie zapisano ${uniqueSlots.length} nowych terminów`);
          })
        );
      })
    ).subscribe({
      error: (err) => {
        this.showMessage(err.message || 'Błąd podczas zapisywania terminu');
        console.error('Error:', err);
      }
    });
  }

  zapiszAbsencje() {
    this.http.get<Harmonogram[]>('http://localhost:3000/harmonogram')
      .pipe(
        switchMap(current => {
          const startDate = new Date(this.absencja.dataOd);
          const endDate = new Date(this.absencja.dataDo);
          
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          
          // Find ALL slots in date range using string comparison for more reliability
          const slotsToUpdate = current.filter(slot => {
            const slotDate = new Date(slot.data);
            slotDate.setHours(0, 0, 0, 0);
            return slotDate >= startDate && slotDate <= endDate;
          });

          if (slotsToUpdate.length === 0) {
            throw new Error('Brak terminów do aktualizacji w wybranym zakresie');
          }

          // Save absence record
          const absencjaZapis: AbsencjaZapis = {
            dataOd: startDate.toLocaleDateString('en-CA'),
            dataDo: endDate.toLocaleDateString('en-CA'),
            powod: this.absencja.powod
          };

          // Create update observables
          const updateObservables = slotsToUpdate.map(slot => 
            this.http.put(`http://localhost:3000/harmonogram/${slot.id}`, {
              ...slot,
              status: 'odwołany',
              informacje: slot.informacje 
                ? `${slot.informacje}\nAbsencja: ${this.absencja.powod}`
                : `Absencja: ${this.absencja.powod}`,
              typKonsultacji: slot.typKonsultacji,
              pacjent: slot.pacjent
            })
          );

          // Add absence record observable
          const absenceObservable = this.http.post('http://localhost:3000/absencje', absencjaZapis);
          
          // Combine all observables and execute them in sequence
          return concat(
            ...updateObservables,
            absenceObservable
          ).pipe(
            toArray(),
            tap(() => {
              this.showMessage(`Pomyślnie zapisano absencję i zaktualizowano ${slotsToUpdate.length} terminów`);
            })
          );
        })
      ).subscribe({
        error: (err) => {
          this.showMessage(err.message || 'Błąd podczas zapisywania absencji');
          console.error('Error:', err);
        }
      });
  }
}
