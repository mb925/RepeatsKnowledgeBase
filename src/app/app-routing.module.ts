import { NgModule } from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {AlignmentComponent} from './alignment/alignment.component';
import {ReuproComponent} from './reupro/reupro.component';

const routes: Routes = [

  { path: 'reupro/:id', component: ReuproComponent },
  { path: '', component: AlignmentComponent }
];

@NgModule({
  imports: [RouterModule,   RouterModule.forRoot(
    routes
  )],
  exports: [RouterModule]
})

export class AppRoutingModule {}
export const routingComponents = [ReuproComponent];
