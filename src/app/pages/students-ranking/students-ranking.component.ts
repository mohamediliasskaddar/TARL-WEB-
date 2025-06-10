import { Component, OnDestroy, OnInit,  } from '@angular/core';
import { Database, ref, onValue, Unsubscribe } from '@angular/fire/database';
import { AuthService } from '../../services/auth.service';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-students-ranking',
  imports: [FormsModule, CommonModule, TitleCasePipe ],
  templateUrl: './students-ranking.component.html',
  styleUrl: './students-ranking.component.css'
})

export class StudentsRankingComponent implements OnInit, OnDestroy {
  students: any[] = [];
  gameIDs: string[] = [];            // all distinct mini-game IDs across tests
  selectedGameID: string = 'all';
  ranking: Array<{ name: string; testsPlayed: number; points: number }> = [];

  private teacherUID: string | undefined;
  private unsubUsers: Unsubscribe | undefined;

  constructor(private auth: AuthService, private db: Database) {}

  ngOnInit() {
    this.auth.getCurrentUserWithRole().subscribe(user => {
      this.teacherUID = user.uid;
      const usersRef = ref(this.db, 'users');
      this.unsubUsers = onValue(usersRef, snap => {
        const all = snap.val() || {};
        // 1) filter students
        this.students = Object.values(all)
          .filter((u: any) => u.role === 'Student' && u.linkedTeacherId === this.teacherUID);

        this.buildRankings();
      });
    });
  }

  ngOnDestroy() {
    if (this.unsubUsers) this.unsubUsers();
  }

  rebuildRanking() {
    this.buildRankings();
  }

  private buildRankings() {
    // Reset accumulators
    const totalScores: Record<string, { name: string; testsPlayed: number; points: number }> = {};
    const perGameScores: Record<string, Record<string, { name: string; testsPlayed: number; points: number }>> = {};

    // Walk through each student
    for (const stu of this.students) {
      totalScores[stu.uid] = { name: `${stu.firstName} ${stu.lastName}`, testsPlayed: 0, points: 0 };
      // Each game map for this student
      // we’ll fill perGameScores[gameId][stu.uid]
    }

    // Collect all game IDs
    const gameSet = new Set<string>();

    // 2) Scan each student’s tests
    for (const stu of this.students) {
      const tests = stu.tests || {}; // { testID: {...} }
      for (const testID in tests) {
        const mg = tests[testID].miniGames || {};
        // increment testsPlayed for overall and per-game
        totalScores[stu.uid].testsPlayed++;
        for (const gameId in mg) {
          gameSet.add(gameId);
          // init perGameScores
          perGameScores[gameId] = perGameScores[gameId] || {};
          if (!perGameScores[gameId][stu.uid]) {
            perGameScores[gameId][stu.uid] = {
              name: `${stu.firstName} ${stu.lastName}`,
              testsPlayed: 0,
              points: 0
            };
          }
          perGameScores[gameId][stu.uid].testsPlayed++;
          // count correct answers
         const rawEntries = Object.entries(mg[gameId] as any)
          .filter(([k]) => k !== 'isPassed');

        for (const [_, unknownQ] of rawEntries) {
          const q = unknownQ as { isCorrect: boolean };
          if (q.isCorrect) {
              totalScores[stu.uid].points++;
              perGameScores[gameId][stu.uid].points++;
            }
          }
        }
      }
    }

    this.gameIDs = Array.from(gameSet);

    // 3) Build the sorted ranking array
    let rows: Array<{ name: string; testsPlayed: number; points: number }> = [];
    if (this.selectedGameID === 'all') {
      rows = Object.values(totalScores);
    } else {
      rows = Object.values(perGameScores[this.selectedGameID] || {});
    }
    // sort desc by points
    this.ranking = rows.sort((a, b) => b.points - a.points);
  }
}

  


