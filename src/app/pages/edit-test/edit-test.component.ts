import { Component, inject, OnInit } from '@angular/core';
import { Database, onValue, ref } from '@angular/fire/database';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-edit-test',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule, 
    NgIf,
    NgFor,
    TitleCasePipe,
  ],
  templateUrl: './edit-test.component.html',
  styleUrls: ['./edit-test.component.css']
})
export class EditTestComponent implements OnInit {

  private db        = inject(Database);
  private auth      = inject(AuthService);
  private route     = inject(ActivatedRoute);
  private fb        = inject(FormBuilder);

  testId: string | null = null;
  test!: any;
  form!: FormGroup;
  objectKeys = Object.keys;
  teacherUID!: string;

  ngOnInit(): void {
    this.testId = this.route.snapshot.paramMap.get('id');

    this.auth.getCurrentUserWithRole().subscribe(user => {
      if (!user) return;
      this.teacherUID = user.uid;

      const testRef = ref(this.db, `tests/${this.testId}`);
      onValue(testRef, snapshot => {
        this.test = snapshot.val();
        console.log('Loaded test:', this.test); 
        this.buildForm();
      });
    });
  }

  private buildForm() {
    // 1) Construire d'abord le FormGroup pour miniGameConfigs
    const configsGroup = this.fb.group(
      (Object.entries(this.test.miniGameConfigs) as [string, any][])
        .reduce((acc, [key, val]) => {
          acc[key] = this.fb.group({
            min_number:           [val.min_number],
            max_number:           [val.max_number],
            min_required_answers: [val.min_required_answers],
            num_questions:        [val.num_questions],
            prompt_text:          [val.prompt_text || ''],
            num_steps:            [val.num_steps || ''],
            with_borrowing:       [val.with_borrowing || false],
          });
          return acc;
        }, {} as { [k: string]: FormGroup })
    );

    // 2) Puis l’intégrer dans le FormGroup principal
    this.form = this.fb.group({
      testName:        [this.test.testName],
      testDuration:    [this.test.testDuration],
      miniGameConfigs: configsGroup,
    });
  }

  saveChanges() {
  //to complete it 
   }

}
