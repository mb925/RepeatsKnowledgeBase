import { Component, EventEmitter, OnInit, Output} from '@angular/core';
import data from '../models/dataAlignments/output_exon/allDataTest.json';

@Component({
  selector: 'app-alignment',
  templateUrl: './alignment.component.html',
  styleUrls: ['./alignment.component.css']
})




export class AlignmentComponent implements OnInit {
  @Output() eventClicked = new EventEmitter<Event>();
  uniprotId;
  uniprotMSA;

  input;
  rows;

  data: any = data;
  uniprotList = [];
  searchTerm: string;
  MSAsearchTerm: string;
  MSAlist = ['O75473', 'Q91VI7', 'HH5GT', '66FGS', '443SFR', '6R5EDS', '3E3RD', '5E5D'];

  ngOnInit(): void {
    const url1 = 'http://repeatsdb.bio.unipd.it/ws/search?';
    const url2 = 'query=average_unit:1TO9999999999&collection=uniprot_protein&show=uniprotid';
    for (const unp of Object.keys(this.data)) {
      this.MSAlist.push(unp);
    }

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


  }

  clickedUnp(unp) {
    let rows;
    // let colors;
    rows = this.generateInp(unp);
    document.getElementsByClassName('msaUniprot_pre')[0].className = 'msaUniprot';
    document.getElementsByClassName('button_pre')[0].className = '';
    document.getElementsByClassName('titleMsa')[0].innerHTML = '<h3 style="color: #6d5188;">Multiple Sequence Alignment</h3>';
    this.input = {
      rows,
      colors: this.data[unp].colors,
      parameters: {
        fontSize: '12px',
        chunkSize: '5',
        spaceSize: '0',
        log: 'none'
      }
    };
  }

  generateInp(unp) {

    this.uniprotMSA = unp;
    const rows = {};
    // tslint:disable-next-line:forin
    for (const i in Object.keys(this.data[unp].rows)) {
      const el = {data: this.data[unp].rows[i].data};
      rows[i] = el;
    }

    return rows;
  }

}
