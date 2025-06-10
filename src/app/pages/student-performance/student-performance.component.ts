// import { Component, OnInit } from '@angular/core';
// import { Observable, forkJoin } from 'rxjs';
// import { map } from 'rxjs/operators';
// import { AuthService } from '../../services/auth.service';        // your service
// import { Database, ref, onValue, get } from '@angular/fire/database'; 
// import { NgFor, NgIf, TitleCasePipe } from '@angular/common';

// interface MiniGameSummary {
//   id: string;
//   total: number;
//   correct: number;
//   passed: boolean;
// }

// @Component({
//   selector: 'app-student-performance',
//   templateUrl: './student-performance.component.html',
//   imports: [NgFor, NgIf, TitleCasePipe ],
//   styleUrls: ['./student-performance.component.css']
// })
// export class StudentPerformanceComponent implements OnInit {
//   // 1) Dropdown lists
//   students: Array<{ uid: string; firstName: string; lastName: string }> = [];
//   tests: any[] = [];                   // list of tests for selected student
//   selectedTest: any = null;            // full test object
//   summary: MiniGameSummary[] = [];     // computed summary rows

//   constructor(
//     private auth: AuthService,
//     private db: Database
//   ) {}

//   ngOnInit() {
//     // 1.1) Get current teacher
//     this.auth.getCurrentUserWithRole().subscribe(teacher => {
//       if (!teacher) return;
//       // 1.2) Load all students linked to this teacher
//       const usersRef = ref(this.db, 'users');
//       onValue(usersRef, snap => {
//         const all = snap.val() || {};
//         this.students = Object.entries(all)
//           .filter(([_, u]: any) =>
//             u.role === 'Student' &&
//             u.linkedTeacherId === teacher.uid
//           )
//           .map(([uid, u]: any) => ({
//             uid,
//             firstName: u.firstName,
//             lastName: u.lastName
//           }));
//       });
//     });
//   }

//   // 2) When teacher selects a student
//   onStudentChange(uid: string) {
//     // Fetch the full student object
//     this.auth.getUserData(uid).subscribe((student: any) => {
//       const testsObj = student.tests || {};
//       // Convert { testID: {...} } → [ {..., testID} ]
//       this.tests = Object.entries(testsObj).map(([testID, t]: any) =>
//         ({ testID, ...t })
//       );
//       // Reset downstream selections
//       this.selectedTest = null;
//       this.summary = [];
//     });
//   }

//   // 3) When teacher selects a test
//   onTestChange(testID: string) {
//     // Find the test object
//     this.selectedTest = this.tests.find(t => t.testID === testID);
//     if (!this.selectedTest) return;

//     // Build summary per mini-game
//     this.summary = Object.entries(this.selectedTest.miniGames)
//       .map(([gameId, gameData]: any) => {
//         const entries = Object.entries(gameData)
//           .filter(([key]) => key !== 'isPassed');
//         const correctCount = entries
//           .filter(([_, q]: any) => q.isCorrect).length;
//         return {
//           id:       gameId,
//           total:    entries.length,
//           correct:  correctCount,
//           passed:   gameData.isPassed
//         } as MiniGameSummary;
//       });
//   }

//   // Helper for template: Object.entries in *ngFor
//   objectEntries(obj: any): [string, any][] {
//     return Object.entries(obj || {});
//   }
// }

////////////////////////////////  realtime configue /////////////////////////////////////////////
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Database, ref, onValue, Unsubscribe } from '@angular/fire/database';
import { NgFor, NgIf, TitleCasePipe } from '@angular/common';

interface MiniGameSummary {
  id: string;
  total: number;
  correct: number;
  passed: boolean;
}

@Component({
  selector: 'app-student-performance',
  standalone: true,
  imports: [NgFor, NgIf, TitleCasePipe],
  templateUrl: './student-performance.component.html',
  styleUrls: ['./student-performance.component.css']
})
export class StudentPerformanceComponent implements OnInit, OnDestroy {
  students: Array<{ uid: string; firstName: string; lastName: string }> = [];
  tests: any[] = [];
  selectedTest: any = null;
  summary: MiniGameSummary[] = [];

  private selectedStudentUid: string | null = null;
  private testUnsub: Unsubscribe | null = null;

  constructor( private auth: AuthService, private db: Database ) {}

  ngOnInit() {
    this.auth.getCurrentUserWithRole().subscribe(teacher => {
      if (!teacher) return;
      const usersRef = ref(this.db, 'users');
      onValue(usersRef, snap => {
        const all = snap.val() || {};
        this.students = Object.entries(all)
          .filter(([_, u]: any) =>
            u.role === 'Student' &&
            u.linkedTeacherId === teacher.uid
          )
          .map(([uid, u]: any) => ({
            uid,
            firstName: u.firstName,
            lastName: u.lastName
          }));
      });
    });
  }

  onStudentChange(uid: string) {
    this.selectedStudentUid = uid;
    // unsubscribe any prior test listener
    if (this.testUnsub) {
      this.testUnsub();
      this.testUnsub = null;
    }
    this.selectedTest = null;
    this.summary = [];
    this.tests = [];

    this.auth.getUserData(uid).subscribe((student: any) => {
      const testsObj = student.tests || {};
      this.tests = Object.entries(testsObj).map(([testID, t]: any) =>
        ({ testID, ...t })
      );
    });
  }

  onTestChange(testID: string) {
    if (!this.selectedStudentUid) return;
    // unsubscribe old listener
    if (this.testUnsub) {
      this.testUnsub();
      this.testUnsub = null;
    }
    this.selectedTest = null;
    this.summary = [];

    const testRef = ref(
      this.db,
      `users/${this.selectedStudentUid}/tests/${testID}`
    );
    this.testUnsub = onValue(testRef, snap => {
      const testData = snap.val();
      if (!testData) return;
      this.selectedTest = { testID, ...testData };

      this.summary = Object.entries(testData.miniGames || {})
        .map(([gameId, gameData]: any) => {
          const entries = Object.entries(gameData)
            .filter(([key]) => key !== 'isPassed');
          const correctCount = entries
            .filter(([_, q]: any) => q.isCorrect).length;
          return {
            id:       gameId,
            total:    entries.length,
            correct:  correctCount,
            passed:   gameData.isPassed
          } as MiniGameSummary;
        });
    });
  }

  objectEntries(obj: any): [string, any][] {
    return Object.entries(obj || {});
  }

  ngOnDestroy() {
    if (this.testUnsub) this.testUnsub();
  }
}

