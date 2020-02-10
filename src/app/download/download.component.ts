import {Component, OnInit} from '@angular/core';
import {DataDownloadModel} from '../models/dataDownload/dataDownload.model';

@Component({
  selector: 'app-download',
  templateUrl: './download.component.html',
  styleUrls: []
})

export class DownloadComponent implements OnInit {

  json;

  ngOnInit(): void {
    this.json = DataDownloadModel.dataTxt;
  }

}
