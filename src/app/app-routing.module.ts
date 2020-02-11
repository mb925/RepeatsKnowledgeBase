import { NgModule } from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {AlignmentComponent} from './alignment/alignment.component';
import {RepKBComponent} from './repKB/repKB.component';
import {DownloadComponent} from './download/download.component';

const routes: Routes = [

  { path: 'repKB/:id', component: RepKBComponent },
  { path: 'download', component: DownloadComponent},
  { path: '', component: AlignmentComponent }
];

@NgModule({
  imports: [RouterModule,   RouterModule.forRoot(
    routes
  )],
  exports: [RouterModule]
})

export class AppRoutingModule {}
export const routingComponents = [RepKBComponent];
