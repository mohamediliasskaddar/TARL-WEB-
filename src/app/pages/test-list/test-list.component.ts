import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Database } from '@angular/fire/database';
import { onValue, ref, update } from 'firebase/database';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-test-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './test-list.component.html',
  styleUrl: './test-list.component.css'
})
export class TestListComponent implements OnInit {
  private db = inject(Database);
  private auth = inject(AuthService);
  private router = inject(Router)

  teacherUID = '';
  allTests: any[] = [];
  filteredTests: any[] = [];
  grades: string[] = [];
  selectedGrade = '';
  testID : any;

  ngOnInit() {
    this.auth.getCurrentUserWithRole().subscribe(user => {
      if (!user) return;
      this.teacherUID = user.uid;

      const testsRef = ref(this.db, 'tests');
      onValue(testsRef, (snapshot) => {
        const all = snapshot.val() || {};
        this.allTests = Object.entries(all)
          .filter(([key, test]: [string, any]) => test.teacherId === this.teacherUID)
          .map(([key, test]: [string, any]) => ({ ...test, id: key }));
        this.grades = [...new Set(this.allTests.map((t: any) => t.grade))];
        console.log("liste of test", this.allTests );
        console.log("liste of grades", this.grades );
        console.log("teacher id ", this.teacherUID );
        this.applyFilter();
      });
    });
  }

  applyFilter() {
    this.filteredTests = this.selectedGrade
      ? this.allTests.filter(t => t.grade === this.selectedGrade)
      : this.allTests;
  }

  editTest(testId: string) {
  this.router.navigate(['/edit-test', testId]);
  }

  toggleDraftStatus(test: any) {
  const newStatus = !test.isDraft;
  const testRef = ref(this.db, `tests/${test.id}`);

  update(testRef, { isDraft: newStatus })
    .then(() => {
      console.log(`Test ${test.testName} is now ${newStatus ? 'draft' : 'published'}`);
      test.isDraft = newStatus; 
    })
    .catch((error) => {
      console.error('Failed to update draft status:', error);
    });
}

}