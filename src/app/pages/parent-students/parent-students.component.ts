import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Database, ref, get, set, push  } from '@angular/fire/database';
import { FormsModule } from '@angular/forms';
import { NgForOf, NgIf } from '@angular/common';

 export interface Child {
  birthday: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  likedTeacherId: string;
  password: string;
  role: string;
  schoolGrade: string;
  uid: string;
}

@Component({
  selector: 'app-parent-students',
  imports: [FormsModule, NgIf, NgForOf],
  templateUrl: './parent-students.component.html',
  styleUrl: './parent-students.component.css'
})

export class ParentStudentsComponent implements OnInit {
  parentId: string='';
 children: Child[] = [];
  childrenIds: string[] = [];
  selectedChildId: string = '';

  constructor( private auth : AuthService, private db : Database ){}
  
  ngOnInit(): void {
   this.auth.getCurrentUserWithRole().subscribe(async (user) => {
      if (user && user.role === 'Parent') {
        this.parentId = user.uid;

        const snapshot = await get(ref(this.db, `users/${this.parentId}/linkedChildrenIds`));
        if (snapshot.exists()) {
          this.childrenIds = Object.values(snapshot.val());

          for (let childId of this.childrenIds) {
            const childSnap = await get(ref(this.db, `users/${childId}`));
            if (childSnap.exists()) {
              const childData = childSnap.val();
              this.children.push(childData as Child);
              console.log('Loaded child:', childData);
            }
          }
        }
      } else {
        console.log('User not found or not a parent');
      }
    });
 }
 //GET INFO 
get selectedChild(): Child | undefined {
  return this.children.find(child => child.uid === this.selectedChildId);
}

}

