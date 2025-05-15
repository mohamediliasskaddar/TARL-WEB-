import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgIf],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  userRole: string | null = null;
  @Output() sectionSelected = new EventEmitter<string>();
  selectedSection: string = '';

  constructor(private auth: AuthService) {}

  ngOnInit() {
    this.auth.getCurrentUserWithRole().subscribe(user => {
      if (user) this.userRole = user.role;
    });
  }

  select(section: string) {
    this.selectedSection = section; 
    this.sectionSelected.emit(section);
  }
}