import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { concat, from, Observable, toArray, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Database, ref, set, update, get, DataSnapshot } from '@angular/fire/database';
import { DataSourceService } from '../services/data-source.service';

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
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
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

  constructor(
    private http: HttpClient,
    private database: Database,
    private dataService: DataSourceService
  ) {}

  private checkAbsenceConflict(date: Date): Observable<boolean> {
    const dataSource = localStorage.getItem('dataSource');
    
    const source = dataSource === 'firebase'
      ? from(get(ref(this.database, 'absencje'))).pipe(
          map((snapshot: DataSnapshot) => snapshot.val() ? Object.values(snapshot.val()) as AbsencjaZapis[] : [])
        )
      : this.http.get<AbsencjaZapis[]>('http://localhost:3000/absencje');
  
    return source.pipe(
      map((absences: AbsencjaZapis[]) => {
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        
        return absences.some((absence: AbsencjaZapis) => {
          const absenceStart = new Date(absence.dataOd);
          const absenceEnd = new Date(absence.dataDo);
          absenceStart.setHours(0, 0, 0, 0);
          absenceEnd.setHours(0, 0, 0, 0);
          
          return checkDate >= absenceStart && checkDate <= absenceEnd;
        });
      })
    );
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
  const dataSource = localStorage.getItem('dataSource');
  const startDate = new Date(this.cyklicznyHarmonogram.dataOd);
  const endDate = new Date(this.cyklicznyHarmonogram.dataDo);
  
  // Sprawdzamy konflikty dla wybranych dni
  const dateChecks: Observable<{date: Date, hasConflict: boolean}>[] = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayIndex = currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1;
    
    if (this.cyklicznyHarmonogram.dniTygodnia[dayIndex]) {
      const checkDate = new Date(currentDate);
      dateChecks.push(
        this.checkAbsenceConflict(checkDate).pipe(
          map(hasConflict => ({
            date: new Date(checkDate),
            hasConflict
          }))
        )
      );
    }
    // Właściwe przesunięcie daty
    currentDate = new Date(currentDate.getTime() + (24 * 60 * 60 * 1000));
  }

  // Czekamy na sprawdzenie wszystkich dat i pobieramy istniejące sloty
  const source: Observable<Harmonogram[]> = dataSource === 'firebase' 
    ? from(get(ref(this.database, 'harmonogram'))).pipe(
        map((snapshot: DataSnapshot) => snapshot.val() ? Object.values(snapshot.val()) as Harmonogram[] : [])
      )
    : this.http.get<Harmonogram[]>('http://localhost:3000/harmonogram');

  // Łączymy sprawdzenie absencji z pobraniem slotów
  forkJoin([forkJoin(dateChecks), source]).subscribe({
    next: ([dateResults, existingSlots]) => {
      // Filtrujemy tylko daty bez konfliktów
      const validDates = dateResults
        .filter(result => !result.hasConflict)
        .map(result => result.date);

      if (validDates.length === 0) {
        this.showMessage('Wszystkie wybrane terminy kolidują z absencjami');
        return;
      }

      const slots: Harmonogram[] = [];
      
      // Generujemy sloty tylko dla poprawnych dat
      validDates.forEach(date => {
        for (let i = 0; i < this.cyklicznyHarmonogram.godzinyOd.length; i++) {
          const newDate = new Date(date);
          const newSlots = this.generateSlots(
            newDate,
            this.cyklicznyHarmonogram.godzinyOd[i],
            this.cyklicznyHarmonogram.godzinyDo[i]
          ).map(slot => ({
            ...slot,
            data: newDate.toLocaleDateString('en-CA') // Format YYYY-MM-DD
          }));
          
          const uniqueSlots = newSlots.filter(newSlot => 
            !this.checkIfSlotExists(newSlot, existingSlots)
          );
          slots.push(...uniqueSlots);
        }
      });

      if (slots.length === 0) {
        this.showMessage('Wszystkie terminy już istnieją w harmonogramie');
        return;
      }

      // Zapis do odpowiedniego źródła
      if (dataSource === 'firebase') {
        const updates: { [key: string]: any } = {};
        slots.forEach(slot => {
          const slotId = Math.random().toString(36).substr(2, 4);
          updates[`harmonogram/${slotId}`] = { ...slot, id: slotId };
        });

        update(ref(this.database), updates)
          .then(() => {
            this.showMessage(`Pomyślnie zapisano ${slots.length} nowych terminów`);
          })
          .catch(err => {
            this.showMessage('Błąd podczas zapisywania harmonogramu');
            console.error('Error:', err);
          });
      } else {
        const saveObservables = slots.map(slot => 
          this.http.post('http://localhost:3000/harmonogram', slot)
        );

        concat(...saveObservables).pipe(
          toArray()
        ).subscribe({
          next: () => {
            this.showMessage(`Pomyślnie zapisano ${slots.length} nowych terminów`);
          },
          error: (err) => {
            this.showMessage('Błąd podczas zapisywania harmonogramu');
            console.error('Error:', err);
          }
        });
      }
    },
    error: (err) => {
      this.showMessage('Błąd podczas sprawdzania konfliktów');
      console.error('Error:', err);
    }
  });
}

  zapiszTerminJednorazowy() {
  const checkDate = new Date(this.jednorazowyTermin.data);
  
  // Najpierw sprawdź konflikty z absencjami
  this.checkAbsenceConflict(checkDate).subscribe({
    next: (hasConflict) => {
      if (hasConflict) {
        this.showMessage('Nie można dodać terminów - wybrana data koliduje z absencją');
        return;
      }

      // Jeśli nie ma konfliktu, kontynuuj dodawanie terminów
      const dataSource = localStorage.getItem('dataSource');
      const source: Observable<Harmonogram[]> = dataSource === 'firebase' 
        ? from(get(ref(this.database, 'harmonogram'))).pipe(
            map((snapshot: DataSnapshot) => {
              const data = snapshot.val();
              return data ? Object.values(data) as Harmonogram[] : [];
            })
          )
        : this.http.get<Harmonogram[]>('http://localhost:3000/harmonogram');

      source.subscribe({
        next: (existingSlots: Harmonogram[]) => {
          const newSlots = this.generateSlots(
            new Date(this.jednorazowyTermin.data),
            this.jednorazowyTermin.godzinaOd,
            this.jednorazowyTermin.godzinaDo
          );

          const uniqueSlots = newSlots.filter(newSlot => 
            !this.checkIfSlotExists(newSlot, existingSlots)
          );

          if (uniqueSlots.length === 0) {
            this.showMessage('Wszystkie terminy już istnieją w harmonogramie');
            return;
          }

          if (dataSource === 'firebase') {
            uniqueSlots.forEach(slot => {
              const slotWithId = { ...slot, id: Math.random().toString(36).substr(2, 4) };
              set(ref(this.database, `harmonogram/${slotWithId.id}`), slotWithId)
                .then(() => {
                  this.showMessage(`Pomyślnie zapisano ${uniqueSlots.length} nowych terminów`);
                })
                .catch(err => {
                  this.showMessage('Błąd podczas zapisywania terminu');
                  console.error('Error:', err);
                });
            });
          } else {
            const saveObservables = uniqueSlots.map(slot => 
              this.http.post('http://localhost:3000/harmonogram', slot)
            );

            concat(...saveObservables).pipe(
              toArray()
            ).subscribe({
              next: () => {
                this.showMessage(`Pomyślnie zapisano ${uniqueSlots.length} nowych terminów`);
              },
              error: (err) => {
                this.showMessage('Błąd podczas zapisywania terminu');
                console.error('Error:', err);
              }
            });
          }
        }
      });
    }
  });
}

  zapiszAbsencje() {
  const dataSource = localStorage.getItem('dataSource');
  
  // Pobierz dane z odpowiedniego źródła
  const source: Observable<Harmonogram[]> = dataSource === 'firebase' 
    ? from(get(ref(this.database, 'harmonogram'))).pipe(
        map((snapshot: DataSnapshot) => snapshot.val() ? Object.values(snapshot.val()) : [])
      )
    : this.http.get<Harmonogram[]>('http://localhost:3000/harmonogram');

  source.subscribe({
    next: (current: Harmonogram[]) => {
      const startDate = new Date(this.absencja.dataOd);
      const endDate = new Date(this.absencja.dataDo);
      
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      const slotsToUpdate = current.filter((slot: Harmonogram) => {
        const slotDate = new Date(slot.data);
        slotDate.setHours(0, 0, 0, 0);
        return slotDate >= startDate && slotDate <= endDate;
      });


      const absencjaId = Math.random().toString(36).substr(2, 4);
      const absencjaZapis: AbsencjaZapis = {
        id: absencjaId,
        dataOd: startDate.toLocaleDateString('en-CA'),
        dataDo: endDate.toLocaleDateString('en-CA'),
        powod: this.absencja.powod
      };

      if (dataSource === 'firebase') {
        const updates: { [key: string]: any } = {};
        
        slotsToUpdate.forEach((slot: Harmonogram) => {
          updates[`harmonogram/${slot.id}`] = {
            ...slot,
            status: 'odwołany',
            informacje: `Absencja: ${this.absencja.powod}`
          };
        });
        
        updates[`absencje/${absencjaId}`] = absencjaZapis;

        update(ref(this.database), updates)
          .then(() => {
            this.showMessage(`Pomyślnie zapisano absencję i zaktualizowano ${slotsToUpdate.length} terminów`);
            window.location.reload();
          })
          .catch(err => {
            this.showMessage('Błąd podczas zapisywania absencji');
            console.error('Error:', err);
          });
      } else {
        const updateObservables = slotsToUpdate.map((slot: Harmonogram) => 
          this.http.put(`http://localhost:3000/harmonogram/${slot.id}`, {
            ...slot,
            status: 'odwołany',
            informacje: `Absencja: ${this.absencja.powod}`
          })
        );

        const absenceObservable = this.http.post('http://localhost:3000/absencje', absencjaZapis);
        
        concat(...updateObservables, absenceObservable).pipe(
          toArray()
        ).subscribe({
          next: () => {
            this.showMessage(`Pomyślnie zapisano absencję i zaktualizowano ${slotsToUpdate.length} terminów`);
            window.location.reload();
          },
          error: (err) => {
            this.showMessage('Błąd podczas zapisywania absencji');
            console.error('Error:', err);
          }
        });
      }
    }
  });
}
}
