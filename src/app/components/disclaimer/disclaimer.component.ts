import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from "@angular/material/dialog";

@Component({
  selector: 'app-disclaimer',
  templateUrl: './disclaimer.component.html',
  styleUrls: ['./disclaimer.component.scss']
})
export class DisclaimerComponent implements OnInit {

  constructor(
      @Inject(MAT_DIALOG_DATA) public data,
      ) { }

  ngOnInit() {
  }

  public okAction(): void {
    if (this.data.actions && this.data.actions.success) {
      this.data.actions.success();
    }
  }

}
