import { Component, EventEmitter, OnInit, Output} from '@angular/core';
import data from '../models/dataAlignments/output_exon/UniRef50_O75473.json';

@Component({
  selector: 'app-alignment',
  templateUrl: './alignment.component.html',
  styleUrls: ['./alignment.component.css']
})




export class AlignmentComponent implements OnInit {
  @Output() eventClicked = new EventEmitter<Event>();
  uniprotId;

  input;
  rows;

  data: any = data;
  uniprotList = [];
  searchTerm: string;

  constructor() {

    console.log(this.data);
  }

  change(id) {

  this.eventClicked.emit(id);
  }
  ngOnInit(): void {
    const url1 = 'http://repeatsdb.bio.unipd.it/ws/search?';
    const url2 = 'query=average_unit:1TO9999999999&collection=uniprot_protein&show=uniprotid';

    fetch(url1 + url2)
      .then(dt => {

        if (!dt.ok) {
          throw new Error(dt.statusText);
        }
        return dt.json();

      })
      .then( dt => {
        // tslint:disable-next-line:forin
        for (const key in dt) {
            this.uniprotList.push(dt[key].uniprotid);
        }

      });
    const rows = this.generateInp();

    this.input = {
      rows,
      colors: {},
      parameters: {
        fontSize: '12px',
        chunkSize: '5',
        spaceSize: '0',
        log: 'debug'
      }
    };

  }

  generateInp() {

    const rows = {};
    // tslint:disable-next-line:forin
    for (const i in Object.keys(this.data.rows)) {
      const el = {data: this.data.rows[i].data};
      rows[i] = el;
      if (i === '3') {
        break;
      }

    }

    return rows;
  }

}
