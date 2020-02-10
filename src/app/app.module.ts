import { BrowserModule } from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent} from './app.component';
import { ReuproComponent } from './reupro/reupro.component';
import { AlignmentComponent } from './alignment/alignment.component';
import {StrucViewComponent} from './structureViewer/struc-view.component';
import {SqvLibModule} from 'sqv-lib';
import {AppRoutingModule, routingComponents} from './app-routing.module';
import {NavComponent} from './nav/nav.component';
import {UnpFilterPipe} from './pipe/unp-filter.pipe';
import {DownloadComponent} from './download/download.component';



@NgModule({
  declarations: [
    AlignmentComponent,
    ReuproComponent,
    StrucViewComponent,
    AppComponent,
    routingComponents,
    NavComponent,
    UnpFilterPipe,
    DownloadComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    SqvLibModule,
    HttpClientModule,
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})

export class AppModule { }
